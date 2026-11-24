/**
 * realSwapTransactions — real, UNSIGNED Jupiter transactions captured from mainnet, shared by
 * every fixture that needs one.
 *
 * Extracted here when server-side verification arrived: the execute handler now runs structural
 * verification before offering a plan, so a fixture's stubbed `swapTransaction` has to be a
 * transaction that actually decodes. A placeholder like "AQAB" no longer exercises the path it
 * claims to — it just fails early, for the wrong reason.
 *
 * Both are unsigned and have never been submitted. Neither can be submitted without a signature
 * that does not exist. They are test data, and treating them as anything else is a mistake.
 */

/** Captured 2026-11-23. Unsigned; it has never been submitted and cannot be without a signature. */
export const REAL_SWAP_TX =
  "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAGDOhXe3MT5v9275mWMq" +
  "2yky+jWowiU1YM/q7XNKUDiaL7A+lBM11bgIL7G++6dzHZ/8Mk/rN+K9/SKHE07pZhxbQbi/oKacYXjcC+HMjXXxjCc1fq7YFs9qjkbeNVTYK0" +
  "BECeJRB2t9Xwbx62JWlxw/VsMl31jK1on7mvH1vqDEYHXsQioFWE2x6gdj0HjL+qO0817sELm0zhxTjwTHuCZmuL6eAj2HuU6ETR0wxb+DGjdH" +
  "m0/fPApUlu1TliL+le+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAEedVb" +
  "8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpjJclj04kifG7PRApFI4NgwtaE5na/x" +
  "CEBI572Nvp+Fm0P/on9df2SnTAmx8pWHneSwmrNt/J3VFLMhqns4zl6ObeNI7xDAoQCcJJ3GgpwEU2j4JZnS+X8Vt8baj8okA/BQcABQLAXBUA" +
  "BwAJAwQAAAAAAAAACgYAAwAPBgkBAQgVCQABAwgPCAsIEAkADQMOAQwCBAURJOUXy5d6460qAQAAABEAZAABQEtMAAAAAACWmiEEAAAAADIAAA" +
  "kDAwAAAQkBeWUSc/alLjcLiYWttW7ElnjgwKUHBiufBJJdlBG4VVADbZBpAxIAbA==";
/**
 * A SECOND real transaction, captured 2026-11-23: SOL → USDC, 0.01 SOL, 50 bps.
 *
 * Kept because it exercises a different shape from the first: SOL as INPUT means the System
 * program wraps it, and USDC as OUTPUT means the result lands in a token account rather than in
 * lamports. Seven instructions against the first transaction's five. System was in the allowlist
 * speculatively before this; it is now there by observation.
 *
 * This one simulated cleanly against mainnet and delivered 720673 base units against a promised
 * minimum of 717707 — below the quoted 721313, above the floor, which is what a minimum is for.
 */
export const REAL_SWAP_TX_SOL_INPUT =
  "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAIC+hXe3MT5v9275mWMq" +
  "2yky+jWowiU1YM/q7XNKUDiaL7A+lBM11bgIL7G++6dzHZ/8Mk/rN+K9/SKHE07pZhxbRAniUQdrfV8G8etiVpccP1bDJd9YytaJ+5rx9b6gxG" +
  "BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAEedVb8jHAbu50xW7OaBUH/b" +
  "Gy3qP0jlECsc2iVrwTjwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpXhxt4oQKZ2BJ9edwWR7rJImKmlaPGRX9WhiYkhoddZ+CRl5O" +
  "14WI3iAqgtVQXuCVNuD9VqJEjxLu1wDbTc/Kl4yXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZtD/6J/XX9kp0wJsfKVh53ksJqzbfyd" +
  "1RSzIap7OM5eg8TXXg4Dc5BsOhXRlFEaMnYbBgz61IevPjnZTo7JbPfAcEAAUCTO8BAAQACQO8CAwAAAAAAAkGAAIADgMGAQEDAgACDAIAAACA" +
  "lpgAAAAAAAYBAgERBRoGAAIBBREFCgUQAAsNDA4RAgEGAwAHBxIPCCTlF8uXeuOtKgEAAADOAWQAAYCWmAAAAAAAoQELAAAAAAAyAAAGAwIAAA" +
  "EJARP2eHSgLfDYc9RFsZ3gHFWXI0g1IoC70DnrAmB8wlf2A9XXmQUT0NapmA==";

/** The fee payer / taker both transactions were built for. A public key; it signs nothing here. */
export const REAL_SWAP_TAKER = "GdxxRejTS1VWftHBxecT6nGpNzqfDKHBYk6ddfurCu9L";
