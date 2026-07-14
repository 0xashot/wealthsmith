#!/usr/bin/env node
/**
 * fetch-rated-jupiter-native-stake — Step 14S. Server-side ONLY fetch of Rated's
 * validator-specific 30-day DELEGATOR APY for the Jupiter native validator.
 *
 *   GET https://api.rated.network/v1/solana/validators/<vote>/summary?window=30d
 *   Authorization: Bearer $RATED_API_KEY
 *
 * SECURITY:
 *   - The API key is read ONLY from process.env.RATED_API_KEY (never VITE_RATED_API_KEY).
 *   - The key is never printed, logged, hardcoded, or written to disk.
 *   - This is a local/server-side script — NOT part of the frontend build and never imported
 *     by browser code. It performs no source-file mutation.
 *   - Output is SANITIZED (only the whitelisted fields) and written to
 *     tmp/rated-jupiter-native-stake.json (git-ignored).
 *
 * Usage: RATED_API_KEY=<secret> npm run native:fetch-rated
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const VOTE_ACCOUNT = "CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb";
const WINDOW = "30d";
const URL = `https://api.rated.network/v1/solana/validators/${VOTE_ACCOUNT}/summary?window=${WINDOW}`;
const OUT_PATH = resolve(process.cwd(), "tmp", "rated-jupiter-native-stake.json");
const TIMEOUT_MS = 20000;

function fail(message, code = 1) {
  // Never include the key in any message.
  console.error(`[fetch-rated] ERROR: ${message}`);
  process.exit(code);
}

const apiKey = process.env.RATED_API_KEY;
if (!apiKey || apiKey.trim() === "") {
  fail(
    "RATED_API_KEY is not set. Configure it locally (e.g. `export RATED_API_KEY=<secret>`) and re-run. " +
      "Do NOT use VITE_RATED_API_KEY and do NOT paste the key into source or chat.",
    2,
  );
}
// Note: the Vite-prefixed browser env var is intentionally never read here — the key is
// server-side only and must not be exposed to the frontend bundle.

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

let res;
try {
  res = await fetch(URL, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: controller.signal,
  });
} catch (err) {
  clearTimeout(timer);
  if (err && err.name === "AbortError") fail(`request timed out after ${TIMEOUT_MS}ms`, 3);
  fail(`network error while calling Rated (${err?.message ?? "unknown"})`, 3);
} finally {
  clearTimeout(timer);
}

if (res.status === 401 || res.status === 403) fail(`Rated auth failed (HTTP ${res.status}). Check RATED_API_KEY validity/permissions.`, 4);
if (res.status === 404) fail(`Rated returned 404 for vote account ${VOTE_ACCOUNT} (window=${WINDOW}). Verify the validator id.`, 5);
if (res.status === 429) fail("Rated rate limit hit (HTTP 429). Retry later.", 6);
if (res.status >= 500) fail(`Rated server error (HTTP ${res.status}). Retry later.`, 7);
if (!res.ok) fail(`unexpected Rated response (HTTP ${res.status}).`, 8);

let payload;
try {
  payload = await res.json();
} catch {
  fail("Rated response was not valid JSON.", 9);
}

// Validate the essentials before writing anything.
const voteAccount = payload?.voteAccount ?? payload?.vote_account;
const timeWindow = payload?.timeWindow ?? payload?.time_window ?? payload?.window;
const delegatorApy = payload?.delegatorApy ?? payload?.delegator_apy;
if (voteAccount !== VOTE_ACCOUNT) fail(`Rated voteAccount mismatch (expected ${VOTE_ACCOUNT}).`, 10);
if (timeWindow !== WINDOW) fail(`Rated timeWindow mismatch (expected ${WINDOW}, got ${timeWindow}).`, 11);
if (delegatorApy === undefined || delegatorApy === null || !Number.isFinite(Number(delegatorApy))) fail("Rated delegatorApy missing/invalid.", 12);

// Sanitized output only — the whitelisted fields, plus a fetch timestamp. No key, no headers.
const sanitized = {
  voteAccount,
  timeWindow,
  delegatorApy,
  validatorApy: payload?.validatorApy ?? payload?.validator_apy ?? null,
  voteCommissionRate: payload?.voteCommissionRate ?? payload?.vote_commission_rate ?? null,
  mevCommissionRate: payload?.mevCommissionRate ?? payload?.mev_commission_rate ?? null,
  totalStake: payload?.totalStake ?? payload?.total_stake ?? null,
  effectiveness: payload?.effectiveness ?? null,
  stakeAccountCount: payload?.stakeAccountCount ?? payload?.stake_account_count ?? null,
  fetchedAt: new Date().toISOString(),
  source: "rated:api.rated.network/v1/solana/validators/{vote}/summary?window=30d",
};

await mkdir(dirname(OUT_PATH), { recursive: true });
await writeFile(OUT_PATH, JSON.stringify(sanitized, null, 2) + "\n", "utf8");

// Print sanitized summary only (never the key).
console.log(`[fetch-rated] OK — wrote ${OUT_PATH}`);
console.log(`[fetch-rated] voteAccount=${voteAccount} window=${timeWindow} delegatorApy=${delegatorApy} (=${(Number(delegatorApy) * 100).toFixed(2)}%) totalStake=${sanitized.totalStake} fetchedAt=${sanitized.fetchedAt}`);
