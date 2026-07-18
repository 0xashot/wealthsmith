/**
 * token2022Enrichment — Step 17E. READ-ONLY binary decode of Token-2022 (Token Extensions) mints +
 * accounts via the installed @solana/spl-token 0.4.14 primitives, feeding the PURE assessment
 * (token2022PositionAssessment.ts). Dynamically imported so spl-token's extension code is code-split off
 * the main bundle and its failure is isolated. STRICTLY READ-ONLY: getMultipleAccountsInfo / getEpochInfo
 * / getSlot only — no signing, no transaction, no simulation.
 *
 * Per §4/§5: each unique mint is fetched + decoded ONCE per refresh; each account is decoded from BINARY
 * (unpackAccount) rather than parsed fields; wrong-owner / malformed data fails closed. No second Solana
 * connection is created — the caller passes its existing one.
 */
import type { Connection } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  type Token2022MintFacts,
  type Token2022AccountFacts,
  type Token2022PositionResult,
  assessToken2022Position,
} from "./token2022PositionAssessment";

/** Decode one refresh's Token-2022 holdings into per-mint assessments. Fully guarded → empty map on failure. */
export async function fetchToken2022Assessments(
  connection: Connection,
  accounts: Array<{ address: string; mint: string }>,
): Promise<Map<string, Token2022PositionResult>> {
  const out = new Map<string, Token2022PositionResult>();
  if (accounts.length === 0) return out;
  try {
    const [spl, web3] = await Promise.all([import("@solana/spl-token"), import("@solana/web3.js")]);
    const { PublicKey } = web3 as typeof import("@solana/web3.js");
    const s = spl as typeof import("@solana/spl-token");
    const TOKEN_2022 = new PublicKey(TOKEN_2022_PROGRAM_ID);

    let currentSlot = 0;
    let currentEpoch = 0n;
    try { currentSlot = Number(await connection.getSlot()); } catch { /* slot best-effort */ }
    try { currentEpoch = BigInt((await connection.getEpochInfo()).epoch); } catch { /* epoch best-effort → fee unresolved */ }
    const epochKnown = currentEpoch > 0n || currentEpoch === 0n; // getEpochInfo succeeded sets a real epoch

    const uniqueMints = [...new Set(accounts.map((a) => a.mint))];
    const uniqueAccounts = [...new Map(accounts.map((a) => [a.address, a])).values()];

    // Fetch mints + accounts (batched). getMultipleAccountsInfo accepts up to 100 keys per call.
    const mintInfos = await connection.getMultipleAccountsInfo(uniqueMints.map((m) => new PublicKey(m)));
    const acctInfos = await connection.getMultipleAccountsInfo(uniqueAccounts.map((a) => new PublicKey(a.address)));

    // Decode each unique mint → facts (fail-closed per mint).
    const mintFacts = new Map<string, Token2022MintFacts>();
    uniqueMints.forEach((mintB58, i) => {
      const info = mintInfos[i];
      try {
        if (!info || info.owner.toBase58() !== TOKEN_2022_PROGRAM_ID) return; // wrong owner → skip (classic SPL handled elsewhere)
        const mint = s.unpackMint(new PublicKey(mintB58), info, TOKEN_2022);
        const extTypes: number[] = s.getExtensionTypes(mint.tlvData);
        const nonTransferable = s.getNonTransferable(mint) != null;
        const hook = s.getTransferHook(mint);
        const pausable = s.getPausableConfig(mint);
        const isPausable = extTypes.includes(s.ExtensionType.PausableConfig);
        const confidential = extTypes.includes(s.ExtensionType.ConfidentialTransferMint);
        const feeConfig = s.getTransferFeeConfig(mint);
        let transferFee: Token2022MintFacts["transferFee"] = null;
        let transferFeeUnresolved = false;
        if (feeConfig) {
          if (!epochKnown) { transferFee = { currentBps: 0, currentMaxFeeRaw: "0" }; transferFeeUnresolved = true; }
          else {
            const fee = s.getEpochFee(feeConfig, currentEpoch);
            transferFee = { currentBps: Number(fee.transferFeeBasisPoints), currentMaxFeeRaw: fee.maximumFee.toString() };
          }
        }
        mintFacts.set(mintB58, {
          mint: mintB58, mintOwnerProgram: TOKEN_2022_PROGRAM_ID, mintExtensionTypes: extTypes,
          nonTransferable, paused: isPausable ? (pausable ? pausable.paused : null) : undefined,
          hasTransferHook: hook != null, hasConfidentialMint: confidential,
          transferFee, transferFeeUnresolved, fresh: true, sourceSlot: currentSlot,
        });
      } catch { /* malformed mint → skip (no facts → its accounts won't be assessed) */ }
    });

    // Decode each account → facts (fail-closed per account), grouped by mint.
    const acctFactsByMint = new Map<string, Token2022AccountFacts[]>();
    uniqueAccounts.forEach((a, i) => {
      const info = acctInfos[i];
      try {
        if (!info || info.owner.toBase58() !== TOKEN_2022_PROGRAM_ID) return;
        const acct = s.unpackAccount(new PublicKey(a.address), info, TOKEN_2022);
        const extTypes: number[] = s.getExtensionTypes(acct.tlvData);
        const withheld = s.getTransferFeeAmount(acct)?.withheldAmount ?? null;
        // AccountState (installed enum): Uninitialized=0, Initialized=1, Frozen=2 — derived from booleans.
        const accountState = !acct.isInitialized ? 0 : acct.isFrozen ? 2 : 1;
        const facts: Token2022AccountFacts = {
          address: a.address, mint: acct.mint.toBase58(), owner: acct.owner.toBase58(),
          ownerProgram: TOKEN_2022_PROGRAM_ID, amountRaw: acct.amount.toString(),
          accountState, isClosed: false, accountExtensionTypes: extTypes,
          withheldRaw: withheld != null ? withheld.toString() : null, fresh: true, sourceSlot: currentSlot,
        };
        const list = acctFactsByMint.get(facts.mint) ?? [];
        list.push(facts);
        acctFactsByMint.set(facts.mint, list);
      } catch { /* malformed account → skip */ }
    });

    // Assess per mint that has both mint facts and ≥1 account.
    for (const [mintB58, accts] of acctFactsByMint) {
      const mf = mintFacts.get(mintB58);
      if (!mf) continue; // mint decode failed → leave the row unenriched (classic behavior)
      out.set(mintB58, assessToken2022Position(accts, mf));
    }
  } catch { /* whole enrichment failed → empty map (strict no-op) */ }
  return out;
}
