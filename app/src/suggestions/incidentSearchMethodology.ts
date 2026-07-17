/**
 * incidentSearchMethodology — Step 16H-S.1. The reusable incident-search method, plus its first
 * application: a VALIDATED on-chain admin-action scan of the exact Kamino direct-USDC reserve.
 *
 * WHY THIS EXISTS
 * ---------------
 * The prior incident searches were interviews, not searches: they asked each protocol about itself
 * (its docs, its forum) with no on-chain leg. And 16H-S.0 exposed that even the interview was
 * incomplete — a forum I had cited was never enumerated. This module fixes the method and runs the
 * missing on-chain leg for the socialize_loss gap that has sat open in a live assessment.
 *
 * THE HEADLINE RESULT — validated, not merely observed
 * ----------------------------------------------------
 *   socialize_loss on this reserve   : 0 invocations, over the market-owner authority's full
 *                                       observable tenure (2026-02-24 → 2026-07-17, 168 txns).
 *   update_reserve_config            : 4 invocations on this exact reserve
 *                                       (2026-04-22 ×2, 2026-05-20, 2026-06-05).
 *   withdraw_protocol_fee            : 0 on this reserve.
 *
 * The socialize_loss ZERO is trustworthy ONLY because the same scan, same decoder, found 385 real
 * update_reserve_config calls and every observed discriminator resolved to a known SDK instruction.
 * That validation is the method's core, because the FIRST run of this scan returned "0 socialize_loss"
 * while ALSO being completely broken.
 *
 * THE FALSE-NEGATIVE THAT ALMOST SHIPPED
 * -------------------------------------
 * Run 1 decoded inner-instruction data as base64. `getTransaction` returns inner-instruction data as
 * BASE58. Every discriminator was garbage, 0/13 mapped to any of the 63 SDK instructions, and the scan
 * reported "socialize_loss: 0" — which looked like a clean result and was actually a dead decoder.
 * A scan that returns zero is indistinguishable from a broken scan UNLESS it also recognizes known
 * instructions. That self-check is now mandatory (SELF_CHECK below), because without it this scan would
 * have "confirmed" a clean record by failing to read anything at all.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const INCIDENT_SEARCH_VERSION = "1.0.0" as const;
export const INCIDENT_SEARCH_ID = "incident_search_methodology_v1" as const;

/* ------------------------------------------------------------------ *
 * 1. The method
 * ------------------------------------------------------------------ */

export const INCIDENT_SCOPE_MODEL = {
  categories: ["security", "accounting", "liquidity", "withdrawal", "allocation", "oracle", "administrative", "operational"],
  categoriesNote: "From the product owner's own questionnaire. '$0 bad debt' answers ACCOUNTING alone; it must never stand for all eight.",
  subjectBoundary: "Every incident is attributed to exactly one subject; subjects must not blur. For a ported protocol: {upstream design on another chain} ≠ {the deploying org} ≠ {unrelated products of the same brand} ≠ {the exact live programs} ≠ {upstream dependencies} ≠ {the audited-but-undeployed commit}.",
  subjectBoundaryMotivation: "Two identity errors already occurred INSIDE incident evidence: KVault-vs-KLend (binary date, 16H-P.2a) and Main-vs-SOL/BTC (coverage, 16H-O.2).",
  cutoffRequired: "Every search records an as-of timestamp, so a later reader knows what it could not have seen.",
} as const;

export const SOURCE_CLASSES = [
  { rank: 1, name: "on-chain", authority: "highest — the only class the subject cannot curate", technique: "privileged-instruction discriminator scan + share-price monotonicity + upgrade-cadence + Solana-halt overlap" },
  { rank: 2, name: "primary/official", authority: "authoritative for what it ADMITS; silent on what it does not", examples: "postmortems, governance forum, status page, the protocol's own posts" },
  { rank: 3, name: "independent aggregators", authority: "LOCATE-ONLY — may point to primary evidence, never establish a fact (standing rule)", examples: "Rekt, DeFiLlama hacks, Immunefi, Chainalysis" },
  { rank: 4, name: "audit findings as incident proxies", authority: "a high-severity finding on live code is a near-miss; withheld findings are themselves a recordable fact", examples: "Code4rena, traditional audit high/criticals" },
] as const;

export const NEGATIVE_RESULT_DISCIPLINE = {
  rule: "A search that finds nothing yields a SEARCH RESULT bounded by {sources, subject, window, cutoff} — never a clean record, and never proof of absence.",
  aBetterSearchMakesTheNegativeMoreInformative: "A validated on-chain scan over a bounded, complete history is a STRONGER negative than 'we asked and they said nothing' — but it is still a negative, not a positive safety fact.",
  preservedVerbatimFrom: "steakhouseIncidentEvidence — 'zero confirmed incidents is a SEARCH RESULT, not a clean record'.",
} as const;

/**
 * THE SELF-CHECK — the load-bearing part of the on-chain scan.
 *
 * Any discriminator scan that reports a ZERO count for a target instruction MUST first prove its
 * decoder is alive: a high fraction of the OTHER observed discriminators must resolve to known
 * instructions. If recognition is near-zero, the scan is broken and every count — including the zero —
 * is void.
 */
export const SELF_CHECK = {
  requirement: "recognizedFraction = |observed discriminators that map to a known SDK/IDL instruction| / |observed discriminators| must be near 1.0 before ANY count from the scan is trusted.",
  threshold: 0.9,
  whyMandatory: "Run 1 of this exact scan returned 'socialize_loss: 0' with recognizedFraction = 0 (base58/base64 decode bug). A zero count and a dead decoder are indistinguishable without this check.",
  onFailure: "Discard all counts. The zero is not a clean record; it is a broken instrument.",
} as const;

/** The rule inherited from 16H-S.0 — a cited-but-unenumerated source is unsearched. */
export const SOURCE_ENUMERATION_RULE_INHERITED = {
  from: "source_completion_amendment_v1 (16H-S.0)",
  rule: "When citing any source, enumerate its index — not only the page that answered the immediate question. A cited-but-unenumerated source is UNSEARCHED.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Discriminator registry (Anchor global:<name>, SDK-verified)
 * ------------------------------------------------------------------ */

export function anchorDiscriminator(instructionName: string): string {
  return crypto.createHash("sha256").update(`global:${instructionName}`).digest().subarray(0, 8).toString("hex");
}

/** Reads the installed klend-sdk codegen and returns discriminator→name for all 63 instructions. */
export function loadKlendDiscriminatorRegistry(): Record<string, string> {
  const dir = "node_modules/@kamino-finance/klend-sdk/dist/@codegen/klend/instructions";
  const out: Record<string, string> = {};
  let files: string[] = [];
  try { files = fs.readdirSync(dir); } catch { return out; }
  for (const f of files) {
    if (!f.endsWith(".js")) continue;
    const m = fs.readFileSync(path.join(dir, f), "utf8").match(/Buffer\.from\(\[([0-9,\s]+)\]\)/);
    if (!m) continue;
    const nums = (m[1].match(/\d+/g) ?? []).slice(0, 8).map(Number);
    if (nums.length === 8) out[Buffer.from(nums).toString("hex")] = f.slice(0, -3);
  }
  return out;
}

/** The admin instructions whose invocation history is material to risk scoring. */
export const KLEND_ADMIN_INSTRUCTIONS = {
  socialize_loss: { discriminator: "f54b5b00ec611303", feedsDimension: "incident_history", meaning: "supplier principal write-down" },
  update_reserve_config: { discriminator: "3d9464468f6b110d", feedsDimension: "manager_discretion", meaning: "market-owner discretionary change to reserve parameters" },
  withdraw_protocol_fee: { discriminator: "9ec99ebd215da267", feedsDimension: "withdrawal_fee_transparency", meaning: "protocol reserve extraction" },
  update_lending_market_owner: { discriminator: anchorDiscriminator("update_lending_market_owner"), feedsDimension: "upgrade_admin_authority", meaning: "authority handover" },
} as const;

export const REGISTRY_VERIFICATION = {
  verifiedAgainst: "@kamino-finance/klend-sdk @codegen/klend/instructions (63 instructions)",
  socializeLossConfirmed: "f54b5b00ec611303 — matches the SDK-generated instruction discriminator",
  updateReserveConfigConfirmed: "3d9464468f6b110d — matches",
  note: "These discriminators were WRONGLY reported as 'not matching' in run 1; the mismatch was the decoder, not the registry. The registry is authoritative.",
} as const;

/* ------------------------------------------------------------------ *
 * 3. The validated Kamino scan result
 * ------------------------------------------------------------------ */

export const KAMINO_ADMIN_SCAN = {
  candidateId: "kamino_usdc_lending",
  reserve: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  market: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",

  scope: "the market-owner Squads vault 24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT — its COMPLETE signature history (168 txns, fully enumerated in one page)",
  scopeJustification: "socialize_loss and update_reserve_config both require lending_market_owner (has_one, VERIFIED at 16H-L.2). The owner's own history is therefore the correct and complete scope for its actions — far cleaner than the reserve's ~10,000 tx/day firehose.",
  windowStart: "2026-02-24T14:58:49.000Z (oldest owner-vault signature)",
  windowEnd: "2026-07-17T13:36:53.000Z",
  observedAtSlot: 433491256,
  totalOwnerTxns: 168,
  klendTouchingTxns: 164,

  selfCheckRecognizedFraction: 1.0,
  selfCheckPassed: true,
  selfCheckDetail: "every observed KLend discriminator resolved to a known SDK instruction (updateReserveConfig, updateLendingMarket, updateLendingMarketOwner, initFarmsForReserve, updateGlobalConfig, …). Run 1's fraction was 0.0.",

  results: {
    socialize_loss: { onThisReserve: 0, totalObserved: 0 },
    update_reserve_config: { onThisReserve: 4, totalObserved: 385, datesOnThisReserve: ["2026-04-22", "2026-04-22", "2026-05-20", "2026-06-05"] },
    withdraw_protocol_fee: { onThisReserve: 0, totalObserved: 0 },
  },

  interpretation: {
    socializeLoss:
      "NO socialize_loss invocation touched this reserve across the market-owner authority's entire observable tenure. Because socialize_loss has_one lending_market_owner, and this owner's complete signature history was scanned with a validated decoder, this is a STRONG negative for the current-owner period — materially stronger than the docs/forum negative it supplements.",
    socializeLossLimits:
      "It is still a SEARCH RESULT, bounded three ways: (1) it covers the CURRENT owner's tenure only, from 2026-02-24 — a prior owner could have socialized losses earlier; (2) it does not cover socialize_loss_v2, if the market ever used a different variant; (3) it is not proof of absence, only of non-observation over a bounded, complete window.",
    updateReserveConfig:
      "manager_discretion is NOT dormant. The market owner changed THIS reserve's configuration 4 times in ~2 months (2026-04-22 ×2, 2026-05-20, 2026-06-05). The capability the assessment scored from the deployed instruction set has been EXERCISED — which is materially different from 'the power exists but has never been used'. The 4-of-10 + 12h authority is active.",
    updateReserveConfigLimits:
      "The scan counts invocations; it does not decode WHICH parameters changed (rate curve vs a cap vs oracle config). That decode is available from the instruction data but was not performed here.",
  },

  feedsButDoesNotMove: {
    incidentHistoryScore: "5 (unchanged) — the socialize_loss negative strengthens favorable evidence for the current-owner period, but binary-currency and pre-2026-02-24 gaps remain. This is EVIDENCE for a future reassessment, not a score change in this evidence task.",
    managerDiscretionScore: "5 (unchanged) — the 4 exercised config changes corroborate the scored capability; they neither raise nor lower it without a reassessment. A reviewer may weigh that the power is active, not theoretical.",
    scoresFrozenBecause: "16H-S.1 is an evidence/methodology task. Moving a live score requires the assessment mechanism (a new immutable version), not an evidence amendment. Both findings are flagged for the human reviewer and any future reassessment.",
  },
} as const;

export const JUPITER_APPLICABILITY = {
  scanRun: false,
  whyNot: [
    "jlUSDC uses a share-price model; there is no socialize_loss-equivalent named instruction to scan for (loss would appear as a share-price decline, a DIFFERENT technique).",
    "the fund-holding binary is ~1.4 days old — an exhaustive scan is trivially cheap but yields ~1 day of history, which is youth, not a clean record.",
    "Jupiter's package is already not_ready on the loss waterfall; an admin-action scan does not unblock it.",
  ],
  correctJupiterTechnique: "share-price (convertToAssets) monotonicity over the pool's life — any decline is a dated loss event. Deferred; the pool is too young to be informative.",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Evidence + manifest
 * ------------------------------------------------------------------ */

export const INCIDENT_SEARCH_EVIDENCE = {
  evidenceId: INCIDENT_SEARCH_ID,
  version: INCIDENT_SEARCH_VERSION,
  step: "16H-S.1",
  preparerId: "claude_automated_evidence_preparer",
  preparationRole: "evidence_preparer" as const,
  preparerIsNotScorer: true,
  evidenceTimestamp: "2026-07-17T13:45:00.000Z",
  whatChanged: [
    "Established the incident-search methodology (scope model, 4 source classes, on-chain scan, self-check, negative discipline).",
    "SDK-verified the KLend admin discriminator registry.",
    "Ran and VALIDATED the market-owner admin-action scan: socialize_loss = 0 (current-owner tenure), update_reserve_config = 4 on this reserve.",
    "Caught and recorded a false-negative decoder bug (base58/base64) that the self-check now guards against.",
    "Scores unchanged; findings flagged for the reviewer.",
  ],
  whyItChanged: "The socialize_loss history gap sat open in a live assessment; the search method was interview-only and, per 16H-S.0, even the interview was incomplete.",
  scoresAssigned: false,
  aggregateCalculated: false,
  historyRewritten: false,
  invalidationTriggers: [
    "a socialize_loss (or socialize_loss_v2) invocation touches this reserve",
    "the market-owner authority changes (a new owner starts a new tenure to scan)",
    "an update_reserve_config parameter-level decode is required",
    "an archive RPC enables extending the scan before 2026-02-24",
  ],
} as const;

export function computeIncidentSearchHash(e: typeof INCIDENT_SEARCH_EVIDENCE = INCIDENT_SEARCH_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step,
    sl: KAMINO_ADMIN_SCAN.results.socialize_loss.onThisReserve,
    urc: KAMINO_ADMIN_SCAN.results.update_reserve_config.onThisReserve,
    sc: KAMINO_ADMIN_SCAN.selfCheckRecognizedFraction,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `incident_search_${h.toString(16).padStart(8, "0")}`;
}

export const INCIDENT_SEARCH_HASH = computeIncidentSearchHash();

export const INCIDENT_SEARCH_CONFERS = {
  confers: ["a reusable incident-search method", "a validated on-chain admin-action scan for Kamino", "a stronger (still bounded) socialize_loss negative", "an exercised-discretion record"],
  doesNotConfer: ["a score change", "an aggregate", "a clean record", "proof of absence", "readiness", "human review", "signoff", "approval", "recommendation eligibility", "execution"],
  scoresAssigned: false,
  transactionConstructedOrSimulated: false,
  kaminoAssessmentChanged: false,
} as const;
