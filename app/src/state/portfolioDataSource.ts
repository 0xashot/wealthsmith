/**
 * portfolioDataSource — the explicit separation between the three ways the app
 * can render portfolio-shaped content, so fixture data is never presented as the
 * connected wallet's real holdings (see patterns/wallet-connection.md — Data
 * Mode Separation, and rules/financial-logic-boundaries.md — Demo Mode Boundary).
 *
 *   - "demo_fixture"    — Demo Mode: sample fixtures + sample suggestions.
 *   - "real_wallet"     — a real wallet is connected: live read-only wallet data
 *                          and safe "unavailable" states (no fixture values).
 *   - "example_fixture" — the connected-wallet reference fixture
 *                          (examples/dashboard/dashboard-connected-wallet-state.json).
 *                          For tests / storybook / dev reference ONLY — never the
 *                          normal real-wallet flow.
 */
import type { AppMode } from "../App";

export type PortfolioDataSource = "demo_fixture" | "real_wallet" | "example_fixture";

/**
 * The data source for the running app given the current mode. Demo → demo
 * fixtures; a connected real wallet → live wallet reads. (Disconnected has no
 * portfolio data source; onboarding/empty states own that surface.)
 */
export function portfolioDataSourceForMode(mode: AppMode): PortfolioDataSource | null {
  if (mode === "demo") return "demo_fixture";
  if (mode === "connected") return "real_wallet";
  return null;
}
