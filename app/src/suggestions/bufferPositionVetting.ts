/**
 * bufferPositionVetting — the ENGINE decision (source of truth) for a detected Kamino lending-market / curated-vault
 * position whose deposited asset has NOT yet passed WealthSmith's Safety Buffer vetting. Its value is already excluded
 * from Safety Buffer coverage upstream (`safetyBufferCoverage.ts` classifies these existing-position/protocol stables
 * as `excluded_unresolved` → 0 verified liquid). This module ONLY resolves a confidently-identified position into the
 * deterministic structured fields the UI renders — it never counts, moves, executes, or signs anything, and it never
 * claims the position is unsafe.
 *
 * CURATOR-AGNOSTIC. No curator is special-cased. Steakhouse Financial, Sentora, Allez Labs, Gauntlet, RockawayX, MEV
 * Capital, and any future curator are supported through the SAME path: the position carries its resolved identity
 * (`curatedLending`, from Kamino protocol data / the internal registry) — product name, curator, and CANONICAL
 * addresses (vault / market / reserve). Positions are identified by those canonical addresses, never by display name.
 * The only internal policy here is the APPROVED replacement destination per deposited asset (e.g. USDC → Kamino's
 * SOL/BTC Market). Anything not confidently identified, or with no approved destination, fails closed to the generic state.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SafetyBufferCoverage } from "../wallet/safetyBufferCoverage";
import { KLEND_DIRECT_USDC_IDENTITY } from "./klendDirectUsdcMarketData";

export type BufferPositionDetectionConfidence = "high" | "medium";
export type BufferPositionApprovalStatus = "not_vetted" | "approved";

/** The deterministic structured fields the card + modal templates render. Never inferred by the frontend. */
export interface BufferPositionReview {
  type: "buffer_position_review";
  reason: "buffer_position_not_vetted";
  protocol: string;
  /** Resolved product / vault name (dynamic, e.g. "Allez USDC" / "Steakhouse USDC Vault"). Never hardcoded. */
  product: string;
  /** Resolved curator (e.g. "Allez Labs"), or null when the market has no curator. */
  curator: string | null;
  token: string;
  /** Formatted deposited amount (e.g. "2,000 USDC") when known; null when it cannot be attributed. */
  amountDisplay: string | null;
  /** Numeric deposited amount (token units) when attributable — for the "Excluded from Safety Buffer" table. */
  uiAmount: number | null;
  /** USD value of the excluded (not-yet-counted) position when known — for the "Excluded from Safety Buffer" table. */
  valueUsd: number | null;
  /** The canonical vault / market / reserve address the position was identified by (never a display name). */
  positionAddress: string | null;
  approvalStatus: BufferPositionApprovalStatus;
  approvedDestination: string;
  destinationUrl: string;
  detectionConfidence: BufferPositionDetectionConfidence;
}

/**
 * The approved Kamino SOL/BTC Market USDC lending page. The market formerly known as the "Main Market" was renamed
 * to the "SOL/BTC Market" (Kamino UI, kamino.com/borrow: "The Main Market has been renamed to the SOL/BTC Market.").
 */
export const KAMINO_SOL_BTC_MARKET_USDC_URL = "https://kamino.com/borrow" as const;

/** One approved Safety Buffer replacement destination for a deposited asset (WealthSmith policy — NOT per curator). */
interface ApprovedDestination {
  name: string;
  url: string;
  /** Canonical reserve addresses that ARE the approved destination (a position already here is vetted → not reviewed). */
  approvedReserveAddresses: readonly string[];
}

/**
 * The approved-destination policy, keyed by (protocol + deposited-asset mint). This is the ONLY internal mapping —
 * curators are resolved from the position itself, never listed here. Add an asset's approved destination once and every
 * curator's position in that asset routes to it.
 */
const APPROVED_DESTINATIONS: Record<string, ApprovedDestination> = {
  // Kamino + canonical USDC mint → the approved Kamino SOL/BTC Market USDC reserve (formerly the "Main Market").
  [`kamino:${KLEND_DIRECT_USDC_IDENTITY.liquidityMint}`]: {
    name: "SOL/BTC Market",
    url: KAMINO_SOL_BTC_MARKET_USDC_URL,
    approvedReserveAddresses: [KLEND_DIRECT_USDC_IDENTITY.reserveAddress],
  },
};

/** "2,000 USDC" — whole-token when integral, else up to 2 decimals. Null when no amount can be attributed. */
function formatTokenAmount(amount: number | null | undefined, token: string): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  const n = Number.isInteger(amount)
    ? amount.toLocaleString("en-US")
    : amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${n} ${token}`;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Decide whether a detected Kamino lending / curated-vault position should surface the specific review. Returns the
 * structured review ONLY for a coverage source that is `excluded_unresolved` (not counted toward the buffer) whose
 * position carries a resolved `curatedLending` identity with high/medium confidence, a CANONICAL address, and an
 * approved destination for its asset. Otherwise returns null → generic "Verify Your Safety Buffer" fallback.
 *
 * Buffer-independence: this reads coverage/positions but never changes what counts — the source is already excluded.
 */
export function deriveBufferPositionReview(
  coverage: SafetyBufferCoverage | null,
  positions: readonly WalletPosition[] | null | undefined,
): BufferPositionReview | null {
  if (!coverage || !positions || positions.length === 0) return null;

  for (const source of coverage.sources) {
    if (source.inclusionState !== "excluded_unresolved") continue; // only detected-but-not-counted lending capital
    const position = positions.find((p) => p.id === source.positionId);
    if (!position) continue;

    const id = position.curatedLending;
    if (!id || !id.protocol || !id.productName) continue; // cannot resolve the product → fail closed to generic
    const confidence = id.detectionConfidence ?? "high";
    if (confidence !== "high" && confidence !== "medium") continue; // low / unresolved confidence → generic

    // Identity by CANONICAL address (vault / market / reserve) — never a display name.
    const positionAddress = id.vaultAddress ?? id.marketAddress ?? id.reserveAddress ?? null;
    if (!positionAddress) continue; // no canonical address → cannot confidently identify → generic

    const token = typeof position.symbol === "string" && position.symbol.length > 0 ? position.symbol : null;
    const mint = typeof position.mint === "string" ? position.mint : null;
    if (!token || !mint) continue;

    const destination = APPROVED_DESTINATIONS[`${id.protocol.toLowerCase()}:${mint}`];
    if (!destination || !destination.url) continue; // no approved destination / URL → generic (never a broken CTA)

    // A position already in an approved reserve is vetted (counts) — never surface the review for it.
    const isApproved = id.reserveAddress != null && destination.approvedReserveAddresses.includes(id.reserveAddress);
    if (isApproved) continue;

    const amount =
      (typeof position.uiAmount === "number" ? position.uiAmount : null) ??
      num(source.recognizedValueUsd) ??
      (source.unresolvedValueUsd > 0 ? source.unresolvedValueUsd : null);

    return {
      type: "buffer_position_review",
      reason: "buffer_position_not_vetted",
      protocol: id.protocol,
      product: id.productName,
      curator: id.curator ?? null,
      token,
      amountDisplay: formatTokenAmount(amount, token),
      uiAmount: typeof position.uiAmount === "number" ? position.uiAmount : null,
      valueUsd:
        (typeof position.valueUsd === "number" ? position.valueUsd : null) ??
        (source.unresolvedValueUsd > 0 ? source.unresolvedValueUsd : null) ??
        num(source.recognizedValueUsd),
      positionAddress,
      approvalStatus: "not_vetted",
      approvedDestination: destination.name,
      destinationUrl: destination.url,
      detectionConfidence: confidence,
    };
  }
  return null;
}
