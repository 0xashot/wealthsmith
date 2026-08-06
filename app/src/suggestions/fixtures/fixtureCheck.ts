/**
 * FixtureCheck — the one shared result shape of the deterministic fixture suite.
 *
 * This directory is the DESTINATION of the ongoing suggestionEngine.fixtures.ts
 * split: one file per domain, each exporting `run<Domain>FixtureChecks():
 * FixtureCheck[]`, aggregated by `printFixtureResults` in the monolith and run
 * via `npm test`. New fixture blocks belong here, not in the monolith; existing
 * blocks migrate as their domains get touched.
 */
export interface FixtureCheck {
  name: string;
  pass: boolean;
  detail: string;
}
