/**
 * useWalletPortfolio — READ-ONLY portfolio discovery for the connected wallet.
 *
 * Reads the connected publicKey's native SOL balance and SPL token accounts via
 * RPC and normalizes them into WalletPosition[]. Recognized LST mints (JupSOL,
 * mSOL, bSOL, JitoSOL) are classified as staked/yield assets from the approved
 * mint registry; unknown mints fall back to a generic token.
 *
 * ROBUSTNESS: the three reads (native SOL, SPL tokens, Token-2022 tokens) run
 * INDEPENDENTLY via Promise.allSettled, so one failure never hides the others.
 * A failing token read on the rate-limited public RPC no longer collapses a
 * successful SOL read into a generic error — instead we show what we have and a
 * partial-read warning. Only a total failure (all three reads fail) shows the
 * hard error state.
 *
 * STRICTLY READ-ONLY (rules/wallet-and-custody-rules.md): only `getBalance` and
 * `getParsedTokenAccountsByOwner` are called with the connected publicKey. It NEVER
 * calls signMessage / signTransaction / signAllTransactions / sendTransaction, and
 * requests no permissions beyond the existing connection — so Ledger-backed Phantom
 * keeps working with no on-device approval. No USD/APY is invented (valueUsd/apy
 * stay null). Fetches only when connected; a disconnect clears state and cancels
 * any in-flight read; duplicate/stale fetches are guarded. No polling — manual
 * refresh only.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { PublicKey, type Connection } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  lookupMint,
  shortMint,
  type WalletPosition,
} from "./walletPosition";
import { fetchNativeStakePositions, fetchKaminoPositions } from "./protocolPositions";
import {
  buildKlendDirectUsdcExistingPosition,
  mergeKlendDirectPosition,
  type KlendDirectReserveSnapshot,
} from "../suggestions/klendDirectUsdcExistingPosition";
import { POSITION_IDENTITY as KLEND_DIRECT_IDENTITY, EXPECTED_TOKEN_PROGRAM_ID as KLEND_CLASSIC_TOKEN_PROGRAM, type WalletTokenAccountInput } from "../suggestions/klendDirectLendingPosition";
import {
  JUPITER_LEND_IDENTITY,
  JUPITER_LEND_TOKEN_PROGRAM,
  discoverJlUsdcAccounts,
  buildJupiterLendExistingPosition,
  mergeJupiterLendPosition,
  type JupiterLendTokenAccountInput,
} from "./jupiterLendExistingPosition";
import { resolveJupiterLendExchangeRate } from "./jupiterLendShareAccounting";
import { applyToken2022Assessment, type Token2022PositionResult } from "./token2022PositionAssessment";
import { isSupportedLstMint, normalizeLstBacking, applyLstNormalization, type LstPoolFacts } from "./lstUnderlyingNormalization";
import type { VrtInfo } from "./jitoRestaking";
import type { SanctumLstInfo } from "./sanctumLsts";
import {
  LIVE_WALLET_WARNING_TOKENS,
  LIVE_WALLET_WARNING_TOKEN2022,
  LIVE_WALLET_ERROR_ALL,
} from "../state/approvedCopy";

export type PortfolioStatus = "idle" | "loading" | "ready" | "error";

interface PortfolioState {
  status: PortfolioStatus;
  positions: WalletPosition[];
  /** Hard-error message (only when every read failed). */
  error?: string;
  /** Partial-read warning (some reads failed but usable data remains). */
  warning?: string;
  /** When sourced prices were applied (ms epoch), for an "as of" label. */
  pricedAsOf?: number;
  /** True while a read is in flight (from start until phase-3 completes/errors). */
  loading?: boolean;
}

/** Loosely-typed parsed token account — validated defensively before use. */
interface ParsedTokenAccount {
  pubkey?: { toBase58?: () => string } | string;
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: {
            amount?: string;
            decimals?: number;
            uiAmount?: number | null;
            uiAmountString?: string;
          };
        };
      };
    };
  };
}

/** Which of the three independent reads a partial failure came from (dev logging). */
type ReadName =
  | "native_sol"
  | "spl_token"
  | "token_2022"
  | "native_stake"
  | "kamino"
  | "kamino_vault"
  | "klend_direct_reserve"
  | "klend_reserve_slot"
  | "jito_vault"
  | "sanctum_lst"
  | "lst_apy"
  | "orca_positions"
  | "raydium_positions"
  | "raydium_amm"
  | "meteora_dlmm"
  | "meteora_damm"
  | "hubble"
  | "token_2022_assess"
  | "lst_pool"
  | "token_prices";

/**
 * Kamino Earn Vault positions (incl. farm-staked shares) via the heavy Kamino SDK,
 * loaded DYNAMICALLY so it is code-split out of the main bundle and isolated.
 */
async function fetchKaminoVaults(rpcUrl: string, ownerB58: string): Promise<WalletPosition[]> {
  const mod = await import("./kaminoVaults");
  return mod.fetchKaminoVaultPositions(rpcUrl, ownerB58);
}

/**
 * Step 17A — read the EXACT approved Kamino Direct reserve (D6q6…) via the Kamino SDK for the fields
 * the existing-position redemption + withdrawal-accessibility math require. Dynamically imported and
 * FULLY GUARDED: any decode/identity/read failure returns null so the mount is a strict no-op (the
 * portfolio is unchanged). Never used as a fallback for anything else; never values by API or price.
 */
async function fetchKlendDirectReserveSnapshot(rpcUrl: string, currentSlot: number): Promise<KlendDirectReserveSnapshot | null> {
  // Each accessor is wrapped: an unsupported/throwing/absent value returns null (UNRESOLVED), never 0.
  const s = (fn: () => unknown): string | null => { try { const v = fn(); return v == null ? null : String(v); } catch { return null; } };
  const n = (fn: () => unknown): number | null => { try { const v = fn(); return v == null ? null : Number(v); } catch { return null; } };
  try {
    const [klend, kit] = await Promise.all([import("@kamino-finance/klend-sdk"), import("@solana/kit")]);
    const rpc = (kit as any).createSolanaRpc(rpcUrl);
    // Installed SDK 9.1.2: KaminoReserve.initializeFromAddress (NOT Reserve.load). Guarded.
    const reserve: any = await (klend as any).KaminoReserve?.initializeFromAddress?.(
      (kit as any).address(KLEND_DIRECT_IDENTITY.reserveAddress),
      rpc,
      450 /* recentSlotDurationMs — affects estimates only; getTotalSupplySf is the exact SF value */
    );
    if (!reserve) return null;
    // Exact identity via the SDK accessors, or nothing.
    if (s(() => reserve.getLiquidityMint()) !== KLEND_DIRECT_IDENTITY.liquidityMint || s(() => reserve.getCTokenMint()) !== KLEND_DIRECT_IDENTITY.cTokenMint) return null;
    return {
      estimatedTotalSupplySf: s(() => reserve.getTotalSupplySf().toString()),                        // BN, 2^60 SF
      collateralMintTotalSupplyRaw: s(() => reserve.state.collateral.mintTotalSupply.toString()),     // BN base units
      totalAvailableLiquidityRaw: s(() => reserve.getLiquidityAvailableAmount().floor().toString()),  // Decimal lamports
      queuedLiquidityRaw: s(() => reserve.getQueuedLiquidityAmountAtCurrentRate().floor().toString()), // null = UNRESOLVED, never 0
      reserveStatus: n(() => reserve.state.config.status) ?? 0,
      reserveVersion: n(() => reserve.state.version) ?? 1,
      reserveEmergencyMode: n(() => reserve.state.config.emergencyMode) ?? 0,
      marketEmergencyMode: 0,
      reserveSourceSlot: currentSlot,
      marketSourceSlot: currentSlot,
      cTokenMintSourceSlot: currentSlot,
    };
  } catch {
    return null;
  }
}

/** LST APY (stake-pool math) via a dynamically-imported module (off main bundle). */
async function fetchLstApys(
  connection: Connection,
  mints: string[]
): Promise<Map<string, number>> {
  const mod = await import("./lstApy");
  return mod.fetchLstApys(connection, mints);
}

/** Jito Restaking VRT → underlying map (for identifying held VRTs), lazy-loaded. */
async function loadJitoVrtMap(connection: Connection): Promise<Map<string, VrtInfo>> {
  const mod = await import("./jitoRestaking");
  return mod.fetchJitoVrtMap(connection);
}

/** Sanctum LST registry (mint → symbol/name) for recognizing any Sanctum LST. */
async function loadSanctumLstMap(): Promise<Map<string, SanctumLstInfo>> {
  const mod = await import("./sanctumLsts");
  return mod.fetchSanctumLstMap();
}

/** Orca Whirlpool LP positions from the wallet's candidate NFT mints (WASM math). */
async function loadOrcaPositions(
  connection: Connection,
  candidateNftMints: string[]
): Promise<WalletPosition[]> {
  const mod = await import("./orcaWhirlpools");
  return mod.fetchOrcaPositions(connection, candidateNftMints);
}

/** Raydium CLMM LP positions from the wallet's candidate NFT mints (WASM math). */
async function loadRaydiumPositions(
  connection: Connection,
  candidateNftMints: string[]
): Promise<WalletPosition[]> {
  const mod = await import("./raydiumClmm");
  return mod.fetchRaydiumPositions(connection, candidateNftMints);
}

/** Raydium classic AMM / CPMM positions from held (fungible) LP tokens — API only. */
async function loadRaydiumAmm(
  candidates: Array<{ mint: string; uiAmount: number }>
): Promise<WalletPosition[]> {
  const mod = await import("./raydiumAmm");
  return mod.fetchRaydiumAmmPositions(candidates);
}

/** Meteora DLMM LP positions (owner-based; SDK computes bin amounts), lazy-loaded. */
async function loadMeteoraDlmm(
  connection: Connection,
  ownerB58: string
): Promise<WalletPosition[]> {
  const mod = await import("./meteoraDlmm");
  return mod.fetchMeteoraDlmmPositions(connection, ownerB58);
}

/** Meteora DAMM positions from held (fungible) LP tokens — on-chain pool + SDK. */
async function loadMeteoraDamm(
  connection: Connection,
  candidates: Array<{ mint: string; rawAmount: string }>
): Promise<WalletPosition[]> {
  const mod = await import("./meteoraDamm");
  return mod.fetchMeteoraDammPositions(connection, candidates);
}

/** Hubble USDH borrowing positions (owner-based; SDK reads adjusted debt), lazy. */
async function loadHubbleLoans(
  connection: Connection,
  ownerB58: string
): Promise<WalletPosition[]> {
  const mod = await import("./hubble");
  return mod.fetchHubbleLoans(connection, ownerB58);
}

/** Step 17G — supported-LST SPL stake-pool facts (per mint), via a code-split dynamic import. */
async function loadLstPoolFacts(
  connection: Connection,
  mints: string[]
): Promise<Map<string, LstPoolFacts>> {
  const mod = await import("./lstEnrichment");
  return mod.fetchLstPoolFacts(connection, mints);
}

/** Step 17E — Token-2022 transferability assessments (per mint), via a code-split dynamic import. */
async function loadToken2022Assessments(
  connection: Connection,
  accounts: Array<{ address: string; mint: string }>
): Promise<Map<string, Token2022PositionResult>> {
  const mod = await import("./token2022Enrichment");
  return mod.fetchToken2022Assessments(connection, accounts);
}

/** Canonical wrapped-SOL mint — prices native SOL and native stake. */
const SOL_MINT = "So11111111111111111111111111111111111111112";

/** Sourced USD prices + 24h change (DefiLlama / Jupiter) for detected mints, lazy. */
async function loadTokenPrices(
  mints: string[]
): Promise<Map<string, { priceUsd: number; change24hPct?: number }>> {
  const mod = await import("./tokenPrices");
  return mod.fetchTokenPrices(mints);
}

/**
 * The mint to price a position by (scope A): native SOL + native stake price via
 * the SOL mint; plain tokens + LSTs price by their own mint. Protocol/LP composite
 * positions are not priced here (that's scope B). Returns undefined = don't price.
 */
function priceMintFor(p: WalletPosition): string | undefined {
  if (p.type === "native" || p.type === "stake") return SOL_MINT;
  if (p.type === "token" || p.type === "lst") return p.mint;
  return undefined;
}

/**
 * Apply sourced prices to one position. Scope A: a single-mint asset →
 * priceUsd × uiAmount. Scope B: a composite position with `legs` → sum of legs
 * (debt legs subtract). If ANY required price is missing, valueUsd stays null so
 * the row shows "—" (never a partial or invented value).
 */
function applyPrice(
  p: WalletPosition,
  prices: Map<string, { priceUsd: number; change24hPct?: number }>
): WalletPosition {
  const mint = priceMintFor(p);
  if (mint) {
    const pi = prices.get(mint);
    if (pi && typeof p.uiAmount === "number") {
      return {
        ...p,
        priceUsd: pi.priceUsd,
        valueUsd: pi.priceUsd * p.uiAmount,
        // 24h change rides along only when the feed sourced one (else "—").
        change24hPct: pi.change24hPct ?? null,
      };
    }
    return p;
  }
  if (p.legs && p.legs.length > 0) {
    let total = 0;
    for (const leg of p.legs) {
      const pi = prices.get(leg.mint);
      if (!pi) return p; // any unpriced leg → leave valueUsd null ("—")
      total += (leg.side === "debt" ? -1 : 1) * pi.priceUsd * leg.uiAmount;
    }
    return { ...p, valueUsd: total };
  }
  return p;
}

/** Build a normalized position from one parsed token account, or null to skip. */
function toTokenPosition(
  acc: ParsedTokenAccount,
  sanctumMap?: Map<string, SanctumLstInfo>
): WalletPosition | null {
  // Defensive parsing: every step may be missing on malformed / non-parsed data.
  const info = acc?.account?.data?.parsed?.info;
  if (!info || typeof info.mint !== "string") return null;
  const amt = info.tokenAmount;
  if (!amt || typeof amt.amount !== "string") return null;

  // Skip empty token accounts (no balance). uiAmount may legitimately be null.
  if (amt.amount === "0" || amt.uiAmount === 0) return null;

  const mint = info.mint;
  const uiAmount = typeof amt.uiAmount === "number" ? amt.uiAmount : undefined;
  const decimals = typeof amt.decimals === "number" ? amt.decimals : undefined;
  const known = lookupMint(mint);

  if (known) {
    return {
      id: `mint-${mint}`,
      source: known.source,
      type: known.type,
      symbol: known.symbol,
      name: known.name,
      mint,
      icon: known.icon,
      protocol: known.protocol,
      amount: amt.amount,
      uiAmount,
      decimals,
      detection: known.type === "lst" ? "recognized_lst_mint" : "direct_wallet_balance",
      valueUsd: null,
      apy: null,
    };
  }

  // Recognized Sanctum LST (any of the ~245 in Sanctum's list) — classified as an
  // LST so it shows its real symbol/name and picks up stake-pool APY in phase 3.
  const sanctum = sanctumMap?.get(mint);
  if (sanctum) {
    return {
      id: `mint-${mint}`,
      source: "sanctum",
      type: "lst",
      symbol: sanctum.symbol,
      name: sanctum.name,
      mint,
      protocol: "Sanctum",
      amount: amt.amount,
      uiAmount,
      decimals,
      detection: "recognized_lst_mint",
      valueUsd: null,
      apy: null,
    };
  }

  // Unknown token — display safely, never inferred as an LST/protocol asset.
  return {
    id: `mint-${mint}`,
    source: "wallet",
    type: "token",
    symbol: shortMint(mint),
    name: "Unknown token",
    mint,
    amount: amt.amount,
    uiAmount,
    decimals,
    detection: "direct_wallet_balance",
    valueUsd: null,
    apy: null,
  };
}

/** A held Jito VRT → a "Restaked on Jito" position denominated in the underlying. */
function toJitoRestakingPosition(acc: ParsedTokenAccount, vrt: VrtInfo): WalletPosition | null {
  const info = acc?.account?.data?.parsed?.info;
  if (!info || typeof info.mint !== "string") return null;
  const amt = info.tokenAmount;
  if (!amt || typeof amt.amount !== "string" || amt.amount === "0" || amt.uiAmount === 0) {
    return null;
  }
  const vrtUi = typeof amt.uiAmount === "number" ? amt.uiAmount : undefined;
  // VRT → underlying supported token (e.g. JitoSOL) via the vault exchange rate.
  const underlying = vrtUi != null ? vrtUi * vrt.rate : undefined;
  const known = lookupMint(vrt.supportedMint);
  return {
    id: `jito-vault-${info.mint}`,
    source: "jito",
    type: "protocol",
    symbol: known?.symbol ?? shortMint(vrt.supportedMint),
    name: "Restaked on Jito",
    mint: info.mint,
    icon: known?.icon,
    protocol: "Jito Restaking",
    amount: underlying != null ? String(underlying) : amt.amount,
    uiAmount: underlying,
    decimals: typeof amt.decimals === "number" ? amt.decimals : undefined,
    side: "supplied",
    detection: "protocol_api",
    valueUsd: null,
    apy: null, // restaking-reward APY has no clean read source yet → "—"
  };
}

/** Assemble positions from whatever reads succeeded (native may be null). */
function buildPositions(
  lamports: number | null,
  tokenAccounts: ParsedTokenAccount[],
  extra: WalletPosition[] = [],
  vrtMap?: Map<string, VrtInfo>,
  sanctumMap?: Map<string, SanctumLstInfo>
): WalletPosition[] {
  const positions: WalletPosition[] = [];

  if (lamports != null) {
    positions.push({
      id: "native-sol",
      source: "wallet",
      type: "native",
      symbol: "SOL",
      name: "Solana",
      icon: "assets/icons/token/sol.svg",
      amount: String(lamports),
      uiAmount: lamports / 1e9,
      decimals: 9,
      detection: "direct_wallet_balance",
      valueUsd: null,
      apy: null,
    });
  }

  // De-dupe by id so a repeated mint (or overlapping program results) never
  // produces duplicate rows.
  const seen = new Set<string>(positions.map((p) => p.id));
  for (const acc of tokenAccounts) {
    // A held Jito VRT becomes a "Restaked on Jito" position; otherwise a token
    // (recognized as a Sanctum LST when applicable, else known/unknown).
    const mint = acc?.account?.data?.parsed?.info?.mint;
    const vrt = mint && vrtMap ? vrtMap.get(mint) : undefined;
    const pos = vrt ? toJitoRestakingPosition(acc, vrt) : toTokenPosition(acc, sanctumMap);
    if (pos && !seen.has(pos.id)) {
      seen.add(pos.id);
      positions.push(pos);
    }
  }
  // Protocol positions (native stake, Kamino) are already normalized.
  for (const pos of extra) {
    if (!seen.has(pos.id)) {
      seen.add(pos.id);
      positions.push(pos);
    }
  }

  return sortPositions(positions);
}

/** Sort: native, LSTs, native stake, known tokens, protocol (Kamino/Jito/Orca), unknown. */
function sortPositions(positions: WalletPosition[]): WalletPosition[] {
  const rank = (p: WalletPosition) => {
    if (p.type === "native") return 0;
    if (p.type === "lst") return 1;
    if (p.type === "stake") return 2;
    if (p.type === "protocol") return 4;
    return p.name === "Unknown token" ? 5 : 3;
  };
  return [...positions].sort((a, b) => rank(a) - rank(b));
}

/** Extract the token-account array from a getParsedTokenAccountsByOwner result. */
function accountsOf(value: unknown): ParsedTokenAccount[] {
  const arr = (value as { value?: unknown } | undefined)?.value;
  return Array.isArray(arr) ? (arr as ParsedTokenAccount[]) : [];
}

/**
 * Per-read timeouts. web3.js has no default request timeout, so a public RPC that
 * accepts the connection but never responds would leave a read pending forever —
 * hanging the UI on "Reading your wallet…". These reject a slow read so every read
 * always settles. Native SOL gets a slightly longer budget than the token reads,
 * which are the ones that tend to be slow or unsupported on public RPCs.
 */
const NATIVE_TIMEOUT_MS = 10_000;
const TOKEN_TIMEOUT_MS = 8_000;
/** Protocol reads (native stake, Kamino REST + reserve reads) can be a bit slower. */
const PROTOCOL_TIMEOUT_MS = 12_000;

/** Compact "Name: message" for logging without exposing a raw stack trace. */
function errText(e: unknown): string {
  const err = e as Error | undefined;
  return `${err?.name ?? "Error"}: ${err?.message ?? String(e)}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: ReadName): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} read timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export interface WalletPortfolio extends PortfolioState {
  refresh: () => void;
}

export function useWalletPortfolio(): WalletPortfolio {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [state, setState] = useState<PortfolioState>({ status: "idle", positions: [] });
  const [refreshKey, setRefreshKey] = useState(0);
  const reqId = useRef(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    // Do not fetch on disconnected state — clear any previous live assets.
    if (!connected || !publicKey) {
      reqId.current++; // invalidate any in-flight read
      setState({ status: "idle", positions: [] });
      return;
    }

    const myReq = ++reqId.current;
    let cancelled = false;
    const owner = new PublicKey(publicKey.toBase58());
    // Retry clears the previous hard error, keeps prior positions visible.
    setState((s) => ({ status: "loading", positions: s.positions, loading: true }));

    (async () => {
      // PHASE 1 — native SOL first. It resolves quickly, so render it immediately
      // instead of waiting on the (often slow / unsupported) token reads. This is
      // why the balance now appears fast rather than after a long delay.
      let lamports: number | null = null;
      let nativeOk = false;
      let nativeErr: string | undefined;
      try {
        lamports = await withTimeout(connection.getBalance(owner), NATIVE_TIMEOUT_MS, "native_sol");
        nativeOk = true;
      } catch (e) {
        nativeErr = errText(e);
      }
      if (cancelled || myReq !== reqId.current) return;
      if (nativeOk) {
        // Show SOL right away while token reads continue in the background.
        setState({ status: "ready", positions: buildPositions(lamports, []), loading: true });
      }

      // PHASE 2 — token reads + protocol reads (native stake, Kamino). All are
      // independent + time-boxed, so one slow/failed read never blocks the others
      // or the already-rendered SOL. Protocol positions are best-effort: if they
      // fail they simply don't appear (logged in DEV), no user-facing error.
      const [splRes, tok22Res, stakeRes, kaminoRes, kaminoVaultRes, jitoRes, sanctumRes] =
        await Promise.allSettled([
          withTimeout(
            connection.getParsedTokenAccountsByOwner(owner, {
              programId: new PublicKey(TOKEN_PROGRAM_ID),
            }),
            TOKEN_TIMEOUT_MS,
            "spl_token"
          ),
          withTimeout(
            connection.getParsedTokenAccountsByOwner(owner, {
              programId: new PublicKey(TOKEN_2022_PROGRAM_ID),
            }),
            TOKEN_TIMEOUT_MS,
            "token_2022"
          ),
          withTimeout(fetchNativeStakePositions(connection, owner), PROTOCOL_TIMEOUT_MS, "native_stake"),
          withTimeout(fetchKaminoPositions(connection, owner), PROTOCOL_TIMEOUT_MS, "kamino"),
          withTimeout(
            fetchKaminoVaults(connection.rpcEndpoint, owner.toBase58()),
            PROTOCOL_TIMEOUT_MS,
            "kamino_vault"
          ),
          withTimeout(loadJitoVrtMap(connection), PROTOCOL_TIMEOUT_MS, "jito_vault"),
          withTimeout(loadSanctumLstMap(), PROTOCOL_TIMEOUT_MS, "sanctum_lst"),
        ]);
      if (cancelled || myReq !== reqId.current) return;

      const splOk = splRes.status === "fulfilled";
      const tok22Ok = tok22Res.status === "fulfilled";
      const tokenAccounts: ParsedTokenAccount[] = [
        ...(splOk ? accountsOf(splRes.value) : []),
        ...(tok22Ok ? accountsOf(tok22Res.value) : []),
      ];
      const protocolPositions: WalletPosition[] = [
        ...(stakeRes.status === "fulfilled" ? stakeRes.value : []),
        ...(kaminoRes.status === "fulfilled" ? kaminoRes.value : []),
        ...(kaminoVaultRes.status === "fulfilled" ? kaminoVaultRes.value : []),
      ];
      // Held Jito VRTs + Sanctum LSTs are classified via these maps in buildPositions.
      const vrtMap = jitoRes.status === "fulfilled" ? jitoRes.value : undefined;
      const sanctumMap = sanctumRes.status === "fulfilled" ? sanctumRes.value : undefined;
      const positions = buildPositions(
        lamports,
        tokenAccounts,
        protocolPositions,
        vrtMap,
        sanctumMap
      );

      // Structured dev-only diagnostics (never shown to the user).
      if (import.meta.env.DEV) {
        const reason = (r: PromiseSettledResult<unknown>): string | undefined =>
          r.status === "rejected" ? errText(r.reason) : undefined;
        const failed: ReadName[] = [
          ...(!nativeOk ? (["native_sol"] as const) : []),
          ...(!splOk ? (["spl_token"] as const) : []),
          ...(!tok22Ok ? (["token_2022"] as const) : []),
          ...(stakeRes.status !== "fulfilled" ? (["native_stake"] as const) : []),
          ...(kaminoRes.status !== "fulfilled" ? (["kamino"] as const) : []),
          ...(kaminoVaultRes.status !== "fulfilled" ? (["kamino_vault"] as const) : []),
          ...(jitoRes.status !== "fulfilled" ? (["jito_vault"] as const) : []),
          ...(sanctumRes.status !== "fulfilled" ? (["sanctum_lst"] as const) : []),
        ];
        // eslint-disable-next-line no-console
        console.info("[wallet-read]", {
          publicKey: owner.toBase58(),
          endpoint: connection.rpcEndpoint,
          reads: {
            native_sol: nativeOk ? "ok" : "failed",
            spl_token: splOk ? "ok" : "failed",
            token_2022: tok22Ok ? "ok" : "failed",
            native_stake: stakeRes.status === "fulfilled" ? "ok" : "failed",
            kamino: kaminoRes.status === "fulfilled" ? "ok" : "failed",
            kamino_vault: kaminoVaultRes.status === "fulfilled" ? "ok" : "failed",
            jito_vault: jitoRes.status === "fulfilled" ? "ok" : "failed",
            sanctum_lst: sanctumRes.status === "fulfilled" ? "ok" : "failed",
          },
          failed,
          errors: {
            native_sol: nativeErr,
            spl_token: reason(splRes),
            token_2022: reason(tok22Res),
            native_stake: reason(stakeRes),
            kamino: reason(kaminoRes),
            kamino_vault: reason(kaminoVaultRes),
            jito_vault: reason(jitoRes),
            sanctum_lst: reason(sanctumRes),
          },
          positions: positions.length,
          partial: failed.length > 0 && (nativeOk || splOk || tok22Ok),
        });
      }

      // Every read failed → hard error. Otherwise show what we have + a warning
      // that matches which reads failed.
      if (!nativeOk && !splOk && !tok22Ok) {
        setState({ status: "error", positions: [], error: LIVE_WALLET_ERROR_ALL, loading: false });
        return;
      }

      let warning: string | undefined;
      if (!nativeOk || !splOk) {
        // A core read (SOL or the main SPL program) failed — generic token warning.
        warning = LIVE_WALLET_WARNING_TOKENS;
      } else if (!tok22Ok) {
        // SOL + SPL fine, only the Token-2022 program read failed.
        warning = LIVE_WALLET_WARNING_TOKEN2022;
      }

      setState({ status: "ready", positions, warning, loading: true });

      // PHASE 3 — two best-effort enrichments in parallel, then one merged update:
      //   (a) APY for yield-bearing rows (LSTs + Ondo USDY).
      //   (b) Orca Whirlpool LP positions, derived from held NFT mints.
      // Neither blocks the already-rendered rows; failures are silent.
      const needsApy = (p: WalletPosition) => p.type === "lst" || p.source === "ondo";
      const apyMints = positions
        .filter((p) => needsApy(p) && typeof p.mint === "string")
        .map((p) => p.mint as string);
      // NFT candidates for CLMM (Orca/Raydium): 0-decimal, non-zero token balances.
      const nftMints = tokenAccounts
        .map((a) => a?.account?.data?.parsed?.info)
        .filter((info) => info?.tokenAmount?.decimals === 0 && info?.tokenAmount?.amount !== "0")
        .map((info) => info!.mint as string)
        .filter((m): m is string => typeof m === "string");
      // Fungible LP-token candidates for Raydium AMM/CPMM: the unrecognized
      // (unknown) fungible tokens the wallet holds, with their balances.
      const lpCandidates = positions
        .filter((p) => p.name === "Unknown token" && typeof p.mint === "string" && typeof p.uiAmount === "number")
        .map((p) => ({ mint: p.mint as string, uiAmount: p.uiAmount as number, rawAmount: p.amount }));
      const [apyRes, orcaRes, raydiumRes, raydiumAmmRes, meteoraRes, meteoraDammRes, hubbleRes] =
        await Promise.allSettled([
        apyMints.length > 0
          ? withTimeout(fetchLstApys(connection, apyMints), PROTOCOL_TIMEOUT_MS, "lst_apy")
          : Promise.resolve(new Map<string, number>()),
        nftMints.length > 0
          ? withTimeout(loadOrcaPositions(connection, nftMints), PROTOCOL_TIMEOUT_MS, "orca_positions")
          : Promise.resolve([] as WalletPosition[]),
        nftMints.length > 0
          ? withTimeout(loadRaydiumPositions(connection, nftMints), PROTOCOL_TIMEOUT_MS, "raydium_positions")
          : Promise.resolve([] as WalletPosition[]),
        lpCandidates.length > 0
          ? withTimeout(loadRaydiumAmm(lpCandidates), PROTOCOL_TIMEOUT_MS, "raydium_amm")
          : Promise.resolve([] as WalletPosition[]),
        // Meteora DLMM positions are owned by the wallet (not held tokens), so this
        // always runs when connected.
        withTimeout(loadMeteoraDlmm(connection, owner.toBase58()), PROTOCOL_TIMEOUT_MS, "meteora_dlmm"),
        lpCandidates.length > 0
          ? withTimeout(loadMeteoraDamm(connection, lpCandidates), PROTOCOL_TIMEOUT_MS, "meteora_damm")
          : Promise.resolve([] as WalletPosition[]),
        // Hubble USDH loans are owned by the wallet (not held tokens), so this
        // always runs when connected.
        withTimeout(loadHubbleLoans(connection, owner.toBase58()), PROTOCOL_TIMEOUT_MS, "hubble"),
      ]);
      if (cancelled || myReq !== reqId.current) return;

      const apys = apyRes.status === "fulfilled" ? apyRes.value : new Map<string, number>();
      // LP positions can REPLACE an "unknown token" row (the held LP mint resolved
      // to a pool); Hubble loans are standalone protocol rows that consume nothing.
      const lpPositions = [
        ...(orcaRes.status === "fulfilled" ? orcaRes.value : []),
        ...(raydiumRes.status === "fulfilled" ? raydiumRes.value : []),
        ...(raydiumAmmRes.status === "fulfilled" ? raydiumAmmRes.value : []),
        ...(meteoraRes.status === "fulfilled" ? meteoraRes.value : []),
        ...(meteoraDammRes.status === "fulfilled" ? meteoraDammRes.value : []),
      ];
      const hubblePositions = hubbleRes.status === "fulfilled" ? hubbleRes.value : [];
      const extraPositions = [...lpPositions, ...hubblePositions];
      // Build the merged set: APY on yield rows, resolve LP rows (replacing the
      // matching "unknown token" row), append Hubble loans.
      let merged = positions.map((p) =>
        needsApy(p) && p.mint && apys.has(p.mint) ? { ...p, apy: apys.get(p.mint) ?? null } : p
      );
      if (extraPositions.length > 0) {
        const consumed = new Set(lpPositions.map((p) => p.mint));
        merged = merged.filter(
          (p) => !(p.name === "Unknown token" && p.mint && consumed.has(p.mint))
        );
        merged = sortPositions([...merged, ...extraPositions]);
      }

      // PRICE (sourced USD, best-effort): scope A = single-mint assets; scope B =
      // composite protocol/LP positions valued from their legs. Fetched AFTER the
      // merge so LP/protocol leg mints are known. Never invented — unpriced → "—".
      const priceMints: string[] = [];
      for (const p of merged) {
        const m = priceMintFor(p);
        if (m) priceMints.push(m);
        for (const leg of p.legs ?? []) priceMints.push(leg.mint);
      }
      let pricedAsOf: number | undefined;
      if (priceMints.length > 0) {
        const prices = await withTimeout(
          loadTokenPrices(priceMints),
          PROTOCOL_TIMEOUT_MS,
          "token_prices"
        ).catch(() => new Map<string, { priceUsd: number; change24hPct?: number }>());
        if (cancelled || myReq !== reqId.current) return;
        if (prices.size > 0) {
          merged = merged.map((p) => applyPrice(p, prices));
          pricedAsOf = Date.now();
          // Step 17C — fill the Steakhouse existing-position USD from the fresh USDC price. applyPrice
          // already set valueUsd (recognized); here recognized/liquid USD are derived from the token
          // amounts × the fresh exact-mint price (never a $1 assumption). Stale price → USD stays null.
          merged = merged.map((p) =>
            p.candidateId === "kamino_steakhouse_usdc" && typeof p.priceUsd === "number"
              ? { ...p, recognizedValueUsd: p.valueUsd ?? null, liquidValueUsd: typeof p.liquidUnderlyingAmount === "number" ? p.priceUsd * p.liquidUnderlyingAmount : null }
              : p
          );
          // Step 17F — native stake: recognized USD = full account value; liquid USD = ONLY the
          // immediately-withdrawable SOL × the fresh SOL price. Stale price → USD stays null.
          merged = merged.map((p) =>
            p.type === "stake" && p.stake && typeof p.priceUsd === "number"
              ? { ...p, recognizedValueUsd: p.valueUsd ?? null, liquidValueUsd: typeof p.liquidUnderlyingAmount === "number" ? p.priceUsd * p.liquidUnderlyingAmount : null }
              : p
          );
        }
      }

      // Step 17A — Kamino Direct existing-position mount (additive + fail-closed). Detect exact-cToken
      // accounts from the already-read classic SPL token accounts; if present, read the exact reserve and
      // produce ONE normalized existing-position record (recognized + currently-liquid separate), then
      // dedupe the generic cToken row / API obligation row. ANY failure → strict no-op (portfolio
      // unchanged). Never symbol-matched; never valued by API/price fallback.
      try {
        const cTokenAccounts: WalletTokenAccountInput[] = (splOk ? accountsOf(splRes.value) : [])
          .map((a) => a?.account?.data?.parsed?.info)
          .filter((info) => info?.mint === KLEND_DIRECT_IDENTITY.cTokenMint && info?.tokenAmount?.amount !== "0")
          .map((info, idx) => ({
            address: `klend-ctoken-${idx}`,
            mint: info!.mint as string,
            tokenProgram: KLEND_CLASSIC_TOKEN_PROGRAM,
            amountRaw: String(info!.tokenAmount!.amount),
            decimals: Number(info!.tokenAmount!.decimals),
            owner: owner.toBase58(),
          }));
        if (cTokenAccounts.length > 0) {
          const nowIso = new Date().toISOString();
          const currentSlot = await withTimeout(connection.getSlot(), TOKEN_TIMEOUT_MS, "klend_reserve_slot").catch(() => 0);
          if (!cancelled && myReq === reqId.current) {
            const reserveSnap = await withTimeout(
              fetchKlendDirectReserveSnapshot(connection.rpcEndpoint, currentSlot),
              PROTOCOL_TIMEOUT_MS,
              "klend_direct_reserve"
            ).catch(() => null);
            if (!cancelled && myReq === reqId.current) {
              // Build ALWAYS when a confirmed cToken holding exists — reserveSnap may be null (enrichment
              // failed), which yields ONE canonical UNRESOLVED row (cToken balance visible, USD null).
              const usdcPrice = pricedAsOf != null ? merged.find((p) => p.mint === KLEND_DIRECT_IDENTITY.liquidityMint)?.priceUsd ?? null : null;
              const record = buildKlendDirectUsdcExistingPosition({
                accounts: cTokenAccounts,
                walletAddress: owner.toBase58(),
                walletSourceSlot: currentSlot,
                reserve: reserveSnap, // KlendDirectReserveSnapshot | null
                price: { usdcPriceUsd: usdcPrice, fresh: pricedAsOf != null && typeof usdcPrice === "number" },
                apy: { valuePct: null, fresh: false, rateKind: "estimated_variable_apy" },
                observedAt: nowIso,
                nowMs: Date.now(),
              });
              if (record.positionExists) merged = mergeKlendDirectPosition(merged, record);
            }
          }
        }
      } catch { /* strict no-op on any failure — portfolio unchanged */ }
      if (cancelled || myReq !== reqId.current) return;

      // Step 17D/17D.1 — Jupiter Lend USDC (jlUSDC) existing-position mount (additive + fail-closed). Detect
      // exact jlUSDC receipt-token accounts from the already-read classic SPL token accounts and, when a
      // confirmed holding exists, produce ONE canonical existing-position row.
      //
      // RECOGNIZED underlying is gated on the source-to-account applicability determination
      // (jupiterLendShareAccounting.ts): it is currently `unresolved` (no vendored IDL / no Rust source; the
      // governing liquidity binary postdates the only published IDL), so resolveJupiterLendExchangeRate()
      // returns null WITHOUT any RPC — recognized + USD stay null, exactly the Step 17D behavior. The wiring
      // is future-ready: a verified layout flips applicability and supplies a decoded pool observation here.
      // LIQUIDITY stays unresolved (no limiter-aware methodology). Ownership stays visible; the generic
      // "Unknown token" jlUSDC row is deduped. Jupiter is excluded_from_suggestions; this NEVER makes it
      // suggestion/selector/Top-Pick/optimization eligible. Never symbol-matched; any failure → strict no-op.
      try {
        const jlAccounts: JupiterLendTokenAccountInput[] = (splOk ? accountsOf(splRes.value) : [])
          .map((a) => a?.account?.data?.parsed?.info)
          .filter((info) => info?.mint === JUPITER_LEND_IDENTITY.receiptTokenMint && info?.tokenAmount?.amount !== "0")
          .map((info, idx) => ({
            address: `jlusdc-${idx}`,
            mint: info!.mint as string,
            tokenProgram: JUPITER_LEND_TOKEN_PROGRAM,
            amountRaw: String(info!.tokenAmount!.amount),
            decimals: Number(info!.tokenAmount!.decimals),
            owner: owner.toBase58(),
          }));
        const discovery = discoverJlUsdcAccounts(jlAccounts, owner.toBase58());
        if (BigInt(discovery.aggregateRaw) > 0n) {
          // Applicability-gated: null while share accounting is unresolved (no pool fetch performed).
          const exchangeRate = resolveJupiterLendExchangeRate();
          const usdcPrice = pricedAsOf != null ? merged.find((p) => p.mint === JUPITER_LEND_IDENTITY.underlyingUsdcMint)?.priceUsd ?? null : null;
          const record = buildJupiterLendExistingPosition({
            receiptBalanceRaw: discovery.aggregateRaw,
            exchangeRate,               // null (unresolved) → recognized stays null
            liquidity: null,            // unresolved (no verified withdrawal methodology)
            price: { usdcPriceUsd: usdcPrice, fresh: pricedAsOf != null && typeof usdcPrice === "number" },
            observedAt: new Date().toISOString(),
            sourceSlot: 0,
            walletFresh: true,
            sourceAccounts: discovery.accounts.map((a) => a.address),
          });
          if (record.positionExists) merged = mergeJupiterLendPosition(merged, record);
        }
      } catch { /* strict no-op on any failure — portfolio unchanged */ }
      if (cancelled || myReq !== reqId.current) return;

      // Step 17E — Token-2022 transferability hardening (additive + fail-closed). For each Token-2022
      // account (from the Token-2022 program read), decode its mint + account extensions once per mint and
      // classify the balance into nominal / recognized / transferable / unavailable / withheld / unresolved.
      // A nominal balance is NEVER assumed fully transferable: frozen/non-transferable/paused → 0; hook/
      // confidential/unsupported/stale → unresolved (null); transfer-fee → deterministic net. The verified
      // transferable portion drives liquidValueUsd + withdrawalState so the Safety Buffer counts only what
      // can actually move. Classic SPL positions are untouched. Any failure → strict no-op.
      try {
        const t22Accounts = (tok22Ok ? accountsOf(tok22Res.value) : [])
          .map((a) => ({
            address: typeof a?.pubkey === "string" ? a.pubkey : a?.pubkey?.toBase58?.() ?? "",
            mint: a?.account?.data?.parsed?.info?.mint ?? "",
            amount: a?.account?.data?.parsed?.info?.tokenAmount?.amount ?? "0",
          }))
          .filter((a) => a.address && a.mint && a.amount !== "0")
          .map((a) => ({ address: a.address, mint: a.mint }));
        if (t22Accounts.length > 0) {
          const assessments = await withTimeout(
            loadToken2022Assessments(connection, t22Accounts),
            PROTOCOL_TIMEOUT_MS,
            "token_2022_assess"
          ).catch(() => new Map<string, Token2022PositionResult>());
          if (!cancelled && myReq === reqId.current && assessments.size > 0) {
            merged = merged.map((p) => {
              const r = p.mint ? assessments.get(p.mint) : undefined;
              if (!r) return p;
              const decimalsKnown = typeof p.decimals === "number";
              return applyToken2022Assessment(p, r, p.decimals ?? 0, p.priceUsd ?? null, decimalsKnown && pricedAsOf != null && typeof p.priceUsd === "number");
            });
          }
        }
      } catch { /* strict no-op on any failure — portfolio unchanged */ }
      if (cancelled || myReq !== reqId.current) return;

      // Step 17G — supported-LST underlying-SOL normalization (additive + fail-closed). For JitoSOL/JupSOL/
      // bSOL, decode the SPL stake pool once per mint and compute the exact backing (floor(balance ×
      // totalLamports/poolTokenSupply)); mSOL has no installed decoder → fail-closed `unsupported`. Also
      // AGGREGATES multiple wallet token accounts of one LST mint (§10). MARKET value (valueUsd) stays
      // authoritative; underlying SOL is exposure-only, never a second net-worth value, never liquid SOL.
      // Any failure → strict no-op.
      try {
        const supportedLstMints = [...new Set(merged.filter((p) => p.type === "lst" && typeof p.mint === "string" && isSupportedLstMint(p.mint)).map((p) => p.mint as string))];
        if (supportedLstMints.length > 0) {
          // Exact integer aggregation across every classic SPL account of each supported LST mint.
          const aggByMint = new Map<string, bigint>();
          for (const a of (splOk ? accountsOf(splRes.value) : [])) {
            const info = a?.account?.data?.parsed?.info;
            const m = info?.mint; const amt = info?.tokenAmount?.amount;
            if (typeof m === "string" && supportedLstMints.includes(m) && typeof amt === "string" && /^[0-9]+$/.test(amt)) {
              aggByMint.set(m, (aggByMint.get(m) ?? 0n) + BigInt(amt));
            }
          }
          const poolFacts = await withTimeout(loadLstPoolFacts(connection, supportedLstMints), PROTOCOL_TIMEOUT_MS, "lst_pool").catch(() => new Map<string, LstPoolFacts>());
          if (!cancelled && myReq === reqId.current) {
            const solPrice = merged.find((p) => p.type === "native")?.priceUsd ?? null;
            const solFresh = pricedAsOf != null && typeof solPrice === "number";
            const nowIso = new Date().toISOString();
            merged = merged.map((p) => {
              if (p.type !== "lst" || typeof p.mint !== "string" || !isSupportedLstMint(p.mint)) return p;
              const aggRaw = aggByMint.get(p.mint);
              const rawBalance = (aggRaw ?? (typeof p.amount === "string" && /^[0-9]+$/.test(p.amount) ? BigInt(p.amount) : 0n)).toString();
              // Reflect the aggregated balance in the market position (multi-account holders).
              const dec = typeof p.decimals === "number" ? p.decimals : 9;
              const uiAgg = Number(BigInt(rawBalance)) / 10 ** dec;
              const marketP: WalletPosition = typeof p.priceUsd === "number"
                ? { ...p, amount: rawBalance, uiAmount: uiAgg, valueUsd: p.priceUsd * uiAgg }
                : { ...p, amount: rawBalance, uiAmount: uiAgg };
              const r = normalizeLstBacking({
                mint: p.mint, rawTokenBalance: rawBalance, tokenProgram: TOKEN_PROGRAM_ID,
                pool: poolFacts.get(p.mint) ?? null, observedAt: nowIso, walletSourceSlot: 0,
              });
              return applyLstNormalization(marketP, r, solPrice, solFresh);
            });
          }
        }
      } catch { /* strict no-op on any failure — portfolio unchanged */ }
      if (cancelled || myReq !== reqId.current) return;

      // Final update of the read: apply any APY/LP/price changes and clear the
      // loading flag (always runs, even if nothing changed, so skeletons resolve).
      setState({ status: "ready", positions: merged, warning, pricedAsOf, loading: false });
    })().catch(() => {
      // Defensive: never leave a stuck loading state.
      if (cancelled || myReq !== reqId.current) return;
      setState({ status: "error", positions: [], error: LIVE_WALLET_ERROR_ALL, loading: false });
    });

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, connected, refreshKey]);

  return { ...state, refresh };
}
