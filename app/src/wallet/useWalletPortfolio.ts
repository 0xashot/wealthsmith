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
}

/** Loosely-typed parsed token account — validated defensively before use. */
interface ParsedTokenAccount {
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
  | "lst_apy";

/**
 * Kamino Earn Vault positions (incl. farm-staked shares) via the heavy Kamino SDK,
 * loaded DYNAMICALLY so it is code-split out of the main bundle and isolated.
 */
async function fetchKaminoVaults(rpcUrl: string, ownerB58: string): Promise<WalletPosition[]> {
  const mod = await import("./kaminoVaults");
  return mod.fetchKaminoVaultPositions(rpcUrl, ownerB58);
}

/** LST APY (stake-pool math) via a dynamically-imported module (off main bundle). */
async function fetchLstApys(
  connection: Connection,
  mints: string[]
): Promise<Map<string, number>> {
  const mod = await import("./lstApy");
  return mod.fetchLstApys(connection, mints);
}

/** Build a normalized position from one parsed token account, or null to skip. */
function toTokenPosition(acc: ParsedTokenAccount): WalletPosition | null {
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

/** Assemble positions from whatever reads succeeded (native may be null). */
function buildPositions(
  lamports: number | null,
  tokenAccounts: ParsedTokenAccount[],
  extra: WalletPosition[] = []
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
    const pos = toTokenPosition(acc);
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

  // Sort: native, LSTs, native stake, known tokens, Kamino/protocol, unknown.
  const rank = (p: WalletPosition) => {
    if (p.type === "native") return 0;
    if (p.type === "lst") return 1;
    if (p.type === "stake") return 2;
    if (p.type === "protocol") return 4;
    return p.name === "Unknown token" ? 5 : 3;
  };
  return positions.sort((a, b) => rank(a) - rank(b));
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
    setState((s) => ({ status: "loading", positions: s.positions }));

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
        setState({ status: "ready", positions: buildPositions(lamports, []) });
      }

      // PHASE 2 — token reads + protocol reads (native stake, Kamino). All are
      // independent + time-boxed, so one slow/failed read never blocks the others
      // or the already-rendered SOL. Protocol positions are best-effort: if they
      // fail they simply don't appear (logged in DEV), no user-facing error.
      const [splRes, tok22Res, stakeRes, kaminoRes, kaminoVaultRes] = await Promise.allSettled([
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
      const positions = buildPositions(lamports, tokenAccounts, protocolPositions);

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
          },
          failed,
          errors: {
            native_sol: nativeErr,
            spl_token: reason(splRes),
            token_2022: reason(tok22Res),
            native_stake: reason(stakeRes),
            kamino: reason(kaminoRes),
            kamino_vault: reason(kaminoVaultRes),
          },
          positions: positions.length,
          partial: failed.length > 0 && (nativeOk || splOk || tok22Ok),
        });
      }

      // Every read failed → hard error. Otherwise show what we have + a warning
      // that matches which reads failed.
      if (!nativeOk && !splOk && !tok22Ok) {
        setState({ status: "error", positions: [], error: LIVE_WALLET_ERROR_ALL });
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

      setState({ status: "ready", positions, warning });

      // PHASE 3 — enrich recognized LST rows (JupSOL/bSOL/JitoSOL) with on-chain
      // stake-pool APY. Only runs when LSTs are held; best-effort; updates just the
      // apy of those rows. Never blocks or fails the rest.
      const lstMints = positions
        .filter((p) => p.type === "lst" && typeof p.mint === "string")
        .map((p) => p.mint as string);
      if (lstMints.length > 0) {
        try {
          const apys = await withTimeout(
            fetchLstApys(connection, lstMints),
            PROTOCOL_TIMEOUT_MS,
            "lst_apy"
          );
          if (cancelled || myReq !== reqId.current) return;
          if (apys.size > 0) {
            setState({
              status: "ready",
              warning,
              positions: positions.map((p) =>
                p.type === "lst" && p.mint && apys.has(p.mint)
                  ? { ...p, apy: apys.get(p.mint) ?? null }
                  : p
              ),
            });
          }
        } catch {
          // APY enrichment is best-effort.
        }
      }
    })().catch(() => {
      // Defensive: never leave a stuck loading state.
      if (cancelled || myReq !== reqId.current) return;
      setState({ status: "error", positions: [], error: LIVE_WALLET_ERROR_ALL });
    });

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, connected, refreshKey]);

  return { ...state, refresh };
}
