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

/* ------------------------------------------------------------------ *
 * RAYDIUM. Real, UNSIGNED transactions from Raydium's Trade API
 * (`POST /transaction/swap-base-in`), captured 2026-11-27 for the same
 * public wallet. Never signed, never submitted. Each comes with the
 * amounts its quote stated, because Raydium's swap instruction carries
 * them and the structural check compares them to the unit.
 * ------------------------------------------------------------------ */

/** SOL → USDC, 0.01 SOL, 50 bps. Three router instructions: wrap SOL, the swap, close the wrapped-SOL account. */
export const REAL_RAYDIUM_TX_SOL_TO_USDC =
  "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQADEOhXe3MT5v9275mWMq" +
  "2yky+jWowiU1YM/q7XNKUDiaL7QJ4lEHa31fBvHrYlaXHD9WwyXfWMrWifua8fW+oMRgcGm4hX/quBhPtof2NGGMA12sQ53BrrO1WYoPAAAAAA" +
  "AQPpQTNdW4CC+xvvuncx2f/DJP6zfivf0ihxNO6WYcW0xvp6877brTo9ZfNqq8l0MbG75MLS9uDkfKYCA0UvXWGBbmZjDDu3JNxZ5J9sxDBuYD" +
  "pqrMoG+j404rQK1ZedjXTnAJwTH4VqMGLaHLJe7Bu1GJFzX99HVtv9fCf1Zi+AT/Gd5oSMoL8hbRWvfxMMzjWV6kSzlNnY9gEtko4R3i1VpGi6" +
  "tchCxp9FOlhjS9xDpoGWSbW8vILH4UMLkvu2VSMP3evEQocTG/2d/HXosYcN8j2rRbUhYeFutrNaNEulvi7dD3nWPTYEEN+rrd0uHtaEKsZBv4" +
  "0pN+PWHCPS9LBqOHsObbXkXce6EMn6qS0QC6Pw8NYarYBqM90SNwrR5t0v1/LjiM4/rlTAZczRSDGmxs2fhwI24TnW8NAoRso8DMKAy2vjGSxQ" +
  "ODgBz0QwGA+eP4ZjIjrIAQaXENv31QcFSlNamSkhBk0k6HFg2jh8fDW13bySu4HkH6hAQQVEjQMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmz" +
  "pAAAAAEj/s6PczyV17lhTdKnKuxoH7OXz71+QVfsc+2aOAS/AFDQYAAQIQERIJBYCWmAAAAAAADRQQExESAAEDFAMCBAUGBwgJDgoLDBEAgJaY" +
  "AAAAAAAw6AoAAAAAAA0GAAEAEBESAQYPAAkD7SUBAAAAAAAPAAUCJAcCAAEZjx9MOkUiY9QTss0X68vBoOWIc2TmJhoSqBeS6hZaPgAFAgcAAx" +
  "A=";
export const REAL_RAYDIUM_SOL_TO_USDC_TERMS = { inputAmountRaw: "10000000", minimumOutputRaw: "714800", outputAmountRaw: "718392" } as const;

/** USDC → SOL, 5 USDC, 50 bps. Two router instructions: the swap, then close (unwrap) the wrapped-SOL account. */
export const REAL_RAYDIUM_TX_USDC_TO_SOL =
  "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQADD+hXe3MT5v9275mWMq" +
  "2yky+jWowiU1YM/q7XNKUDiaL7A+lBM11bgIL7G++6dzHZ/8Mk/rN+K9/SKHE07pZhxbRAniUQdrfV8G8etiVpccP1bDJd9YytaJ+5rx9b6gxG" +
  "B8b6evO+2606PWXzaqvJdDGxu+TC0vbg5HymAgNFL11hBpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAGBbmZjDDu3JNxZ5J9sxDBuYD" +
  "pqrMoG+j404rQK1ZedjXTnAJwTH4VqMGLaHLJe7Bu1GJFzX99HVtv9fCf1Zi+AVaRourXIQsafRTpYY0vcQ6aBlkm1vLyCx+FDC5L7tlVP8Z3m" +
  "hIygvyFtFa9/EwzONZXqRLOU2dj2AS2SjhHeLSMP3evEQocTG/2d/HXosYcN8j2rRbUhYeFutrNaNEulvi7dD3nWPTYEEN+rrd0uHtaEKsZBv4" +
  "0pN+PWHCPS9LBqOHsObbXkXce6EMn6qS0QC6Pw8NYarYBqM90SNwrR5gzCgMtr4xksUDg4Ac9EMBgPnj+GYyI6yAEGlxDb99UHBUpTWpkpIQZN" +
  "JOhxYNo4fHw1td28kruB5B+oQEEFRI0DBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAAIZftsjALakKAV9oGBa6a2ugn1XyBkjhk9nN9t" +
  "jKSoP8BAwTDxAREgABAhMCAwQFBgcICQ0KCxEAQEtMAAAAAACwfCAEAAAAAAwGAAIADxESAQYOAAkD7VgBAAAAAAAOAAUCYroBAAEZjx9MOkUi" +
  "Y9QTss0X68vBoOWIc2TmJhoSqBeS6hZaPgAFAgMHABA=";
export const REAL_RAYDIUM_USDC_TO_SOL_TERMS = { inputAmountRaw: "5000000", minimumOutputRaw: "69237936", outputAmountRaw: "69585866" } as const;

/** BONK → USDC, 50 bps, built for a wallet that holds no BONK (structure only — it would not simulate). One router instruction: the swap. */
export const REAL_RAYDIUM_TX_TOKEN_TO_USDC =
  "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQADC+hXe3MT5v9275mWMq" +
  "2yky+jWowiU1YM/q7XNKUDiaL7rXPLgQuWHPXvuML1HRfw6iMWDwcyy8qUpn8I8jWXSqkD6UEzXVuAgvsb77p3Mdn/wyT+s34r39IocTTulmHF" +
  "tLwHxW5grT0/F3OC6sZUj7of0yz9kMoCs+fPoYX9znOYxvp6877brTo9ZfNqq8l0MbG75MLS9uDkfKYCA0UvXWHgm5e3XiUsI/5R+edpbdvO8h" +
  "cJ+PDQgil+618UF85bvpWLR3oJIzAhzkSrpAiVN5H2pV1/V+nM5pmLNMDBXg5dPjgelVOHjEXnnzPW02x4QaEqWIOPU2qyEkaYjAYLHJsMwoDL" +
  "a+MZLFA4OAHPRDAYD54/hmMiOsgBBpcQ2/fVB0FXsFgPMcX85EpiWC28+deO51lDoISjk7NQNo0iiZMIAwZGb+UhFzL/7K26csOb57yM5bvF9x" +
  "JrLEObOkAAAADY6pAYMW+5J1FvhhGa0J0QOskayarzcPtccGJ/R5bEMAMIGAsMDQ4AAQIPAgMEBQkFBQUGBwUFBQUFBREAACgujNEAAABm6yUB" +
  "AAAAAAoACQP5PAUAAAAAAAoABQLKcQAAARmPH0w6RSJj1BOyzRfry8Gg5YhzZOYmGhKoF5LqFlo+AAUCAwcADg==";
export const REAL_RAYDIUM_TOKEN_TO_USDC_TERMS = { inputAmountRaw: "900000000000", minimumOutputRaw: "19262310", outputAmountRaw: "19359106" } as const;
