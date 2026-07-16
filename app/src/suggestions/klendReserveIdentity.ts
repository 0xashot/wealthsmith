/**
 * klendReserveIdentity — Step 16H-N.1. Exact identity resolution for the direct Kamino USDC lending
 * candidate (`kamino_usdc_lending`).
 *
 * SCOPE: identity ONLY. This module establishes WHAT the product is. It deliberately does not touch
 * APY, capacity, deposit availability, utilization, risk suitability, or approval — those belong to
 * later market-data and availability adapters, and conflating them is how an identity resolution
 * quietly becomes a product launch.
 *
 * THE FINDING THAT SHAPED THIS MODULE. The obvious resolution — "find the USDC reserve in the SOL/BTC
 * market" — is WRONG. `getReservesByMint(USDC)` returns FOUR reserves in that one market. Mint does
 * not identify a reserve. Three of the four are `status = 2` (Hidden) with zero supply and zero
 * deposit limit; exactly one is `status = 0` (Active). So the disambiguator is mint + ACTIVE, which is
 * deterministic and verifiable rather than a guess. A resolver that took the first match, or assumed
 * uniqueness, would have had a 1-in-4 chance of binding the product to a dead reserve.
 *
 * Every check below fails CLOSED. Nothing here is inferred from a label.
 */

export const KLEND_RESERVE_IDENTITY_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. Canonical constants
 * ------------------------------------------------------------------ */

/** Canonical Solana USDC (Circle). Not bridged, not wrapped. Same mint the Steakhouse work verified. */
export const CANONICAL_SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as const;
export const CANONICAL_USDC_DECIMALS = 6 as const;

/**
 * The KLend program, taken from existing repository evidence rather than retyped:
 * `steakhouseIncidentEvidence.KLEND_VERIFICATION` records it as hash-verified
 * (on_chain_hash === executable_hash === 73f4aef8…, commit 37592174…).
 */
export const KLEND_PROGRAM_ID = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD" as const;

export const SOLANA_MAINNET_CLUSTER = "mainnet-beta" as const;

/** Reserve config `status` values, from the klend Reserve config. 0 is the only usable one. */
export const RESERVE_STATUS_ACTIVE = 0 as const;
export const RESERVE_STATUS_OBSOLETE = 1 as const;
export const RESERVE_STATUS_HIDDEN = 2 as const;

/* ------------------------------------------------------------------ *
 * 2. The immutable identity
 * ------------------------------------------------------------------ */

/**
 * What the product IS. Deliberately excludes every live quantity — APY, utilization, supplied,
 * available liquidity, remaining capacity — because those change every slot and are not identity.
 */
export interface KlendReserveIdentity {
  candidateId: string;
  protocolId: string;
  productType: "direct_lending";
  marketName: string;
  marketAddress: string;
  reserveAddress: string;
  liquidityMint: string;
  collateralMint: string;
  klendProgramId: string;
  cluster: typeof SOLANA_MAINNET_CLUSTER;
  canonicalAsset: "USDC";
  assetDecimals: number;
  sourceProvenance: string;
  identityEvidenceVersion: string;
  identityEvidenceCutoffAt: string;
  identityEvidenceSlot: string;
  invalidationConditions: string[];
}

/**
 * RESOLVED 2026-07-16 at slot 433342218 via the official installed SDK.
 *
 * Resolution chain, every link verified rather than assumed:
 *   KaminoMarket.load(market, KLEND)      -> market loads under the expected program
 *   .loadReserves() / .getReserves()      -> 58 reserves in the SOL/BTC market
 *   .getReservesByMint(USDC)              -> 4 matches (AMBIGUOUS — mint is not an identifier)
 *   filter status === 0 (Active)          -> exactly 1
 *   assert address === expected           -> D6q6wuQS… ✓
 *   assert state.lendingMarket === market -> 7u3HeHxY… ✓
 *   assert liquidity.mintPubkey === USDC  -> EPjFWdd5… ✓
 *   getAccountInfo(reserve).owner         -> KLend2g3c… ✓ (the account is genuinely KLend-owned)
 */
export const SOL_BTC_USDC_RESERVE_IDENTITY: KlendReserveIdentity = {
  candidateId: "kamino_usdc_lending",
  protocolId: "kamino",
  productType: "direct_lending",
  marketName: "SOL/BTC Market",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  liquidityMint: CANONICAL_SOLANA_USDC_MINT,
  collateralMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  klendProgramId: KLEND_PROGRAM_ID,
  cluster: SOLANA_MAINNET_CLUSTER,
  canonicalAsset: "USDC",
  assetDecimals: CANONICAL_USDC_DECIMALS,
  sourceProvenance:
    "Official @kamino-finance/klend-sdk: KaminoMarket.load -> loadReserves -> getReserves -> getReservesByMint(USDC), disambiguated by reserve config status === 0 (Active). Market list from the official GET /v2/kamino-market endpoint. Owning program confirmed by getAccountInfo. No REST reserve-enumeration endpoint was required or used.",
  identityEvidenceVersion: KLEND_RESERVE_IDENTITY_VERSION,
  identityEvidenceCutoffAt: "2026-07-16T20:27:09.000Z",
  identityEvidenceSlot: "433342218",
  invalidationConditions: [
    "the reserve's lendingMarket changes",
    "the reserve's liquidity mint is no longer canonical USDC",
    "the reserve's collateral mint changes",
    "the reserve account's owning program is no longer KLend2g3cP87…",
    "the reserve status leaves Active in a way that makes another USDC reserve in this market Active (which would re-introduce ambiguity)",
    "the KLend program's verified build no longer matches commit 37592174…",
  ],
};

/**
 * The three OTHER USDC reserves in the same market. Recorded because their existence is the reason
 * this resolution is non-trivial, and because a future reader who finds four USDC reserves should not
 * have to rediscover why only one was chosen.
 */
export const SOL_BTC_MARKET_OTHER_USDC_RESERVES = [
  { reserveAddress: "5xXxt9uVHrcT5b1KveAT5ZWgk2f74aDjnLEDDEeAxgpN", status: RESERVE_STATUS_HIDDEN, suppliedUsdc: 0, depositLimitUsdc: 0, excludedBecause: "status = 2 (Hidden), zero supply, zero deposit limit" },
  { reserveAddress: "6pazpY4icuXZ5sb2jMWAqdG4TtbUoY1SJ45237Fjht9h", status: RESERVE_STATUS_HIDDEN, suppliedUsdc: 0, depositLimitUsdc: 0, excludedBecause: "status = 2 (Hidden), zero supply, zero deposit limit" },
  { reserveAddress: "AWnKJ9dsiHcoDCThxE5E93ikDTAXkApoNwrKM2tp9KFJ", status: RESERVE_STATUS_HIDDEN, suppliedUsdc: 182, depositLimitUsdc: 100000, excludedBecause: "status = 2 (Hidden) despite a small non-zero supply — Hidden reserves are not selectable regardless of balance" },
] as const;

/* ------------------------------------------------------------------ *
 * 3. Fail-closed resolver
 * ------------------------------------------------------------------ */

export type IdentityResolutionFailure =
  | "market_address_mismatch"
  | "reserve_address_mismatch"
  | "reserve_not_in_market"
  | "liquidity_mint_not_canonical_usdc"
  | "collateral_mint_unresolved"
  | "program_id_mismatch"
  | "cluster_mismatch"
  | "ambiguous_reserve_match"
  | "no_active_reserve_match"
  | "missing_account_data";

export interface ResolverCandidateReserve {
  reserveAddress: string;
  lendingMarket: string;
  liquidityMint: string;
  collateralMint: string | null;
  ownerProgram: string | null;
  status: number;
}

export interface ResolverInputs {
  expectedMarketAddress: string;
  expectedReserveAddress: string;
  expectedProgramId: string;
  cluster: string;
  /** Everything getReservesByMint(USDC) returned for the market — ambiguity included. */
  mintMatchedReserves: ResolverCandidateReserve[];
}

export type IdentityResolutionResult =
  | { resolved: true; identity: KlendReserveIdentity }
  | { resolved: false; failure: IdentityResolutionFailure; detail: string };

/**
 * Pure and deterministic — the caller supplies what the SDK returned; this decides.
 *
 * Order matters. Cluster and program are checked before anything is read out of the candidate set,
 * so a wrong-network or wrong-program result can never be partially trusted. Ambiguity is resolved
 * ONLY by Active status, never by "take the first" or "take the biggest".
 */
export function resolveKlendReserveIdentity(i: ResolverInputs): IdentityResolutionResult {
  const fail = (failure: IdentityResolutionFailure, detail: string): IdentityResolutionResult => ({ resolved: false, failure, detail });

  if (i.cluster !== SOLANA_MAINNET_CLUSTER) return fail("cluster_mismatch", `expected ${SOLANA_MAINNET_CLUSTER}, got ${i.cluster}`);
  if (i.expectedProgramId !== KLEND_PROGRAM_ID) return fail("program_id_mismatch", `expected ${KLEND_PROGRAM_ID}`);
  if (i.expectedMarketAddress !== SOL_BTC_USDC_RESERVE_IDENTITY.marketAddress) return fail("market_address_mismatch", `expected ${SOL_BTC_USDC_RESERVE_IDENTITY.marketAddress}`);
  if (!i.mintMatchedReserves || i.mintMatchedReserves.length === 0) return fail("missing_account_data", "the SDK returned no reserves for the mint");

  // Mint is NOT an identifier here — four USDC reserves exist in this market. Active is the disambiguator.
  const active = i.mintMatchedReserves.filter((r) => r.status === RESERVE_STATUS_ACTIVE);
  if (active.length === 0) return fail("no_active_reserve_match", `${i.mintMatchedReserves.length} USDC reserve(s) matched, none Active`);
  if (active.length > 1) return fail("ambiguous_reserve_match", `${active.length} ACTIVE USDC reserves matched — identity is not unique and must not be guessed`);

  const r = active[0];
  if (r.reserveAddress !== i.expectedReserveAddress) return fail("reserve_address_mismatch", `resolved ${r.reserveAddress}, expected ${i.expectedReserveAddress}`);
  if (r.lendingMarket !== i.expectedMarketAddress) return fail("reserve_not_in_market", `reserve belongs to ${r.lendingMarket}`);
  if (r.liquidityMint !== CANONICAL_SOLANA_USDC_MINT) return fail("liquidity_mint_not_canonical_usdc", `liquidity mint is ${r.liquidityMint}`);
  if (!r.collateralMint) return fail("collateral_mint_unresolved", "collateral/cToken mint could not be resolved");
  if (!r.ownerProgram) return fail("missing_account_data", "reserve account owner could not be read");
  if (r.ownerProgram !== KLEND_PROGRAM_ID) return fail("program_id_mismatch", `reserve account is owned by ${r.ownerProgram}`);

  return { resolved: true, identity: SOL_BTC_USDC_RESERVE_IDENTITY };
}

/** The exact inputs the live SDK returned at the evidence slot, so the resolution is re-runnable. */
export const SOL_BTC_RESOLVER_INPUTS: ResolverInputs = {
  expectedMarketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  expectedReserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  expectedProgramId: KLEND_PROGRAM_ID,
  cluster: SOLANA_MAINNET_CLUSTER,
  mintMatchedReserves: [
    { reserveAddress: "5xXxt9uVHrcT5b1KveAT5ZWgk2f74aDjnLEDDEeAxgpN", lendingMarket: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF", liquidityMint: CANONICAL_SOLANA_USDC_MINT, collateralMint: "DyoQfufdQ7", ownerProgram: KLEND_PROGRAM_ID, status: RESERVE_STATUS_HIDDEN },
    { reserveAddress: "6pazpY4icuXZ5sb2jMWAqdG4TtbUoY1SJ45237Fjht9h", lendingMarket: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF", liquidityMint: CANONICAL_SOLANA_USDC_MINT, collateralMint: "HDrCjxSfrN", ownerProgram: KLEND_PROGRAM_ID, status: RESERVE_STATUS_HIDDEN },
    { reserveAddress: "AWnKJ9dsiHcoDCThxE5E93ikDTAXkApoNwrKM2tp9KFJ", lendingMarket: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF", liquidityMint: CANONICAL_SOLANA_USDC_MINT, collateralMint: "8EFj1QBADs", ownerProgram: KLEND_PROGRAM_ID, status: RESERVE_STATUS_HIDDEN },
    { reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59", lendingMarket: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF", liquidityMint: CANONICAL_SOLANA_USDC_MINT, collateralMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D", ownerProgram: KLEND_PROGRAM_ID, status: RESERVE_STATUS_ACTIVE },
  ],
};

export function getSolBtcUsdcIdentityResolution(): IdentityResolutionResult {
  return resolveKlendReserveIdentity(SOL_BTC_RESOLVER_INPUTS);
}

/* ------------------------------------------------------------------ *
 * 4. Diagnostic snapshot — explicitly NOT identity
 * ------------------------------------------------------------------ */

/**
 * Live state at the resolution slot, kept for diagnostic context ONLY.
 *
 * The task is explicit that Active/emergencyMode may be recorded for context but must never become
 * permanent identity truth — so these live here, outside `KlendReserveIdentity`, and nothing consumes
 * them for eligibility. `status` appears in BOTH places for different reasons: in the resolver it is
 * the disambiguator at resolution time; here it is a snapshot that will age.
 */
export const SOL_BTC_USDC_RESERVE_DIAGNOSTIC_SNAPSHOT = {
  atSlot: "433342218",
  atTime: "2026-07-16T20:27:09.000Z",
  status: RESERVE_STATUS_ACTIVE,
  emergencyMode: 0,
  reservesInMarket: 58,
  usdcReservesInMarket: 4,
  activeUsdcReservesInMarket: 1,
  isSnapshotNotIdentity: true,
  note: "Diagnostic only. These values change every slot and are NOT identity. Deposit availability, utilization, capacity and APY are all deliberately absent — they belong to market-data and availability adapters that do not exist yet.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. Blocker supersession
 * ------------------------------------------------------------------ */

/**
 * The historical blocker is preserved verbatim, not rewritten. It was CORRECT about what it examined —
 * Kamino publishes no REST endpoint enumerating a market's reserves, and that is still true today. Its
 * error was scope: it treated "no REST endpoint" as "no official source", when the officially
 * published SDK — already installed in this repository at the time — exposes first-class reserve
 * enumeration. The lesson is the recurring one in this project: absence in the place you looked is not
 * absence.
 */
export const IDENTITY_BLOCKER_SUPERSESSION = {
  priorBlocker: {
    recordedIn: "yieldStrategyRegistry.ts (kamino_usdc_lending notes), 16H-H",
    statement:
      "16H-H: the official markets endpoint (GET /v2/kamino-market, checked 2026-07-16) returns 34 lending MARKETS with their addresses, but Kamino documents NO endpoint that lists a market's reserves or their addresses. The product here is the USDC RESERVE, not the market. Writing a market address into `address` would place the wrong identifier in the product-identity field purely to satisfy the adapter, so this stays undefined. Blocker: resolve the exact USDC reserve address from an official source.",
    stillTrueInPart: "Yes — no REST endpoint enumerates reserves. That specific observation was accurate and is not withdrawn.",
    whereItWentWrong: "It generalised 'no REST endpoint' to 'no official source'. The official @kamino-finance/klend-sdk — already a dependency — enumerates reserves directly.",
    preserved: true,
  },
  supersededBy: {
    resolverVersion: KLEND_RESERVE_IDENTITY_VERSION,
    sdkMethodsUsed: ["getMarketsFromApi (via GET /v2/kamino-market)", "KaminoMarket.load", "loadReserves", "getReserves", "getReservesByMint"],
    resolvedMarket: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF (SOL/BTC Market)",
    resolvedReserve: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
    evidenceSlot: "433342218",
    evidenceTimestamp: "2026-07-16T20:27:09.000Z",
    sourceProvenance: "official installed SDK + official market endpoint + on-chain getAccountInfo",
    disambiguationRequired: "getReservesByMint(USDC) returned FOUR reserves in this market; three are status = 2 (Hidden) with no deposit limit. Exactly one is Active. Mint alone is not an identifier here.",
  },
  lifecycleTransition: {
    from: "documentation_required",
    to: "identity_verified",
    valueAlreadyExistsInRepository: true,
    precedent: "kamino_steakhouse_usdc used exactly this transition at 16H-H after its identity was resolved.",
    noNewLifecycleValueInvented: true,
    note: "The registry declares `lifecycle` as a field; the repository has no lifecycle transition VALIDATOR (unlike riskGovernance's review-state machine). The transition is therefore justified by the existing value set and the Steakhouse precedent, not by a validator.",
  },
} as const;

/* ------------------------------------------------------------------ *
 * 6. Governance records (no scoring)
 * ------------------------------------------------------------------ */

/**
 * Product-owner clarification, transcribed. NOT a score, and NOT a rubric amendment — rubric
 * protocol_risk_rubric_v1@1.0.0 and its hash are untouched.
 */
export const MANAGER_DISCRETION_APPLICABILITY = {
  rubricId: "protocol_risk_rubric_v1",
  rubricVersion: "1.0.0",
  rubricAmended: false,
  dimension: "manager_discretion" as const,
  applicableToDirectLending: true,
  notApplicable: false,
  evaluates: "discretionary authority over material economic and risk parameters AFTER deposit",
  relevantEvidence: [
    "absence of a KVault allocation manager (the direct product has no allocation admin at all)",
    "exact KLend market-owner powers",
    "reserve-config mutability",
    "fee and borrow-curve mutability",
    "deposit/borrow cap mutability",
    "oracle-config mutability",
    "collateral and liquidation parameter mutability",
    "authority threshold",
    "authority timelock",
    "restrictions and emergency powers",
  ],
  note: "Removing KVault removes the allocation admin, but the market owner retains broad discretion over the reserve a depositor sits in. 'No manager' would be the wrong reading — the manager changed identity, not existence. No score is assigned here.",
} as const;

/**
 * Non-blocking, recorded for future selector/diversification logic. Does not affect identity and adds
 * no selector behaviour.
 */
export const SHARED_RISK_RELATIONSHIP = {
  directCandidate: "kamino_usdc_lending",
  relatedProduct: "kamino_steakhouse_usdc",
  sharedMarket: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF (SOL/BTC Market)",
  sharedReserve: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  relationship:
    "The selected direct reserve is the SAME reserve carrying 87.61% of Steakhouse's allocation at the last verified read. Direct lending removes KVault-specific layers (allocation admin, KVault upgrade/admin authorities, the unaudited CPI layer, the zero-buffer policy). It does NOT create independent protocol or market diversification relative to Steakhouse — both would sit on the same KLend market, the same reserve, the same market owner, the same emergency council and the same oracle.",
  createsDiversificationVsSteakhouse: false,
  isBlocking: false,
  affectsIdentityResolution: false,
  forFutureSelectorLogic: true,
  note: "If both products are ever approved, treating them as two independent Stable Yield options would overstate diversification. Recorded now so that logic can consume it later; no selector behaviour is added here.",
} as const;

/* ------------------------------------------------------------------ *
 * 7. What identity resolution does NOT do
 * ------------------------------------------------------------------ */

export const IDENTITY_RESOLUTION_CONFERS = {
  apyResolved: false,
  capacityResolved: false,
  depositAvailabilityResolved: false,
  withdrawalAvailabilityResolved: false,
  marketDataEvaluated: false,
  eligibilityEvaluated: false,
  riskScoreAssigned: false,
  humanReviewPerformed: false,
  riskSignoffCompleted: false,
  productApproved: false,
  selectorIntegrated: false,
  rendersCard: false,
  topPick: false,
  transactionsEnabled: false,
  demoChanged: false,
  steakhouseRecognitionChanged: false,
  solStakingChanged: false,
  note: "Knowing exactly what a product IS tells you nothing about whether it is safe, available, or worth recommending. Every one of these remains false.",
} as const;

/** Deterministic manifest over the identity, following the repository's FNV-1a convention. */
export function computeIdentityManifestHash(id: KlendReserveIdentity = SOL_BTC_USDC_RESERVE_IDENTITY): string {
  const material = JSON.stringify({
    c: id.candidateId, t: id.productType, m: id.marketAddress, r: id.reserveAddress,
    lm: id.liquidityMint, cm: id.collateralMint, p: id.klendProgramId, cl: id.cluster,
    d: id.assetDecimals, v: id.identityEvidenceVersion, s: id.identityEvidenceSlot,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `identity_${h.toString(16).padStart(8, "0")}`;
}

export const SOL_BTC_USDC_IDENTITY_MANIFEST_HASH = computeIdentityManifestHash();
