/**
 * contributionPriceAdapter — Step 15H. Produces the Step 15C `ContributionPriceQuote` from the
 * EXISTING canonical price infrastructure (the internal token-price service / backend-normalized
 * portfolio USD / same-origin runtime payload). It adds NO direct provider call — never CoinGecko /
 * Jupiter / DefiLlama / Binance / Coinbase from a component — and invents no timestamp or provenance.
 * Real Wallet requires a fresh, approved-source, same-origin/backend-normalized quote; Demo uses an
 * explicitly labeled fixture quote that must never enter real_wallet mode.
 */
import { evaluateContributionPriceQuote, SOL_CONTRIBUTION_PRICE_MAX_AGE_MS, CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, type ContributionPriceQuote } from "./contributionPricePolicy";
import { getInvestmentTarget } from "./investmentTargetRegistry";
import { SOL_MINT as PRICE_SOL_MINT } from "../wallet/tokenPrices";
import type { ContributionProductDataMode, ContributionPipelineBlocker } from "./contributionIntegrationTypes";

export const CONTRIBUTION_PRICE_ADAPTER_EXISTS = true;

export interface BuildPriceQuoteOptions {
  dataMode: ContributionProductDataMode;
  targetId: string;
  priceUsd: number | null | undefined;
  /** Approved canonical source id (defaults to the internal token-price service). */
  sourceId?: string;
  fetchedAt: string;
  checkedAt: string;
  browserFetched?: boolean;
  maximumAgeMs?: number;
  /** True when the quote came from a Demo/example fixture. Forbidden in real_wallet mode. */
  isFixtureData?: boolean;
}

export interface PriceAdapterResult {
  ok: boolean;
  quote?: ContributionPriceQuote;
  blocker?: ContributionPipelineBlocker;
}

/**
 * Build + evaluate the canonical SOL (or future growth target) price quote. The freshness policy is
 * the Step 15C 60-minute maximum. Fails closed; fixture data is rejected in real_wallet mode.
 */
export function buildContributionPriceQuote(opts: BuildPriceQuoteOptions): PriceAdapterResult {
  if (opts.dataMode === "real_wallet" && opts.isFixtureData === true) return { ok: false, blocker: "real_wallet_fixture_fallback_forbidden" };
  const target = getInvestmentTarget(opts.targetId);
  if (!target) return { ok: false, blocker: "price_quote_invalid" };
  // Growth targets carry a native-chain / mint asset id; SOL uses the canonical wallet mint.
  const assetId = opts.targetId === "sol" ? PRICE_SOL_MINT : target.assetId;
  const quote = evaluateContributionPriceQuote(
    { targetId: opts.targetId, assetId, priceUsd: opts.priceUsd ?? null, sourceId: opts.sourceId ?? CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID, fetchedAt: opts.fetchedAt, checkedAt: opts.checkedAt, ...(opts.browserFetched != null ? { browserFetched: opts.browserFetched } : {}) },
    { maximumAgeMs: opts.maximumAgeMs ?? SOL_CONTRIBUTION_PRICE_MAX_AGE_MS },
  );
  return { ok: true, quote };
}

/** Demo-only helper: an explicitly labeled fixture SOL price quote (never used in real_wallet mode). */
export function demoSolPriceQuote(priceUsd: number, fetchedAt: string, checkedAt: string): ContributionPriceQuote {
  return buildContributionPriceQuote({ dataMode: "demo_fixture", targetId: "sol", priceUsd, fetchedAt, checkedAt }).quote!;
}
