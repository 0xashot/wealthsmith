# The fixture suite

8,000+ deterministic checks that pin every contract of the suggestion engine and
its product surfaces: eligibility, amounts, copy, guardrails, fail-closed states,
and architecture rules. **Offline, no secrets, no RPC** — a guard (16H-G-BJ)
scans this directory to keep it that way.

## Running

```bash
npm test           # quiet: exits non-zero on any FAIL
npm run test:verbose
```

`scripts/run-fixtures.mjs` bundles an entry that calls `printFixtureResults()`
(the aggregator in `../suggestionEngine.fixtures.ts`) with esbuild and runs it in
Node. There is no test framework — each check is `add(name, booleanResult, detail)`.

## Layout

- `../suggestionEngine.fixtures.ts` — **aggregator only** (~250 lines): imports
  every domain's `run*FixtureChecks()` and concatenates them in
  `printFixtureResults()`. It contains no checks itself.
- `engineFixtureHarness.ts` — **the shared harness**: the fixture-only
  `runSuggestionEngine` wrapper (auto-supplies canonical buffer + On Track
  overrides), input/position/goal builders (`inputsFor`, `solPosition`,
  `bufferFixture`, …), and synthetic isolated candidates
  (`buildEngineFixtureDcaCandidate`, `synthTrimCandidate`, …). Every domain file
  builds on these.
- One file per domain (`*.fixtures.ts`), e.g. `engineCore` (ordering/mapper/
  contracts/review), `productionSurfaces` (Buffer/On Track/Trim/PO/Rebalance
  production incl. the Kamino two-step source), `solLiquidStaking`,
  `contributionPlan`, `steakhouseRiskGovernance`, `klendDirect`,
  `targetAllocationMarket`, `swapQuote` (lives in `../swapQuote/`), etc.
- `fixtureCheck.ts` — the shared `FixtureCheck` type.

## Conventions

- **Behavioral first.** Prefer running the real derivation (the engine, the rail,
  an assessment) and asserting its output. Source-reading checks are reserved for
  what behavior cannot prove:
  - **Deletion guards** — `readIfSrc(path) === ""` proves a legacy module stays
    deleted.
  - **Forbidden-reference sweeps** — scanning `src/` for imports/strings that
    must not exist (e.g. no product file imports the fixture-only registry, no
    `VITE_`-prefixed secret names). These carry an `allowed` regex that
    whitelists this directory — the suite legitimately *names* the strings it
    scans for. Extend the allow-list when adding a domain file, never by
    weakening the pattern.
  - **Mount/wiring pins** — a regex proving a page actually mounts a derivation.
- **Self-match trap:** a presence-pin that reads a fixture file can be satisfied
  by check *titles* rather than code. If a pin must read the suite, point it at
  the specific file holding the real definition/usage (see 7D-9/7D-10, which scan
  an explicit file blob that excludes the file they live in).
- **Contract changes are deliberate.** When product behavior changes, the failing
  check is updated in the same change, with the new contract stated in its name.
  Check names are stable identifiers — grep them.
