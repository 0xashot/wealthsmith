/**
 * jupiterLendUsdcRiskEvidencePackage — Step 16H-R.1. Canonical risk-evidence package for the exact
 * Jupiter Lend native USDC supply product.
 *
 * READINESS: not_ready_for_automated_assessment.
 *
 * NOT because Jupiter is an alternative and not because its APY is higher. Because the evidence class
 * required to score four dimensions DOES NOT EXIST for the deployed binaries:
 *
 *   • NEITHER live program is a verified build. verify.osec.io returns is_verified: false for both.
 *     (Kamino's KLend returns is_verified: TRUE with matching on-chain and executable hashes.)
 *   • NO on-chain Anchor IDL exists for the lending program.
 *   • The Code4rena-audited commit's declare_id! values are NOT deployed on mainnet.
 *   • The public repo's last push is 2026-02-11; the live liquidity program deployed 2026-07-16.
 *
 * The consequence is not "the audit is stale". It is that the deployed instruction set cannot be read
 * at all. For Kamino the supplier loss waterfall was derived by reading `socialize_loss` in deployed
 * Rust with its `has_one` constraint. For Jupiter there is no source, no IDL and no verified build —
 * so the loss waterfall, the privileged-power map and the deployed withdrawal semantics cannot be
 * traced without guessing. Section 13 makes the loss waterfall mandatory for readiness. It is absent.
 *
 * THE SINGLE MOST IMPORTANT FACT: the liquidity program holding ~428.6M USDC of supplier funds was
 * deployed 2026-07-16 — approximately 33 HOURS before this package's cutoff.
 *
 * NO SCORES. NO AGGREGATE. The preparer is not the scorer. Nothing here is comparison-adjusted, and
 * Kamino's 5.93 is neither a floor nor a target.
 */
import { computeRubricV1Hash, PROTOCOL_RISK_RUBRIC_V1_ID, PROTOCOL_RISK_RUBRIC_V1_SEMVER } from "./riskGovernance";

export const JUP_PACKAGE_ID = "jupiter_lend_usdc_risk_evidence_package_v1" as const;
export const JUP_PACKAGE_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. Exact product identity
 * ------------------------------------------------------------------ */

export const JUP_PRODUCT_BINDING = {
  candidateId: "jupiter_lend_usdc",
  candidateIdIsProvisional: false,
  candidateIdNote: "Provisional at task start; the exact product is now bound to accounts below, so the ID is canonical for this package.",
  productName: "Jupiter Lend — Earn (jlUSDC)",
  productType: "direct_lending",
  protocol: "Jupiter Lend (Fluid architecture, Instadapp lineage)",
  liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  receiptTokenMint: "9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D",
  receiptTokenSymbol: "jlUSDC",
  receiptTokenDecimals: 6,
  receiptTokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  receiptTokenFreezeAuthority: null,
  receiptTokenFreezeAuthorityNote: "VERIFIED absent — no freeze authority on jlUSDC. A genuine favorable fact.",
  poolAccount: "5nmGjA4s7ATzpBQXC5RNceRpaJ7pYw2wKsNBWyuSAZV6",
  poolAccountNote: "The jlUSDC mint authority IS the pool account (431B, discriminator 2a0821dca328d205), owned by the lending program. Identity is bound by this chain, not by symbol or URL.",
  cluster: "mainnet-beta",
  assetDecimals: 6,
  singleUsdcPool: true,
  singleUsdcPoolEvidence: "The official earn/tokens API returns exactly ONE entry with assetAddress = canonical USDC (id 2, jlUSDC). Seven earn tokens exist (JupUSD, USDC, WSOL, USDT, EURC, USDG, USDS); only one is canonical USDC.",
  identityNotEstablishedBy: ["the USDC mint alone", "the jlUSDC symbol alone", "an app URL", "a display name", "an APY value"],
  identityEstablishedBy: "jlUSDC mint → mintAuthority = pool account 5nmGjA4s… → owned by lending program jup3YeL8… → pool references liquidity program jupeiUmn… at data offset 40",
  evidenceCutoff: "2026-07-17T12:40:00.000Z",
  observedAtSlot: 433483033,
  packageVersion: JUP_PACKAGE_VERSION,
  preparerId: "claude_automated_evidence_preparer",
  preparationRole: "evidence_preparer" as const,
  preparerIsNotScorer: true,
  rubricId: PROTOCOL_RISK_RUBRIC_V1_ID,
  rubricVersion: PROTOCOL_RISK_RUBRIC_V1_SEMVER,
  rubricHash: computeRubricV1Hash(),
  confidencePolicyId: "risk_review_confidence_v2",
  separationOfDutiesId: "risk_separation_of_duties_v2",
} as const;

export type JupIdentityFailure = "candidate_mismatch" | "liquidity_mint_mismatch" | "receipt_mint_mismatch" | "pool_mismatch" | "cluster_mismatch";

export function validateJupBinding(i: { candidateId: string; liquidityMint: string; receiptTokenMint: string; poolAccount: string; cluster: string }): { ok: boolean; failure?: JupIdentityFailure } {
  const b = JUP_PRODUCT_BINDING;
  if (i.candidateId !== b.candidateId) return { ok: false, failure: "candidate_mismatch" };
  if (i.liquidityMint !== b.liquidityMint) return { ok: false, failure: "liquidity_mint_mismatch" };
  if (i.receiptTokenMint !== b.receiptTokenMint) return { ok: false, failure: "receipt_mint_mismatch" };
  if (i.poolAccount !== b.poolAccount) return { ok: false, failure: "pool_mismatch" };
  if (i.cluster !== "mainnet-beta") return { ok: false, failure: "cluster_mismatch" };
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * 2. Deployed-program graph
 * ------------------------------------------------------------------ */

export interface JupProgramNode {
  programId: string;
  role: string;
  programDataAccount: string;
  programDataPointerMatchesDerivation: boolean;
  deployedSlot: number;
  deployedAt: string;
  ageAtCutoff: string;
  upgradeable: boolean;
  upgradeAuthority: string;
  authorityIsOnCurve: boolean;
  verifiedBuild: "exact_verified" | "public_source_does_not_match_live_binary" | "unresolved";
  verifiedBuildEvidence: string;
  onChainIdl: boolean;
  supplierPrincipalDependsOnIt: boolean;
}

/**
 * `jup3YeL8…` is NOT the whole product — proven, not assumed. The lending program owns only 10 accounts
 * and its USDC pool references the liquidity program at data offset 40. Supplier funds live in the
 * liquidity layer.
 */
export const JUP_PROGRAM_GRAPH: JupProgramNode[] = [
  {
    programId: "jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9",
    role: "lending / earn — owns the USDC pool account, mints and burns jlUSDC, holds share accounting",
    programDataAccount: "3zB5SLYJoqDPN21s54MCkLeDPuMKQH9vNCSaZKSWTZZd",
    programDataPointerMatchesDerivation: true,
    deployedSlot: 430476341,
    deployedAt: "2026-07-03",
    ageAtCutoff: "~14.4 days",
    upgradeable: true,
    upgradeAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ",
    authorityIsOnCurve: false,
    verifiedBuild: "public_source_does_not_match_live_binary",
    verifiedBuildEvidence: "verify.osec.io/status → is_verified: false, 'On chain program not verified', empty on_chain_hash, empty repo_url, empty commit, last_verified_at: null.",
    onChainIdl: false,
    supplierPrincipalDependsOnIt: true,
  },
  {
    programId: "jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC",
    role: "liquidity layer — HOLDS SUPPLIER FUNDS (~428.6M USDC), enforces the dynamic withdrawal limiter",
    programDataAccount: "J6Ry5yuy4Vp4kNa1PTGASiHJxZ8x4pgRPaJ18SmnqtW5",
    programDataPointerMatchesDerivation: true,
    deployedSlot: 433199003,
    deployedAt: "2026-07-16",
    ageAtCutoff: "~32.7 HOURS",
    upgradeable: true,
    upgradeAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ",
    authorityIsOnCurve: false,
    verifiedBuild: "public_source_does_not_match_live_binary",
    verifiedBuildEvidence: "verify.osec.io/status → is_verified: false. An on_chain_hash IS present (9ef3ee751b8a96901bc773bf0a91df21803aee4de535e74b3ca8a2af509cde50) but executable_hash is EMPTY and no repo/commit is recorded — i.e. nothing to compare it against.",
    onChainIdl: false,
    supplierPrincipalDependsOnIt: true,
  },
];

export const PROGRAM_GRAPH_FINDINGS = {
  materialProgramCount: 2,
  jup3YeL8IsNotTheWholeProduct: true,
  proofItIsNotTheWholeProduct: "The lending program owns only 10 accounts, and the USDC pool account (5nmGjA4s…) references executable program jupeiUmn… at data offset 40. Supplier funds are held by the liquidity layer, not the lending program.",
  bothProgramsShareOneUpgradeAuthority: true,
  sharedAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ",
  sharedAuthorityMeaning: "The 4-of-8 / 12h claim DOES generalize across both material programs — verified per-program, not assumed. One multisig can upgrade both the share accounting and the vault holding the funds.",
  graphMayBeIncomplete: true,
  graphIncompletenessNote:
    "Only the deposit/redeem path was traced from the pool account. Oracle, rewards, flash-loan and liquidation programs named in the Code4rena scope were NOT located on-chain, and without an IDL or source their live IDs cannot be enumerated. The graph is a LOWER BOUND of 2, not a complete map.",
  liquidityBinaryAgeIsTheHeadline:
    "The program holding ~428.6M USDC of supplier funds was deployed ~33 hours before this cutoff. That is the single most material maturity fact in this package.",
} as const;

/* ------------------------------------------------------------------ *
 * 3. Source-to-binary linkage — the blocking finding
 * ------------------------------------------------------------------ */

export const SOURCE_TO_BINARY = {
  code4renaAuditedCommitMapsToAnyLiveProgram: false,
  code4renaEvidence: {
    contest: "Code4rena — Jupiter Lend, 2026-02-12 → 2026-03-13, $107,000 USDC",
    repository: "https://github.com/Instadapp/fluid-solana-programs",
    repositoryIsPublic: true,
    auditedCommit: "626b177f235224bc5d074d39439cd2558f542886",
    auditedCommitExistsPublicly: true,
    auditedCommitDate: "2026-02-11T06:01:51Z",
    repoLastPush: "2026-02-11T06:02:03Z",
    declaredIdsInAuditedCommit: {
      liquidity: "5uDkCoM96pwGYhAUucvCzLfm5UcjVRuxz6gH81RnRBmL",
      lending: "7tjE28izRUjzmxC1QNXnNwcc4N82CNYCexf3k8mw67s3",
      oracle: "C59ahnV7xHuW1Q9E87yrYbCHMHaYnkqRdix8BfLp3vnk",
    },
    declaredIdsDeployedOnMainnet: false,
    declaredIdsEvidence: "getAccountInfo returns NO ACCOUNT for all three declared IDs. They are not deployed.",
    liveIdsAppearInAuditedSource: false,
    scopeNSloc: 15195,
    modulesInScope: ["Liquidity", "Lending", "Vaults", "Oracle", "Flash Loan", "Lending Reward Rate Model"],
    findingsPublic: false,
    findingsNote: "C4 states 'Since this audit includes live/deployed code, all submissions will be treated as sensitive' with restricted visibility, and code was removed from the C4 repo at sponsor request. Severity counts and remediation status were NOT located.",
  },
  liveJulyBinaryHasPublicSource: false,
  liveBinaryEvidence:
    "The public repo's last push is 2026-02-11. The lending program deployed 2026-07-03 and the liquidity program 2026-07-16. Five months of development are not visible, and neither live program ID appears in the audited source.",
  laterPrivateChangesVisible: false,
  currentDeployedSurfaceCanBeIndependentlyReviewed: false,
  cannotReviewEvidence:
    "No verified build (both is_verified: false), no on-chain Anchor IDL (derived IDL PDA 4MMywqnHRVPrwuWB8Sen1pCNkXxhJVAVf5KRfTzK3zPV does not exist), and no public source matching the live IDs. The deployed instruction set cannot be enumerated by any available means.",
  contrastWithKamino:
    "Kamino's KLend returns is_verified: TRUE from verify.osec.io with on_chain_hash == executable_hash (73f4aef8ce9ee13bc60ae0d3c5bed1c1499bda5356a3370c993aeda70d659505). Kamino's audit-linkage gap is that audit COMMITS are private; Jupiter's gap is that the deployed BINARY itself is unverifiable. These are different severities of the same dimension, and this is a factual contrast, not a ranking.",
  classificationPerProgram: "public_source_does_not_match_live_binary (both)",
} as const;

export const FLUID_CONTINUITY = {
  classification: "C_private_continuation_of_a_public_audited_design" as const,
  reasoning:
    "The audited public commit exists and is real, but its declared program IDs are not deployed, the live IDs are absent from the audited source, and the public repo predates both live deployments by five months. That is a private continuation of a public audited design — not 'exact source deployed unchanged' (A) and not a fork with verifiable public modifications (B).",
  accountLayoutContinuity: "UNRESOLVED — cannot be compared without live source or an IDL.",
  instructionContinuity: "UNRESOLVED — same reason.",
  deployedBinaryContinuity: "NONE established.",
  privateCodeGap: "~5 months (2026-02-11 → 2026-07-16), spanning both live deployments.",
  ethereumFluidMaturityDoesNotTransfer:
    "Fluid's Ethereum operating history is evidence about a DIFFERENT codebase on a DIFFERENT runtime. It may support architecture maturity; it is not deployed-program operating history for these Solana binaries, and it is not counted as such.",
  designLineageIsNotBinaryProvenance: true,
} as const;

/* ------------------------------------------------------------------ *
 * 4. Lender claim + withdrawal limiter (API-observed)
 * ------------------------------------------------------------------ */

export const LENDER_CLAIM = {
  receiptModel: "share token (jlUSDC), NOT 1:1 with USDC",
  oneToOneAssumed: false,
  observedShareRate: 1.051795,
  observedShareRateSource: "official earn/tokens API convertToAssets = 1051795 (6dp)",
  totalAssets: "429642846000607",
  totalAssetsTokens: 429_642_846.000607,
  totalSupplyShares: "408485344255913",
  shareValueCanDecline: "UNRESOLVED — the accounting formula is not readable from deployed source. Whether bad debt reduces convertToAssets, and by what path, is exactly the loss-waterfall gap below.",
  jlUsdcTransferable: "likely (no freeze authority, classic SPL mint) — but transfer restrictions enforced by the PROGRAM cannot be ruled out without the instruction set.",
  exchangeRateFormula: "UNRESOLVED — numerator/denominator, interest accrual, fee deduction and rounding are all API-reported, not derived from deployed code.",
  apiIsNotAnAccountingAuthority:
    "convertToAssets is an API-reported figure. Unlike Kamino — where the exchange rate was re-derived from deployed Rust (floor(c × total_supply / mint_total_supply)) — nothing here was independently reproduced from program state.",
} as const;

/** Fluid's dynamic withdrawal limiter — a control class Kamino does not have. */
export const WITHDRAWAL_LIMITER = {
  exists: true,
  source: "official earn/tokens API → liquiditySupplyData",
  observed: {
    supply: "428594845410725",
    supplyTokens: 428_594_845.411,
    withdrawalLimit: "214297422705363",
    withdrawalLimitTokens: 214_297_422.705,
    withdrawalLimitPctOfSupply: 50.0,
    expandPercent: 5000,
    expandPercentMeaning: "50%",
    expandDuration: 21600,
    expandDurationMeaning: "6 hours",
    baseWithdrawalLimit: "8265641922400",
    baseWithdrawalLimitTokens: 8_265_641.922,
    withdrawableUntilLimit: "214297422705362",
    withdrawable: "64384392677383",
    withdrawableTokens: 64_384_392.677,
    decayAmount: "19958385017",
    decayEndTimestamp: "1784295141",
    rebalanceDifference: "-13183583978422",
  },
  headlineFinding:
    "ACTUAL withdrawable is ~64.38M against a supply of ~428.59M — about 15%. The 50% withdrawalLimit is not the binding constraint; `withdrawable` is. A supplier cannot assume the pool's size is their exit.",
  semanticsUnresolved:
    "expandPercent / expandDuration / baseWithdrawalLimit / decay describe an algorithmic rate limiter that expands over time. Its exact deployed semantics — how the limit recomputes, what resets it, whether an authority can tighten it instantly — are NOT readable without source or an IDL.",
  materiallyDifferentFromKamino:
    "Kamino's limit is a pure liquidity fact: freely_available = total_available − queued, derived from deployed Rust. Jupiter adds an ALGORITHMIC RATE LIMITER on top of liquidity. That is an additional control surface whose semantics are unverified.",
  currentLiquidityIsNotGuaranteed: true,
} as const;

export const APY_AND_REWARDS = {
  observedSupplyRate: 343,
  observedSupplyRateMeaning: "3.43%",
  observedRewardsRate: 70,
  observedRewardsRateMeaning: "0.70%",
  observedTotalRate: 413,
  observedTotalRateMeaning: "4.13%",
  scoutingClaimWas: "3.44% base + 0.70% rewards = 4.14%",
  reverifiedAs: "3.43% + 0.70% = 4.13% — the scouting figures drifted by 0.01pp; rates are live and move.",
  unitSemanticsUnresolved: "Whether these are APR or APY, and the compounding convention, are NOT documented in the API response and NOT derivable without source. Kamino's equivalent required reading calculateAPYFromAPR from SDK source to establish.",
  rewardsContradiction:
    "UNRESOLVED CONTRADICTION: rewardsRate reports 70 (0.70%) while the `rewards` array is EMPTY ([]). The reward source, mint, emission schedule and exhaustion cannot be established. For Kamino the equivalent question was resolved by opening the farm state and proving exhaustion on four independent grounds.",
  apyIsNotFavorableRiskEvidence: "A higher rate is not evidence of lower risk and is not used as such anywhere in this package.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. The blocking gaps
 * ------------------------------------------------------------------ */

export const LOSS_WATERFALL = {
  resolved: false,
  mandatoryForReadiness: true,
  whyUnresolved:
    "Tracing the insolvency path requires the deployed instruction set: which authority recognizes bad debt, whether protocol reserves absorb first, whether losses reduce the lender exchange rate, whether they are market-isolated or protocol-wide, and whether principal can be written down. NONE of that is readable — no verified build, no IDL, no public source for the live binaries.",
  kaminoContrast:
    "For Kamino this was fully resolved from deployed Rust: socialize_loss with a has_one lending_market_owner constraint, effective control 4-of-10 + 12h, emergency council excluded. The equivalent evidence for Jupiter does not exist in any accessible form.",
  cannotBeSubstituted: "API fields, UI copy and Fluid's Ethereum documentation are not the deployed Solana instruction set and cannot stand in for it.",
} as const;

export const COLLATERAL_UNIVERSE = {
  resolved: false,
  partialObservation: "The official borrow/vaults API returns borrow vaults; the first entry (id 1, nMzVs8GiXMVUENEwkev7JZfDcCENmz18ScheeVRdnb1) has supplyToken WSOL. The full universe was NOT enumerated and per-market parameters were not extracted.",
  unresolved: [
    "the complete eligible collateral set that can borrow against this USDC liquidity",
    "collateral factors, liquidation thresholds and penalties per market",
    "debt ceilings, borrow caps, isolation mode",
    "whether losses in any collateral market reach jlUSDC suppliers",
  ],
  isolationUnresolved:
    "Whether Jupiter Lend uses isolated borrow markets or a shared liquidity layer is the decisive question for a USDC supplier, and it is UNRESOLVED. The architecture's name ('liquidity layer', one program holding all supply) SUGGESTS shared liquidity across markets — which would mean bad debt in any market could reach all jlUSDC holders — but suggestion is not evidence, and this must not be inferred from naming or UI grouping.",
  concentrationUnresolved: true,
} as const;

export const ORACLE_SURFACE = {
  resolved: false,
  usdcPricing: "UNRESOLVED — no oracle account was bound to the USDC pool.",
  collateralOracles: "UNRESOLVED — the collateral universe itself is unenumerated, so its oracle paths cannot be mapped.",
  oracleProgram: "The Code4rena scope names an Oracle module and the audited commit declares C59ahnV7… — which is NOT deployed. The live oracle program was not located.",
  providerUnknown: "Whether pricing derives from Pyth, Switchboard, Chainlink, DEX prices, Jupiter's price API or an adapter is UNRESOLVED.",
  usdcPricingDoesNotSubstitute: "Even had USDC pricing been resolved, it would not substitute for collateral-side oracle evidence — the supplier's dominant exposure.",
} as const;

export const PRIVILEGED_POWER_MAP = {
  resolved: false,
  whyUnresolved: "Enumerating pause, limit, rate, oracle, collateral, migration, reserve-withdrawal, write-down and upgrade instructions requires the deployed instruction set. No IDL, no verified build, no matching public source.",
  whatIsKnown: [
    "both material programs are upgradeable by a single shared authority 4MsgBB5… (verified per-program)",
    "a dynamic withdrawal limiter exists and is enforced somewhere in the liquidity program",
    "jlUSDC has NO freeze authority (verified) — one narrow power that provably does not exist",
  ],
  emergencyControlsUnresolved: "Who can pause deposits or withdrawals, whether an authority can freeze exits immediately, and whether any timelock applies to such an action are all UNRESOLVED.",
} as const;

export const INCIDENT_EVIDENCE = {
  resolved: false,
  searchPerformed: "limited — official Code4rena listing and Jupiter documentation only",
  zeroIdentifiedIsNotACleanRecord:
    "No incidents were identified. That is a SEARCH RESULT over a narrow source set, not proof of a clean record, and it is not recorded as one.",
  scopeSeparationRequired: ["Fluid on another chain", "Jupiter Lend on Solana", "the current live programs", "the audited development version", "upstream dependencies", "unrelated Jupiter products"],
  currentBinaryScope: "The liquidity binary is ~33 hours old. No incident record of any kind can exist for it yet, favorable or otherwise. Absence of history is not absence of risk.",
  auditFindingsNotPublic: "Code4rena findings were treated as sensitive; severity counts and remediation status were not located, so audit findings that resemble live risk could not be reviewed.",
} as const;

/* ------------------------------------------------------------------ *
 * 6. Twelve-dimension evidence map
 * ------------------------------------------------------------------ */

export type JupReadiness = "complete" | "partial" | "weak" | "insufficient";

export interface JupDimensionEvidence {
  dimensionId: string;
  weight: number;
  applicability: "directly_applicable" | "reserve_specific_evidence_required" | "ambiguous" | "not_applicable";
  readiness: JupReadiness;
  scoreable: boolean;
  evidenceRefs: string[];
  favorableFacts: string[];
  unfavorableFacts: string[];
  limitations: string[];
  unresolvedQuestions: string[];
  confidenceCeiling: "high" | "medium" | "low";
  scorerInstructions: string;
  prohibitedInferences: string[];
  invalidationTriggers: string[];
}

export const JUP_DIMENSION_EVIDENCE: JupDimensionEvidence[] = [
  {
    dimensionId: "audit_security", weight: 15, applicability: "directly_applicable",
    readiness: "insufficient", scoreable: false,
    evidenceRefs: ["SOURCE_TO_BINARY", "JUP_PROGRAM_GRAPH"],
    favorableFacts: ["a real Code4rena contest ran (2026-02-12 → 2026-03-13, $107k) against a PUBLIC repo and a PUBLIC commit that exists — a structurally better starting position than private-commit audits", "CORRECTED AT 16H-S.0 (was 'Zenith and Offside audits are reported'): SEVEN audit reports exist per Jupiter's official security page — Zenith (Jul 2025), Offside Labs (Jul, Aug, Oct 2025), MixBytes (Oct 2025), OtterSec (Nov 2025 ×2) — plus the Code4rena contest", "(added at 16H-S.0) a live OOOsec bug bounty: $500k critical cap, ~4 months old, 25 resolved reports, $45.2k paid — no critical-sized payout observed"],
    unfavorableFacts: [
      "NEITHER live program is a verified build — verify.osec.io returns is_verified: false for both",
      "the audited commit's declare_id! values are NOT deployed on mainnet",
      "the live program IDs do not appear in the audited source",
      "the public repo's last push (2026-02-11) predates both live deployments by ~5 months",
      "no on-chain Anchor IDL exists",
      "Code4rena findings are sensitive/withheld — severity counts and remediation status unavailable",
    ],
    limitations: ["the deployed surface cannot be independently reviewed by any available means"],
    unresolvedQuestions: ["what code is actually running", "what the audit found and whether it was remediated"],
    confidenceCeiling: "low",
    scorerInstructions: "DO NOT SCORE. An anchor cannot be selected: 'reports exist' is established, but the relationship between any report and the running binary is not merely unproven — the binary is unreadable.",
    prohibitedInferences: ["that a Code4rena brand implies the running code is audited", "that Fluid lineage implies the binary is reviewed", "that a public audited commit implies a public audited binary"],
    invalidationTriggers: ["a verified build appears", "an IDL is published", "the repo is updated to the live commit"],
  },
  {
    dimensionId: "maturity", weight: 8, applicability: "directly_applicable",
    readiness: "partial", scoreable: true,
    evidenceRefs: ["JUP_PROGRAM_GRAPH", "FLUID_CONTINUITY"],
    favorableFacts: ["the Fluid design has operating history on other chains", "~428.6M USDC is supplied, indicating material adoption", "(added at 16H-S.0) the Solana codebase was under review by four firms Jul-Nov 2025, corroborated by the reward_rate_model deploy of 2025-08-26 — development age is ~a year, even though the fund-holding binaries are days old"],
    unfavorableFacts: [
      "THE LIQUIDITY PROGRAM HOLDING SUPPLIER FUNDS DEPLOYED 2026-07-16 — ~33 HOURS before cutoff",
      "the lending program deployed 2026-07-03 — ~14.4 days",
      "both are materially newer than Kamino's KLend (~51.7 days)",
      "authority tenure unresolved; configuration tenure unresolved",
      "USDC pool age unresolved",
    ],
    limitations: ["Fluid's Ethereum history is a different codebase on a different runtime and does not transfer"],
    unresolvedQuestions: ["how long has this pool existed", "how often are these programs redeployed"],
    confidenceCeiling: "low",
    scorerInstructions: "Score the SOLANA deployment's maturity. Do not grant it Fluid's Ethereum history. A 33-hour-old binary holding 428M is the central fact.",
    prohibitedInferences: ["that Fluid's Ethereum maturity transfers", "that TVL implies maturity", "that adoption implies review"],
    invalidationTriggers: ["program redeploy", "pool age evidence obtained"],
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, applicability: "directly_applicable",
    readiness: "partial", scoreable: true,
    evidenceRefs: ["JUP_PROGRAM_GRAPH", "PROGRAM_GRAPH_FINDINGS"],
    favorableFacts: ["both material programs resolve to an off-curve PDA authority (not a raw keypair)", "the scouting 4-of-8 / 12h / autonomous-config claim was found on the shared authority"],
    unfavorableFacts: [
      "ONE authority (4MsgBB5…) can upgrade BOTH the share accounting AND the vault holding ~428.6M USDC",
      "4-of-8 + 12h is a lower bar than Kamino's 5-of-10 + 24h for program upgrade",
      "both programs are upgradeable; neither is frozen",
      "authority tenure unresolved",
      "the program graph is a LOWER BOUND — oracle, rewards, liquidation and flash-loan programs were not located, so their authorities are unknown",
    ],
    limitations: ["the 4-of-8/12h decode was performed during scouting; it is recorded here as reverified at the authority-address level (both programs share the same authority) but the multisig decode was not re-run inside this package"],
    unresolvedQuestions: ["authority tenure", "authorities of the unlocated programs in the graph"],
    confidenceCeiling: "low",
    scorerInstructions: "Score the shared-authority structure. Note that a single 4-of-8 controls both material programs, and that the graph is incomplete.",
    prohibitedInferences: ["that one program's authority describes the whole graph", "that a multisig implies safety", "that off-curve alone establishes a Squads multisig"],
    invalidationTriggers: ["upgrade authority change", "Squads config change", "additional programs located"],
  },
  {
    dimensionId: "manager_discretion", weight: 12, applicability: "directly_applicable",
    readiness: "insufficient", scoreable: false,
    evidenceRefs: ["PRIVILEGED_POWER_MAP", "LOSS_WATERFALL"],
    favorableFacts: ["jlUSDC has NO freeze authority — verified absent"],
    unfavorableFacts: ["the privileged-power map cannot be built without the instruction set", "a dynamic withdrawal limiter exists whose admin controls are unknown"],
    limitations: ["no IDL, no verified build, no matching public source"],
    unresolvedQuestions: ["what parameters an admin can change", "whether an admin can write down lender claims", "whether an admin can freeze exits"],
    confidenceCeiling: "low",
    scorerInstructions: "DO NOT SCORE. This dimension grades discretionary control over material parameters; the set of discretionary powers is unknown.",
    prohibitedInferences: ["that an unenumerated power set is a small power set", "that absence of evidence of discretion is evidence of its absence"],
    invalidationTriggers: ["an IDL or source becomes available"],
  },
  {
    dimensionId: "strategy_complexity", weight: 10, applicability: "directly_applicable",
    readiness: "partial", scoreable: true,
    evidenceRefs: ["LENDER_CLAIM", "JUP_PROGRAM_GRAPH"],
    favorableFacts: ["single USDC pool; the supplier funds one liquidity layer and receives a share token", "no allocation manager or strategy rotation was observed"],
    unfavorableFacts: [
      "TWO material programs versus Kamino's one — the share accounting and the fund custody are separate programs, an extra CPI boundary",
      "share value is not 1:1 (1.051795) and its formula is unverified",
      "borrower collateral and liquidation exposure exist but are unmapped",
      "a dynamic withdrawal limiter adds a control layer absent from a plain reserve model",
    ],
    limitations: ["the mechanism is API-described, not source-derived"],
    unresolvedQuestions: ["exact accrual and redemption mechanics"],
    confidenceCeiling: "low",
    scorerInstructions: "Score the observable structure while noting it is API-described rather than source-derived. Do not describe supplying here as equivalent to holding USDC.",
    prohibitedInferences: ["that a single pool means low complexity", "that an unread mechanism is a simple mechanism"],
    invalidationTriggers: ["architecture change", "source becomes available"],
  },
  {
    dimensionId: "composability_dependency", weight: 8, applicability: "directly_applicable",
    readiness: "partial", scoreable: true,
    evidenceRefs: ["JUP_PROGRAM_GRAPH", "PROGRAM_GRAPH_FINDINGS"],
    favorableFacts: ["classic SPL Token program for jlUSDC; no Token-2022 extensions observed"],
    unfavorableFacts: [
      "at least 2 material programs, with a CPI boundary between share accounting and fund custody",
      "the graph is a LOWER BOUND — oracle, rewards, flash-loan and liquidation programs are named in the audit scope but were not located on-chain",
      "a flash-loan module is in the audited scope, implying a flash-loan surface adjacent to supplier funds",
    ],
    limitations: ["the dependency set cannot be completed without the instruction set"],
    unresolvedQuestions: ["the complete program graph", "oracle and liquidation dependencies"],
    confidenceCeiling: "low",
    scorerInstructions: "Score against a KNOWN-INCOMPLETE graph and say so. An unenumerated dependency is not an absent dependency.",
    prohibitedInferences: ["that 2 programs is the full graph", "that unlocated programs do not exist"],
    invalidationTriggers: ["additional programs located"],
  },
  {
    dimensionId: "oracle_risk", weight: 8, applicability: "reserve_specific_evidence_required",
    readiness: "insufficient", scoreable: false,
    evidenceRefs: ["ORACLE_SURFACE", "COLLATERAL_UNIVERSE"],
    favorableFacts: [],
    unfavorableFacts: ["no oracle account was bound to the USDC pool", "the live oracle program was not located", "the provider is unknown", "the collateral universe is unenumerated, so its oracle paths cannot be mapped"],
    limitations: ["neither side of the oracle surface is resolved"],
    unresolvedQuestions: ["what prices this product and how", "what happens on staleness"],
    confidenceCeiling: "low",
    scorerInstructions: "DO NOT SCORE. Unlike Kamino — where the USDC side was fully verified and only the collateral side was open — here NEITHER side is resolved.",
    prohibitedInferences: ["that an unmapped oracle surface is a small one"],
    invalidationTriggers: ["oracle program located", "collateral universe enumerated"],
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, applicability: "directly_applicable",
    readiness: "partial", scoreable: true,
    evidenceRefs: ["WITHDRAWAL_LIMITER", "LENDER_CLAIM"],
    favorableFacts: ["a large supply base (~428.6M USDC)", "no cooldown or lockup was observed in the API surface"],
    unfavorableFacts: [
      "ACTUAL withdrawable is ~64.38M against ~428.59M supplied — about 15%",
      "a DYNAMIC WITHDRAWAL LIMITER exists (expandPercent 50%, expandDuration 6h, baseWithdrawalLimit ~8.27M, plus decay) — an algorithmic rate limiter on top of liquidity, a control class Kamino does not have",
      "the limiter's deployed semantics are unverified — how it recomputes, what resets it, and whether an authority can tighten it instantly are unknown",
      "who can pause withdrawals, and whether any timelock applies, is unresolved",
    ],
    limitations: ["every liquidity figure is API-reported, not re-derived from program state"],
    unresolvedQuestions: ["exact limiter semantics", "pause authority and timelock"],
    confidenceCeiling: "low",
    scorerInstructions: "The limiter is the central fact. Do NOT describe withdrawals as available from current liquidity alone — the observable withdrawable is ~15% of supply, and the limiter is an additional constraint whose rules are unread.",
    prohibitedInferences: ["that supply size is exit capacity", "that current liquidity is guaranteed future liquidity", "that no observed cooldown means no cooldown exists"],
    invalidationTriggers: ["limiter parameters change", "source becomes available"],
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, applicability: "directly_applicable",
    readiness: "complete", scoreable: true,
    evidenceRefs: ["JUP_PRODUCT_BINDING"],
    favorableFacts: ["canonical Circle USDC (EPjFWdd5…Dt1v) verified — not bridged or wrapped", "jlUSDC is a classic SPL mint with NO freeze authority (verified)", "6 decimals verified"],
    unfavorableFacts: ["Circle retains mint-level freeze/blacklist capability over USDC itself", "centralized issuer dependency", "depeg risk inherent"],
    limitations: [],
    unresolvedQuestions: [],
    confidenceCeiling: "high",
    scorerInstructions: "Identical asset and issuer profile to any USDC product. Score issuer/freeze and depeg exposure.",
    prohibitedInferences: ["that canonical identity removes issuer or depeg risk", "that jlUSDC lacking a freeze authority protects the underlying USDC"],
    invalidationTriggers: ["mint or freeze authority change"],
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, applicability: "directly_applicable",
    readiness: "weak", scoreable: true,
    evidenceRefs: ["APY_AND_REWARDS", "LENDER_CLAIM"],
    favorableFacts: ["no withdrawal fee was observed in the API surface"],
    unfavorableFacts: [
      "fees cannot be verified from deployed code — Kamino's equivalent was established by reading every fee field in the deployed path",
      "the share-value formula is unverified, so hidden share-value deductions cannot be excluded",
      "a rewardsRate of 0.70% is reported while the rewards array is EMPTY — an unexplained inconsistency in the fee/reward surface",
      "reserve factor, protocol take rate and origination fees are unresolved",
    ],
    limitations: ["absence of an observed fee is not verified absence of a fee"],
    unresolvedQuestions: ["the complete fee schedule", "whether share value carries deductions"],
    confidenceCeiling: "low",
    scorerInstructions: "Score on VERIFIED fee evidence, of which there is little. Not observing a fee in an API response is not the same as proving none exists in the instruction set.",
    prohibitedInferences: ["that an unobserved fee is an absent fee"],
    invalidationTriggers: ["source becomes available", "fee config change"],
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, applicability: "directly_applicable",
    readiness: "weak", scoreable: true,
    evidenceRefs: ["APY_AND_REWARDS", "LENDER_CLAIM", "WITHDRAWAL_LIMITER"],
    favorableFacts: ["a public unauthenticated API exists and responds"],
    unfavorableFacts: [
      "EVERY material quantity in this package — share rate, supply, rates, the withdrawal limiter — is API-reported, with no independent on-chain derivation path available",
      "no SDK equivalent to Kamino's official rate math was identified",
      "the API exposes lastUpdateTimestamp on liquiditySupplyData but the overall response carries no slot binding",
      "an integration would depend on an API WealthSmith cannot verify against program state",
    ],
    limitations: ["operational dependency here is unusually high precisely because the program is unreadable"],
    unresolvedQuestions: ["whether any on-chain derivation path exists for share value"],
    confidenceCeiling: "low",
    scorerInstructions: "Score PROTOCOL operational dependency. Note that unreadability converts what would be a protocol property into an API dependency.",
    prohibitedInferences: ["that a working API is a verified data source"],
    invalidationTriggers: ["an SDK or IDL is published"],
  },
  {
    dimensionId: "incident_history", weight: 2, applicability: "reserve_specific_evidence_required",
    readiness: "insufficient", scoreable: false,
    evidenceRefs: ["INCIDENT_EVIDENCE"],
    favorableFacts: [],
    unfavorableFacts: ["the liquidity binary is ~33 hours old — no incident record can exist for it", "Code4rena findings are sensitive and unavailable, so audit findings resembling live risk could not be reviewed", "no Fluid-vs-Solana incident scope separation was performed"],
    limitations: ["the search covered only the Code4rena listing and Jupiter docs"],
    unresolvedQuestions: ["Fluid incidents relevant to the ported design", "Solana deployment incidents", "bug-bounty and disclosure history"],
    confidenceCeiling: "low",
    scorerInstructions: "DO NOT SCORE. The search was too narrow to place an anchor, and zero identified incidents over a narrow search is not a clean record.",
    prohibitedInferences: ["that zero identified incidents is a clean record", "that a 33-hour-old binary having no incidents is favorable"],
    invalidationTriggers: ["incident search completed", "Code4rena findings published"],
  },
];

/* ------------------------------------------------------------------ *
 * 7. Structural comparison — non-scoring
 * ------------------------------------------------------------------ */

export type ComparisonVerdict = "potentially_stronger" | "approximately_comparable" | "potentially_weaker" | "unresolved";

export const KAMINO_STRUCTURAL_COMPARISON: { aspect: string; jupiterVsKamino: ComparisonVerdict; basis: string }[] = [
  { aspect: "audit-to-binary linkage", jupiterVsKamino: "potentially_weaker", basis: "Kamino: verified build (is_verified TRUE, hashes match), audit commits private. Jupiter: NEITHER program verified, no IDL, live IDs absent from audited source." },
  { aspect: "audit artifact starting position", jupiterVsKamino: "potentially_stronger", basis: "Jupiter's Code4rena contest used a PUBLIC repo and a PUBLIC commit that exists; Kamino's three auditors all cite private-repo commits. The linkage fails for both, but Jupiter's could in principle be repaired." },
  { aspect: "maturity", jupiterVsKamino: "potentially_weaker", basis: "Jupiter liquidity binary ~33 hours, lending ~14.4 days. Kamino KLend ~51.7 days." },
  { aspect: "program upgrade controls", jupiterVsKamino: "potentially_weaker", basis: "Jupiter: one authority 4-of-8 / 12h over BOTH material programs. Kamino: 5-of-10 / 24h for program upgrade." },
  { aspect: "market administration", jupiterVsKamino: "unresolved", basis: "Kamino's market owner is fully mapped (4-of-10 / 12h, 15 instruction-bound powers). Jupiter's product authorities were not located." },
  { aspect: "principal write-down controls", jupiterVsKamino: "unresolved", basis: "Kamino: socialize_loss, has_one lending_market_owner, 4-of-10 + 12h — fully traced. Jupiter: the loss waterfall is unreadable." },
  { aspect: "emergency exit-freeze controls", jupiterVsKamino: "unresolved", basis: "Kamino: emergency council 2-of-7, zero timelock, restrictive-only allowlist — fully mapped. Jupiter: pause authorities unknown." },
  { aspect: "manager discretion", jupiterVsKamino: "unresolved", basis: "Kamino's mutable surface is enumerated from deployed code. Jupiter's power set is unknown." },
  { aspect: "strategy complexity", jupiterVsKamino: "potentially_weaker", basis: "Jupiter: 2 material programs with a CPI boundary between accounting and custody. Kamino: 1 program, mechanism fully source-derived." },
  { aspect: "composability dependencies", jupiterVsKamino: "potentially_weaker", basis: "Jupiter's graph is a lower bound of 2 with oracle/rewards/flash-loan/liquidation programs unlocated. Kamino's set is enumerated." },
  { aspect: "collateral breadth", jupiterVsKamino: "unresolved", basis: "Neither product's collateral universe is fully enumerated. Kamino's market is identified; Jupiter's borrow vaults were only sampled." },
  { aspect: "oracle breadth", jupiterVsKamino: "potentially_weaker", basis: "Kamino: USDC side fully verified, collateral side open. Jupiter: NEITHER side resolved." },
  { aspect: "liquidity mechanics", jupiterVsKamino: "potentially_weaker", basis: "Kamino: exact limit derived from deployed Rust. Jupiter: an additional algorithmic rate limiter whose semantics are unread; observable withdrawable ~15% of supply." },
  { aspect: "withdrawal limits", jupiterVsKamino: "potentially_weaker", basis: "Kamino: rolling cap 90M/24h, non-binding, plus a queue subtraction — all source-derived. Jupiter: dynamic limiter binding at ~64.38M of ~428.59M." },
  { aspect: "incident evidence", jupiterVsKamino: "unresolved", basis: "Kamino: exact market named in official stress-event material. Jupiter: search too narrow; binary too new for any record." },
];

export const COMPARISON_RULES = {
  doesNotModifyEitherProduct: true,
  kaminoAggregateUnchanged: 5.93,
  kaminoAssessmentUntouched: "klend_direct_usdc_automated_assessment_v1@1.0.0 / direct_assessment_54a11ba3",
  noOverallSafetyClaim: "This table compares EVIDENCE, aspect by aspect. It does not state that either product is safer overall, and it produces no aggregate.",
  noScoreInheritance: "Jupiter inherits no score, anchor or confidence from Kamino.",
  jupiterNotTargetedAbove593: true,
} as const;

/* ------------------------------------------------------------------ *
 * 8. Readiness
 * ------------------------------------------------------------------ */

export interface JupReadinessResult {
  readiness: "ready_for_automated_assessment" | "not_ready_for_automated_assessment";
  completeDimensions: string[];
  partialButScoreableDimensions: string[];
  insufficientDimensions: string[];
  blockingArtifacts: string[];
}

export function evaluateJupReadiness(dims: JupDimensionEvidence[] = JUP_DIMENSION_EVIDENCE): JupReadinessResult {
  const complete = dims.filter((d) => d.readiness === "complete" && d.scoreable).map((d) => d.dimensionId);
  const partial = dims.filter((d) => (d.readiness === "partial" || d.readiness === "weak") && d.scoreable).map((d) => d.dimensionId);
  const insufficient = dims.filter((d) => !d.scoreable).map((d) => d.dimensionId);
  return {
    readiness: insufficient.length === 0 ? "ready_for_automated_assessment" : "not_ready_for_automated_assessment",
    completeDimensions: complete,
    partialButScoreableDimensions: partial,
    insufficientDimensions: insufficient,
    blockingArtifacts: [
      "no verified build for either live program (verify.osec.io is_verified: false)",
      "no on-chain Anchor IDL for the lending program",
      "the Code4rena-audited commit's declared program IDs are not deployed; live IDs absent from audited source",
      "supplier loss waterfall unresolved (MANDATORY for readiness)",
      "collateral universe and bad-debt isolation unresolved",
      "oracle surface unresolved on both the USDC and collateral sides",
      "privileged-power map unresolved — pause and write-down authorities unknown",
      "incident search too narrow to place an anchor",
    ],
  };
}

export const JUP_PACKAGE_READINESS = evaluateJupReadiness();

export const JUP_READINESS_RATIONALE = {
  readinessIsNotSuitability: "Readiness asks only whether an integer anchor can be selected without inventing a fact. It is not suitability, approval or recommendation eligibility.",
  notReadyBecause:
    "Four dimensions (audit_security 15, manager_discretion 12, oracle_risk 8, incident_history 2 — 37% of weight) cannot be scored without guessing. The cause is common to all four: the deployed binaries cannot be read. No verified build, no IDL, no public source matching the live program IDs.",
  notBecauseJupiterIsAnAlternative:
    "This verdict rests on missing evidence classes, not on comparison. Had the same evidence existed, the package would be ready regardless of what any score turned out to be.",
  theAsymmetryWithKamino:
    "Kamino's package reached ready with six partial dimensions because its deployed Rust was readable — socialize_loss, the deposit gates and the redemption math were all derived from source. Jupiter's blocker is one level deeper: not 'the evidence is incomplete' but 'the artifact that would carry the evidence does not exist publicly'.",
  whatWouldUnblockIt: [
    "a verified build for both live programs, or an Anchor IDL",
    "a public repository state matching the live program IDs",
    "from either of those: the loss waterfall, the privileged-power map and the oracle surface become derivable",
  ],
} as const;

/* ------------------------------------------------------------------ *
 * 9. Manifest
 * ------------------------------------------------------------------ */

export const JUP_INCLUDED_EVIDENCE = [
  "JUP_PRODUCT_BINDING", "JUP_PROGRAM_GRAPH", "PROGRAM_GRAPH_FINDINGS", "SOURCE_TO_BINARY",
  "FLUID_CONTINUITY", "LENDER_CLAIM", "WITHDRAWAL_LIMITER", "APY_AND_REWARDS",
  "LOSS_WATERFALL", "COLLATERAL_UNIVERSE", "ORACLE_SURFACE", "PRIVILEGED_POWER_MAP", "INCIDENT_EVIDENCE",
] as const;

export const JUP_PACKAGE_MANIFEST = {
  packageId: JUP_PACKAGE_ID,
  packageVersion: JUP_PACKAGE_VERSION,
  candidateId: JUP_PRODUCT_BINDING.candidateId,
  productName: JUP_PRODUCT_BINDING.productName,
  poolAccount: JUP_PRODUCT_BINDING.poolAccount,
  receiptTokenMint: JUP_PRODUCT_BINDING.receiptTokenMint,
  programGraph: JUP_PROGRAM_GRAPH.map((p) => p.programId),
  includedEvidenceIds: JUP_INCLUDED_EVIDENCE,
  evidenceCutoff: JUP_PRODUCT_BINDING.evidenceCutoff,
  observedAtSlot: JUP_PRODUCT_BINDING.observedAtSlot,
  preparerId: JUP_PRODUCT_BINDING.preparerId,
  preparationRole: JUP_PRODUCT_BINDING.preparationRole,
  rubricId: JUP_PRODUCT_BINDING.rubricId,
  rubricVersion: JUP_PRODUCT_BINDING.rubricVersion,
  rubricHash: JUP_PRODUCT_BINDING.rubricHash,
  confidencePolicyId: JUP_PRODUCT_BINDING.confidencePolicyId,
  separationOfDutiesId: JUP_PRODUCT_BINDING.separationOfDutiesId,
  readiness: JUP_PACKAGE_READINESS.readiness,
  unresolvedGaps: JUP_PACKAGE_READINESS.blockingArtifacts,
  containsScores: false,
  containsAggregate: false,
  invalidationTriggers: [
    "either program is upgraded or redeployed",
    "upgrade authority or Squads config change",
    "a verified build or IDL is published",
    "the public repo is updated to match live program IDs",
    "the withdrawal limiter parameters change",
    "Code4rena findings are published",
    "rubric or confidence-policy version change",
  ],
} as const;

export function computeJupPackageManifestHash(m: typeof JUP_PACKAGE_MANIFEST = JUP_PACKAGE_MANIFEST): string {
  const material = JSON.stringify({
    id: m.packageId, v: m.packageVersion, c: m.candidateId, p: m.poolAccount,
    r: m.receiptTokenMint, g: m.programGraph, cut: m.evidenceCutoff, rh: m.rubricHash, rd: m.readiness,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `jup_risk_package_${h.toString(16).padStart(8, "0")}`;
}

export const JUP_PACKAGE_MANIFEST_HASH = computeJupPackageManifestHash();

export const JUP_PACKAGE_CONFERS = {
  confers: ["assembled scoring-input evidence for Jupiter Lend USDC", "a deterministic readiness verdict", "a non-scoring structural comparison"],
  doesNotConfer: [
    "a risk score", "an aggregate", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "Top Pick", "a production card",
    "wallet-position integration", "Safety Buffer integration", "execution",
  ],
  scoresAssigned: false,
  aggregateCalculated: false,
  thresholdTargeting: false,
  addedToSelectorEligibility: false,
  addedToProductionCandidateOutput: false,
  kaminoAssessmentChanged: false,
  steakhouseAssessmentChanged: false,
  transactionConstructedOrSimulated: false,
} as const;
