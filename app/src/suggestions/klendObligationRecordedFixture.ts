/**
 * klendObligationRecordedFixture — a RECORDED Kamino obligations API response for
 * the end-to-end regression suite over the OBLIGATION-HELD deposit path.
 *
 * WHY THIS EXISTS. A deposit made through Kamino's own app is held by the
 * obligation, not as wallet cTokens. That path shipped with no end-to-end
 * coverage, and four separate production bugs hid in it (position invisible →
 * valueless → unpriced/no APY → Safety Buffer "unresolved"), each found by a
 * real user one fix at a time. The REC fixtures replay this recorded response
 * through the REAL production chain — parse → collateral extraction → account
 * synthesis → 17A redemption/withdrawal math → Safety Buffer — so a change to
 * any link fails loudly instead of matching a source-text regex.
 *
 * PROVENANCE. Shape recorded 2026-08-03 from
 *   GET https://api.kamino.finance/kamino-market/{market}/users/{owner}/obligations
 * against mainnet (top-level keys, `state.deposits` entry shape including the
 * SYSTEM_PROGRAM padding rows, `refreshedStats`). Identifiers are the APPROVED
 * Kamino Direct USDC identity (market 7u3He…, reserve D6q6w…); the wallet
 * address is synthetic; amounts mirror the real position this was debugged
 * against (12,779.612672 cTokens ≈ 15,263.60 USDC at the recorded exchange rate).
 *
 * If Kamino changes this response shape, UPDATE THIS RECORDING from a live call —
 * do not hand-edit fields to make tests pass.
 */

/** The approved Kamino Direct USDC identity (mirrors POSITION_IDENTITY). */
export const RECORDED_MARKET = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";
export const RECORDED_RESERVE = "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59";
/** Synthetic owner — obligations are fetched per wallet; the body does not repeat it. */
export const RECORDED_OWNER = "RecordedTestWa11et111111111111111111111111111";
/** Raw cToken units supplied (decimals 6): 12,779.612672 cTokens. */
export const RECORDED_COLLATERAL_RAW = "12779612672";

const SYSTEM_PROGRAM = "11111111111111111111111111111111";

/** Empty padding slot exactly as the live API returns it. */
const PADDING_DEPOSIT = {
  depositReserve: SYSTEM_PROGRAM,
  depositedAmount: "0",
  marketValueSf: "0",
  borrowedAmountAgainstThisCollateralInElevationGroup: "0",
  padding: ["0", "0", "0", "0", "0", "0", "0", "0", "0"],
};

/**
 * The recorded response body: ONE obligation with a single USDC deposit in the
 * approved reserve, no borrows, plus the padding rows the parser must skip.
 */
export const RECORDED_OBLIGATIONS_RESPONSE: unknown = [
  {
    obligationAddress: "RecordedOb1igation11111111111111111111111111",
    state: {
      deposits: [
        {
          depositReserve: RECORDED_RESERVE,
          depositedAmount: RECORDED_COLLATERAL_RAW,
          // ~15,263.60 USD × 2^60 (informational in the recording; the production
          // path values via the reserve exchange rate, never this field).
          marketValueSf: "17601191506067398656655155",
          borrowedAmountAgainstThisCollateralInElevationGroup: "0",
          padding: ["0", "0", "0", "0", "0", "0", "0", "0", "0"],
        },
        PADDING_DEPOSIT,
        PADDING_DEPOSIT,
      ],
      borrows: [],
    },
    market: RECORDED_MARKET,
    deposits: {},
    borrows: {},
    refreshedStats: {
      borrowLimit: "0",
      borrowLiquidationLimit: "0",
      userTotalBorrow: "0",
      userTotalDeposit: "15263.60",
      userTotalCollateralDeposit: "15263.60",
      userTotalLiquidatableDeposit: "15263.60",
      liquidationLtv: "0.9",
      borrowUtilization: "0",
      netAccountValue: "15263.60",
      leverage: "1",
      potentialElevationGroupUpdate: 0,
    },
    obligationTag: 0,
    borrowOrder: 0,
    humanTag: "vanilla",
  },
];

/** The same shape, but the deposit sits in an UNVETTED market/reserve. */
export const RECORDED_UNVETTED_RESPONSE: unknown = [
  {
    obligationAddress: "RecordedOb1igation21111111111111111111111111",
    state: {
      deposits: [
        {
          depositReserve: "H3t6qZ1JkguCNTi9uzVKqQ7dvt2cum4XiXWom6Gn5e5S", // USDT reserve — real, but not vetted
          depositedAmount: "82999908930",
          marketValueSf: "113903487156845177883353",
          borrowedAmountAgainstThisCollateralInElevationGroup: "0",
          padding: ["0", "0", "0", "0", "0", "0", "0", "0", "0"],
        },
        PADDING_DEPOSIT,
      ],
      borrows: [],
    },
    market: "ByYiZxp8QrdN9qbdtaAiePN8AAr3qvTPppNJDpf5DVJ5", // JLP market — real, but not vetted
    deposits: {},
    borrows: {},
    refreshedStats: {},
    obligationTag: 0,
    borrowOrder: 0,
    humanTag: "vanilla",
  },
];

/** Borrow-only obligation: a borrow must never synthesize supplied collateral. */
export const RECORDED_BORROW_ONLY_RESPONSE: unknown = [
  {
    obligationAddress: "RecordedOb1igation31111111111111111111111111",
    state: {
      deposits: [PADDING_DEPOSIT],
      borrows: [
        {
          borrowReserve: RECORDED_RESERVE,
          borrowedAmountSf: "1152921504606846976000000000",
          padding: ["0", "0"],
        },
      ],
    },
    market: RECORDED_MARKET,
    deposits: {},
    borrows: {},
    refreshedStats: {},
    obligationTag: 0,
    borrowOrder: 0,
    humanTag: "vanilla",
  },
];

/**
 * Deterministic reserve snapshot matching the recorded position: exchange rate
 * exactly 1.194371 (the live rate at recording time), ample available liquidity,
 * healthy status/emergency flags. 12,779.612672 cTokens × 1.194371 = 15,263.60.
 */
export const RECORDED_RESERVE_SNAPSHOT = {
  estimatedTotalSupplySf: ((2n ** 60n) * 1194371n).toString(),
  collateralMintTotalSupplyRaw: "1000000",
  totalAvailableLiquidityRaw: "11154269586099",
  queuedLiquidityRaw: "0",
  reserveStatus: 0,
  reserveVersion: 1,
  reserveEmergencyMode: 0,
  marketEmergencyMode: 0,
  reserveSourceSlot: 436752001,
  marketSourceSlot: 436752001,
  cTokenMintSourceSlot: 436752001,
};

/** The USD value the chain must resolve to (± rounding). */
export const RECORDED_EXPECTED_USD = 15263.6;
