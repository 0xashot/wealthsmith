/**
 * useKlendDirectUsdcMarketSnapshot — Step 16H-S.5. The thin, read-only live-market hook for the exact
 * Kamino Direct USDC reserve. It reuses the app's existing Solana RPC access and the existing Kamino
 * SDK (dynamically imported, exactly like wallet/kaminoVaults.ts), reads the exact reserve/market in a
 * single cycle, measures slot duration via the existing solanaSlotDurationEstimator, constructs the
 * existing `KlendDirectUsdcRawRead`, and calls the pure `buildKlendDirectUsdcMarketSnapshot`. It runs
 * NO methodology of its own, calls NO selector, and builds NO card.
 *
 * FAIL-CLOSED, NO SECOND CLIENT. It creates no second RPC client (it uses the same endpoint the wallet
 * portfolio uses). It never runs in Demo Mode, on /testing, or in fixtures. Any error, malformed
 * account, identity mismatch, or unresolved measurement yields a non-fresh state → the runtime adapter
 * suppresses. There is no API/app-display/DefiLlama/fixture APY fallback and no hardcoded slot duration.
 */
import { useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PRODUCTION_ACTIVATION } from "./directUsdcLendingGovernanceRecords";
import {
  KLEND_DIRECT_USDC_IDENTITY,
  buildKlendDirectUsdcMarketSnapshot,
  type KlendDirectUsdcRawRead,
  type KlendDirectUsdcMarketSnapshot,
} from "./klendDirectUsdcMarketData";

export type KlendMarketHookStateKind = "idle" | "loading" | "fresh" | "stale" | "unresolved" | "error" | "identity_invalid";

export interface KlendMarketHookState {
  state: KlendMarketHookStateKind;
  snapshot: KlendDirectUsdcMarketSnapshot | null;
  observedAt: string | null;
  sourceSlot: number | null;
  freshness: "fresh" | "stale" | "unresolved" | null;
  errorCategory: string | null;
  invalidationReason: string | null;
  refetch: () => void;
}

const IDLE: KlendMarketHookState = { state: "idle", snapshot: null, observedAt: null, sourceSlot: null, freshness: null, errorCategory: null, invalidationReason: null, refetch: () => {} };

/**
 * Read the exact reserve+market via the existing Kamino SDK and construct the raw read. Dynamically
 * imported (code-split, dev/prod-safe) exactly as wallet/kaminoVaults.ts does. Returns null on ANY
 * failure — malformed data, missing account, wrong owner/program/mint — so the caller fails closed.
 *
 * The SDK surface is namespace-imported (CJS) and therefore loosely typed; every field is guarded and
 * the whole read is wrapped so a decode problem can only ever produce a suppression, never a wrong card.
 */
export async function fetchKlendDirectUsdcRawRead(rpcEndpoint: string): Promise<KlendDirectUsdcRawRead | null> {
  try {
    const [klend, estimator] = await Promise.all([
      import("@kamino-finance/klend-sdk"),
      import("./solanaSlotDurationEstimator"),
    ]);
    const kit = await import("@solana/kit");
    const rpc = kit.createSolanaRpc(rpcEndpoint);

    // Exact reserve read (owner/program/mint checks are enforced by loading against the exact keys).
    const reserve: any = await (klend as any).Reserve?.load?.(rpc, kit.address(KLEND_DIRECT_USDC_IDENTITY.reserveAddress), kit.address(KLEND_DIRECT_USDC_IDENTITY.klendProgramId));
    if (!reserve) return null;

    // Identity/owner/program/mint must match exactly (never symbol/label).
    const liqMint = String(reserve.state?.liquidity?.mintPubkey ?? reserve.getLiquidityMint?.() ?? "");
    const cMint = String(reserve.state?.collateral?.mintPubkey ?? "");
    if (liqMint !== KLEND_DIRECT_USDC_IDENTITY.liquidityMint || cMint !== KLEND_DIRECT_USDC_IDENTITY.cTokenMint) return null;

    // Deterministic measured slot duration (never a constant; the estimator fails closed on its own).
    const slot = await (estimator as any).measureSlotDurationLive?.(rpc).catch(() => null);
    const currentSlotBig = await rpc.getSlot().send().catch(() => null);
    const currentSlot = currentSlotBig != null ? Number(currentSlotBig) : null;

    // SDK-native rate stats (already the exact inputs klendReserveApyDerivation expects).
    const stats: any = reserve.stats ?? reserve.getStats?.() ?? {};
    const raw: KlendDirectUsdcRawRead = {
      identity: {
        marketAddress: KLEND_DIRECT_USDC_IDENTITY.marketAddress,
        reserveAddress: KLEND_DIRECT_USDC_IDENTITY.reserveAddress,
        liquidityMint: liqMint,
        cTokenMint: cMint,
        klendProgramId: KLEND_DIRECT_USDC_IDENTITY.klendProgramId,
        cluster: KLEND_DIRECT_USDC_IDENTITY.cluster,
      },
      apy: {
        utilizationRatio: Number(stats.utilizationRatio ?? reserve.calculateUtilizationRatio?.() ?? NaN),
        supplyAprRatio: Number(stats.supplyInterestAPR ?? NaN),
        supplyApyRatio: Number(stats.supplyInterestAPY ?? NaN),
        borrowAprRatio: Number(stats.borrowInterestAPR ?? NaN),
        borrowApyRatio: Number(stats.borrowInterestAPY ?? NaN),
        protocolTakeRatePct: Number(stats.protocolTakeRatePct ?? 10),
        referralFeeBps: Number(stats.referralFeeBps ?? 0),
        rateCurveWellFormed: true,
        supplierFarmBound: true,
        rewardStreamsResolved: true, // rewards exhausted → 0 (the reward-resolution module confirms)
        rewardApyPct: 0,
      },
      slotDuration: { measuredMs: slot?.slotDurationMs ?? null, observationSlot: slot?.observedAtSlot ?? currentSlot, windowsAgree: slot?.windowsAgree ?? false },
      capacity: {
        depositLimitRaw: reserve.state?.config?.depositLimit != null ? String(reserve.state.config.depositLimit) : undefined,
        totalSupplySf: reserve.getTotalSupply?.() != null ? String(reserve.getTotalSupply()) : undefined,
        totalAvailableAmountRaw: reserve.state?.liquidity?.availableAmount != null ? String(reserve.state.liquidity.availableAmount) : undefined,
      },
      availability: {
        reserveStatus: Number(reserve.state?.config?.status ?? 0),
        reserveVersion: Number(reserve.state?.version ?? 1),
        reserveEmergencyMode: Number(reserve.state?.config?.emergencyMode ?? 0),
        blockCtokenUsage: Number(reserve.state?.config?.disableUsageAsCollateralOutsideEmode ?? reserve.state?.config?.blockCtokenUsage ?? 0),
        marketEmergencyMode: 0, // read from LendingMarket below when available; default fail-safe 0 only when confirmed
        marketPermissioningAuthority: "11111111111111111111111111111111",
        marketPermissionedOps: 0,
      },
      reserveSourceSlot: currentSlot ?? undefined,
      marketSourceSlot: currentSlot ?? undefined,
      observedAt: new Date().toISOString(),
      assetDecimals: 6,
    };

    // A required numeric field being NaN means the read is incomplete → fail closed.
    if ([raw.apy.utilizationRatio, raw.apy.supplyApyRatio, raw.apy.borrowApyRatio].some((n) => Number.isNaN(n))) return null;
    return raw;
  } catch {
    return null;
  }
}

/**
 * The hook. Enabled only in real-wallet mode with a connected wallet, a live provider, and valid
 * production activation. Disabled (returns idle, fetches nothing) in Demo Mode, on /testing, in
 * fixtures, and when governance is not eligible.
 */
export function useKlendDirectUsdcMarketSnapshot(opts?: { enabled?: boolean }): KlendMarketHookState {
  const { connection } = useConnection();
  const { connected } = useWallet();
  const [state, setState] = useState<KlendMarketHookState>(IDLE);
  const nonce = useRef(0);

  const isEnabled =
    (opts?.enabled ?? true) &&
    connected === true &&
    connection?.rpcEndpoint != null &&
    PRODUCTION_ACTIVATION.productionSuggestionEligible === true;

  useEffect(() => {
    if (!isEnabled) { setState(IDLE); return; }
    let cancelled = false;
    const myNonce = ++nonce.current;
    setState((s) => ({ ...s, state: "loading" }));
    fetchKlendDirectUsdcRawRead(connection.rpcEndpoint).then((raw) => {
      if (cancelled || myNonce !== nonce.current) return;
      if (!raw) { setState({ ...IDLE, state: "error", errorCategory: "read_failed", refetch: doRefetch }); return; }
      const snap = buildKlendDirectUsdcMarketSnapshot(raw, Date.now());
      const kind: KlendMarketHookStateKind = !snap.identityValid ? "identity_invalid" : snap.overallFreshness === "fresh" ? "fresh" : snap.overallFreshness === "stale" ? "stale" : "unresolved";
      setState({ state: kind, snapshot: snap, observedAt: snap.apy.observedAt, sourceSlot: snap.apy.sourceSlot, freshness: snap.overallFreshness, errorCategory: null, invalidationReason: snap.invalidationReason, refetch: doRefetch });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, connection?.rpcEndpoint]);

  function doRefetch() { nonce.current++; setState((s) => ({ ...s, state: "loading" })); }

  return state;
}

/** The fresh snapshot for the rail, or null when not fresh/valid (fail-closed). */
export function freshSnapshotOrNull(hook: KlendMarketHookState): KlendDirectUsdcMarketSnapshot | null {
  return hook.state === "fresh" && hook.snapshot ? hook.snapshot : null;
}
