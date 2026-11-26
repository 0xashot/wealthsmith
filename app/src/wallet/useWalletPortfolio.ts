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
 * any in-flight read; duplicate/stale fetches are guarded. No timed polling —
 * re-reads happen on manual refresh and on window focus (throttled), so returning
 * from an external handoff (e.g. a Kamino withdrawal) picks up the new balances.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { PublicKey, type Connection } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  type WalletPosition,
} from "./walletPosition";
import { fetchNativeStakePositions, fetchKaminoPositions } from "./protocolPositions";
import {
  buildKlendDirectUsdcExistingPosition,
  mergeKlendDirectPosition,
  obligationCTokenAccount,
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
import { applyPrice, buildPositions, sortPositions, accountsOf, priceMintFor } from "./portfolioPositionDerivation";
import { withTokenListings } from "./tokenListings";
import type { ParsedTokenAccount } from "./portfolioPositionDerivation";
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

async function loadTokenPrices(
  mints: string[]
): Promise<Map<string, { priceUsd: number; change24hPct?: number }>> {
  const mod = await import("./tokenPrices");
  return mod.fetchTokenPrices(mints);
}

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

/**
 * Manual-refresh broadcast: mounted useWalletPortfolio instances subscribe their
 * own refresh() here so UI that does NOT own the wallet read (the Global Nav's
 * refresh button) can trigger a re-read. Read-only — a refresh only re-fetches;
 * it never signs or constructs anything. No-op when no instance is mounted.
 */
const refreshListeners = new Set<() => void>();
export function requestWalletPortfolioRefresh(): void {
  refreshListeners.forEach((listener) => listener());
}

/** Minimum gap between focus-triggered re-reads (manual refresh is never throttled). */
const FOCUS_REFRESH_MIN_INTERVAL_MS = 30_000;

export function useWalletPortfolio(): WalletPortfolio {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [state, setState] = useState<PortfolioState>({ status: "idle", positions: [] });
  const [refreshKey, setRefreshKey] = useState(0);
  const reqId = useRef(0);
  const lastReadStartedAt = useRef(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    refreshListeners.add(refresh);
    return () => { refreshListeners.delete(refresh); };
  }, [refresh]);

  /**
   * Refresh on window focus (and tab-visibility return), throttled: returning from
   * an external handoff — a Kamino withdrawal, an exchange tab — re-reads the
   * wallet without a manual reload. The throttle keeps ordinary tab-switching from
   * spamming the RPC; the read itself is the same read-only fetch as always.
   */
  useEffect(() => {
    if (!connected || !publicKey) return;
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastReadStartedAt.current < FOCUS_REFRESH_MIN_INTERVAL_MS) return;
      refresh();
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [connected, publicKey, refresh]);

  useEffect(() => {
    // Do not fetch on disconnected state — clear any previous live assets.
    if (!connected || !publicKey) {
      reqId.current++; // invalidate any in-flight read
      setState({ status: "idle", positions: [] });
      return;
    }

    const myReq = ++reqId.current;
    lastReadStartedAt.current = Date.now();
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
      const kamino = kaminoRes.status === "fulfilled" ? kaminoRes.value : null;
      const protocolPositions: WalletPosition[] = [
        ...(stakeRes.status === "fulfilled" ? stakeRes.value : []),
        ...(kamino ? kamino.positions : []),
        ...(kaminoVaultRes.status === "fulfilled" ? kaminoVaultRes.value : []),
      ];
      // Supplied cToken units per reserve, for the Step 17A adapter below.
      const kaminoCollateralRaw = kamino?.collateralRawByReserve ?? {};
      const kaminoSupplyApyPct = kamino?.supplyApyPctByReserve ?? {};
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
      // Kept from the pricing pass for the 17A mount below. It must come from the
      // PRICE FEED, not from a USDC row in the wallet: a user who lent all of their
      // USDC holds none loose, and looking for one there left the lending position
      // permanently unpriced ("Current value could not be verified"). The klend
      // position contributes the USDC mint through its legs, so the feed has it.
      let sourcedUsdcPriceUsd: number | null = null;
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
          sourcedUsdcPriceUsd = prices.get(KLEND_DIRECT_IDENTITY.liquidityMint)?.priceUsd ?? null;
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
        // A deposit made through Kamino's own app leaves NO cTokens in the wallet —
        // the obligation holds them — so when the scan above finds nothing, the
        // obligation's collateral for the ONE approved reserve is synthesized into
        // the same validated account shape (see obligationCTokenAccount; covered
        // end-to-end by the REC recorded-obligation fixtures).
        if (cTokenAccounts.length === 0) {
          const fromObligation = obligationCTokenAccount(kaminoCollateralRaw, owner.toBase58());
          if (fromObligation) cTokenAccounts.push(fromObligation);
        }
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
              // Feed price first (see `sourcedUsdcPriceUsd`); a loose USDC row in the
              // wallet is only a fallback, since a fully lent user has none.
              const usdcPrice = pricedAsOf != null
                ? sourcedUsdcPriceUsd ?? merged.find((p) => p.mint === KLEND_DIRECT_IDENTITY.liquidityMint)?.priceUsd ?? null
                : null;
              // Real supply APY for this reserve, from Kamino's own metrics — the
              // canonical row replaces the obligation row that carried it, so
              // without this the APY / Est. Earnings cells would stay "—".
              const klendApyPct = kaminoSupplyApyPct[KLEND_DIRECT_IDENTITY.reserveAddress] ?? null;
              const record = buildKlendDirectUsdcExistingPosition({
                accounts: cTokenAccounts,
                walletAddress: owner.toBase58(),
                walletSourceSlot: currentSlot,
                reserve: reserveSnap, // KlendDirectReserveSnapshot | null
                price: { usdcPriceUsd: usdcPrice, fresh: pricedAsOf != null && typeof usdcPrice === "number" },
                apy: { valuePct: klendApyPct, fresh: klendApyPct != null, rateKind: "estimated_variable_apy" },
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

      // DISPLAY NAMES, LAST. Tokens the registry could not name are looked up in Jupiter's verified
      // list and given a `listing` (ticker, name, icon). Done after every merge and dedupe above, so
      // a row that turned out to be an LP or receipt token is already gone, and done to nothing the
      // engine reads — `symbol`/`name` are untouched. Never throws; a failure leaves the addresses.
      merged = await withTokenListings(merged);
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
