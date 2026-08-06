/**
 * Recorded-obligation fixtures (REC) + demo swap-quote derivation guards (DSQ).
 * Extracted from suggestionEngine.fixtures.ts as part of the monolith split —
 * see fixtureCheck.ts for the pattern.
 */
import { readFileSync } from "fs";
import type { FixtureCheck } from "./fixtureCheck";
import * as REC from "../klendObligationRecordedFixture";
import { parseKaminoObligationEntries, collateralRawFromEntries } from "../../wallet/protocolPositions";
import { applyPrice as wpApplyPrice } from "../../wallet/portfolioPositionDerivation";
import { computeSafetyBufferCoverage as sbCoverage } from "../../wallet/safetyBufferCoverage";
import { derivePositionOptimizationAssessment as poDerive } from "../positionOptimizationAssessment";
import { buildPositionOptimizationCardFromAssessment as poBuildCard } from "../positionOptimizationSuggestion";
import {
  buildKlendDirectUsdcExistingPosition as epBuild,
  toWalletPosition as epToWallet,
  obligationCTokenAccount as epObAccount,
} from "../klendDirectUsdcExistingPosition";
import { POSITION_IDENTITY as EP_POS_ID } from "../klendDirectLendingPosition";

/* ------------------------------------------------------------------ *
 * REC — recorded-obligation end-to-end regression. Replays a RECORDED Kamino
 * obligations API response (klendObligationRecordedFixture.ts) through the REAL
 * production chain: parse → collateral extraction → account synthesis → 17A
 * redemption/withdrawal math → Safety Buffer. This is the obligation-held
 * deposit path that shipped with no end-to-end coverage and hid four bugs.
 * ------------------------------------------------------------------ */
export function runRecordedObligationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const NOW = Date.parse("2026-08-03T12:00:00.000Z");

  // The full production chain, from the recorded response body to a WalletPosition.
  const chain = (response: unknown, market: string) => {
    const entries = parseKaminoObligationEntries(response, market);
    const collateral = collateralRawFromEntries(entries);
    const account = epObAccount(collateral, REC.RECORDED_OWNER);
    const record = account
      ? epBuild({
          accounts: [account], walletAddress: REC.RECORDED_OWNER, walletSourceSlot: 436752001,
          reserve: REC.RECORDED_RESERVE_SNAPSHOT as never,
          price: { usdcPriceUsd: 1, fresh: true },
          apy: { valuePct: 4.19, fresh: true, rateKind: "estimated_variable_apy" },
          observedAt: "2026-08-03T12:00:00.000Z", nowMs: NOW,
        })
      : null;
    return { entries, collateral, account, record, position: record ? epToWallet(record) : null };
  };

  const main = chain(REC.RECORDED_OBLIGATIONS_RESPONSE, REC.RECORDED_MARKET);

  add("REC-1: recorded response parses to exactly ONE supplied entry (padding rows skipped)", (() => {
    return main.entries.length === 1 && main.entries[0].side === "supplied"
      && main.entries[0].reserve === REC.RECORDED_RESERVE
      && main.entries[0].rawAmount === REC.RECORDED_COLLATERAL_RAW;
  })(), `entries=${main.entries.length}`);
  add("REC-2: collateral extraction carries the exact raw cToken amount", main.collateral[REC.RECORDED_RESERVE] === REC.RECORDED_COLLATERAL_RAW, "exact raw");
  add("REC-3: the synthesized account passes the 17A discovery validator", main.record?.positionExists === true && main.record?.cTokenBalanceRaw === REC.RECORDED_COLLATERAL_RAW, "accepted");
  add("REC-4: redemption math resolves the recorded USD value, fully withdrawable", (() => {
    const w = main.position;
    return !!w && typeof w.valueUsd === "number" && Math.abs(w.valueUsd - REC.RECORDED_EXPECTED_USD) < 0.01
      && w.withdrawalState === "fully_withdrawable"
      && typeof w.liquidValueUsd === "number" && Math.abs(w.liquidValueUsd - REC.RECORDED_EXPECTED_USD) < 0.01;
  })(), `value=${main.position?.valueUsd}`);
  add("REC-5: the Safety Buffer counts the recorded deposit as verified liquid (COMPLETE at a $9k target)", (() => {
    const w = main.position;
    if (!w) return false;
    const cov = sbCoverage([w], 9_000);
    return cov.coverageState === "complete" && Math.abs(cov.verifiedLiquidStableValueUsd - REC.RECORDED_EXPECTED_USD) < 0.01
      && cov.unresolvedStableValueUsd === 0 && cov.sources[0].inclusionState === "included_liquid";
  })(), "complete");
  add("REC-6: an obligation in an UNVETTED market/reserve parses but is NEVER promoted", (() => {
    const r = chain(REC.RECORDED_UNVETTED_RESPONSE, "ByYiZxp8QrdN9qbdtaAiePN8AAr3qvTPppNJDpf5DVJ5");
    return r.entries.length === 1 && r.account === null && r.position === null;
  })(), "not promoted");
  add("REC-7: a borrow-only obligation never synthesizes supplied collateral", (() => {
    const r = chain(REC.RECORDED_BORROW_ONLY_RESPONSE, REC.RECORDED_MARKET);
    return r.entries.length === 1 && r.entries[0].side === "borrowed" && r.account === null;
  })(), "no supplied");
  add("REC-8: malformed responses yield no entries and never throw", (() => {
    try {
      return parseKaminoObligationEntries(null, "m").length === 0
        && parseKaminoObligationEntries({ not: "an array" }, "m").length === 0
        && parseKaminoObligationEntries([{ state: null }, { state: { deposits: null, borrows: null } }, 42], "m").length === 0;
    } catch { return false; }
  })(), "fail closed");
  add("REC-10: the canonical row emits ONE underlying leg that agrees with its own valueUsd", (() => {
    // Legs is the last field the canonical row dropped relative to the raw
    // obligation row (value → APY → icon → stable classification each became a
    // production bug). The leg must be the REDEEMED underlying amount, so a
    // legs-based valuation agrees with the adapter's USD by construction.
    const w = main.position;
    if (!w || !w.legs || w.legs.length !== 1) return false;
    const leg = w.legs[0];
    const legValue = leg.uiAmount * 1; // recorded price basis: $1 USDC
    return leg.mint === EP_POS_ID.liquidityMint && leg.side === "long"
      && typeof w.valueUsd === "number" && Math.abs(legValue - w.valueUsd) < 0.01;
  })(), "legs agree");
  add("REC-11: the UNRESOLVED branch emits NO legs (a cToken leg would invite a wrong price)", (() => {
    const account = epObAccount(main.collateral, REC.RECORDED_OWNER);
    if (!account) return false;
    const record = epBuild({
      accounts: [account], walletAddress: REC.RECORDED_OWNER, walletSourceSlot: 436752001,
      reserve: { ...REC.RECORDED_RESERVE_SNAPSHOT, collateralMintTotalSupplyRaw: null } as never,
      price: { usdcPriceUsd: 1, fresh: true },
      apy: { valuePct: null, fresh: false, rateKind: "estimated_variable_apy" },
      observedAt: "2026-08-03T12:00:00.000Z", nowMs: NOW,
    });
    const w = epToWallet(record);
    return !!w && w.legs === undefined;
  })(), "no unresolved legs");
  add("REC-12: the pricing pass NEVER overwrites the adapter-priced value via legs", (() => {
    // The 17A redemption math is authoritative; feed-summed legs only FILL a
    // missing value. A divergent feed price must leave the adapter's USD intact.
    const w = main.position;
    if (!w || typeof w.valueUsd !== "number") return false;
    const divergent = new Map([[EP_POS_ID.liquidityMint, { priceUsd: 0.5 }]]);
    const priced = wpApplyPrice(w, divergent);
    const rawLegsRow = { ...w, valueUsd: null } as typeof w;
    const filled = wpApplyPrice(rawLegsRow, new Map([[EP_POS_ID.liquidityMint, { priceUsd: 1 }]]));
    return priced.valueUsd === w.valueUsd
      && typeof filled.valueUsd === "number" && Math.abs(filled.valueUsd - REC.RECORDED_EXPECTED_USD) < 0.01;
  })(), "authoritative value");
  add("REC-13: the review modal's venue for the recorded position reads 'Kamino', not the product name", (() => {
    // The venue under the asset answers "where is it?" — the protocol. The row's
    // own name ("Kamino Direct USDC") restates the asset and read as clutter.
    const w = main.position;
    if (!w) return false;
    const a = poDerive({ positions: [w], generatedAt: NOW });
    const pos = [...a.flaggedPositions, ...(a as { canonicalPositions?: { venueLabel: string | null }[] }).canonicalPositions ?? []][0];
    return pos != null && pos.venueLabel === "Kamino";
  })(), "venue label");
  add("REC-14: the portfolio-share denominator includes manual BTC/ETH (measurement only)", (() => {
    // "85% of your portfolio" must mean the portfolio the user SEES — Total
    // Portfolio Value includes the manually added holdings. Wallet-only, the
    // recorded position is 100% of gross; with $5,000 of external holdings the
    // SAME position reads ~75.3%, and card copy + trigger use the same number.
    const w = main.position;
    if (!w) return false;
    const walletOnly = poDerive({ positions: [w], generatedAt: NOW });
    const widened = poDerive({ positions: [w], generatedAt: NOW, externalMeasurementValueUsd: 5_000 });
    const expected = (w.valueUsd as number) / ((w.valueUsd as number) + 5_000);
    const card = poBuildCard(widened, NOW);
    const shownShare = card?.reviewDetails?.involvedPositions?.[0]?.portfolioSharePct;
    return walletOnly.measuredGrossAssetValueUsd === walletOnly.grossAssetValueUsd
      && Math.abs(widened.measuredGrossAssetValueUsd - (walletOnly.grossAssetValueUsd + 5_000)) < 0.01
      && typeof shownShare === "number" && Math.abs(shownShare - expected * 100) < 0.1;
  })(), "measured denominator");
  add("REC-15: below the 50% measured share, the concentration observation honestly disappears", (() => {
    // The user's real case: adding enough BTC/ETH dilutes the lend below the
    // trigger — the trigger and the copy must agree, so the card goes away
    // rather than claiming a share the portfolio no longer supports.
    const w = main.position;
    if (!w) return false;
    const diluted = poDerive({ positions: [w], generatedAt: NOW, externalMeasurementValueUsd: 16_000 });
    // 15,263.6 / 31,263.6 ≈ 48.8% < 50%
    return diluted.triggerStates.concentration !== "triggered" && poBuildCard(diluted, NOW) === null
      // …and garbage external input fails closed to the wallet-only denominator.
      && poDerive({ positions: [w], generatedAt: NOW, externalMeasurementValueUsd: Number.NaN }).measuredGrossAssetValueUsd
         === poDerive({ positions: [w], generatedAt: NOW }).grossAssetValueUsd;
  })(), "honest disappearance");
  add("DSQ-1: the demo swap quote DERIVES its cost from the action — % always equals $ ÷ input", (() => {
    // Regression: the fixture used to hardcode "$0.03 · 0.09%", values authored for
    // a ~$15 swap, which then showed unchanged under a $605 suggestion (and were
    // not self-consistent even at the original size).
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/swapQuote/demoSwapQuote.ts`, "utf8"); } catch { return ""; } })();
    return /computeSwapCostBreakdown\(/.test(src)
      && /estimatedTotalCostUsd: cost\.estimatedTotalCostUsd, estimatedTotalCostPct: cost\.estimatedTotalCostPct/.test(src)
      && !/estimatedTotalCostUsd: [\d.]+/.test(src) && !/estimatedTotalCostPct: [\d.]+/.test(src);
  })(), "derived cost");
  add("DSQ-2: it prices the OUTPUT token by the output asset, and fails closed without a USD notional", (() => {
    // Deriving output tokens from the input token count would assume both sides
    // cost the same per token (605 USDC → "604 SOL"). No notional → no quote.
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/swapQuote/demoSwapQuote.ts`, "utf8"); } catch { return ""; } })();
    return /demoPriceUsd\(action\.outputAsset\.mint\)/.test(src)
      && /impliedOutTokens = outUsd \/ outPrice/.test(src)
      && /if \(inputUsd == null \|\| !Number\.isFinite\(inputUsd\) \|\| inputUsd <= 0\) return null;/.test(src);
  })(), "priced by output asset");
  add("REC-9: an exhausted reserve turns the SAME recorded deposit into zero verified liquid", (() => {
    const account = epObAccount(collateralRawFromEntries(parseKaminoObligationEntries(REC.RECORDED_OBLIGATIONS_RESPONSE, REC.RECORDED_MARKET)), REC.RECORDED_OWNER);
    if (!account) return false;
    const record = epBuild({
      accounts: [account], walletAddress: REC.RECORDED_OWNER, walletSourceSlot: 436752001,
      reserve: { ...REC.RECORDED_RESERVE_SNAPSHOT, totalAvailableLiquidityRaw: "0" } as never,
      price: { usdcPriceUsd: 1, fresh: true },
      apy: { valuePct: 4.19, fresh: true, rateKind: "estimated_variable_apy" },
      observedAt: "2026-08-03T12:00:00.000Z", nowMs: NOW,
    });
    const w = epToWallet(record);
    return !!w && sbCoverage([w], 9_000).verifiedLiquidStableValueUsd === 0;
  })(), "fails closed");
  return checks;
}
