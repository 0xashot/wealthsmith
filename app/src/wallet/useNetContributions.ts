/**
 * useNetContributions — READ-ONLY hook that estimates net contributions (external
 * deposits − withdrawals) over the last 12 months for the connected wallet.
 *
 * It lazily loads `contributionHistory` (Helius parsed tx history + DefiLlama
 * historical prices) — off the main bundle and independent of the main portfolio
 * read, so it never blocks it. Result is cached per owner for the session. Returns
 * `unavailable` when there's no wallet, the RPC isn't Helius, or the read failed —
 * the UI then shows "—" rather than an invented number.
 */
import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { ContributionSummary } from "./contributionHistory";

export interface NetContributionsState {
  loading: boolean;
  summary: ContributionSummary | null;
  /** True when contributions can't be sourced (no wallet / non-Helius RPC / error). */
  unavailable: boolean;
}

/** Session cache keyed by owner — contributions don't change fast. */
const cache = new Map<string, ContributionSummary | null>();

export function useNetContributions(): NetContributionsState {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [state, setState] = useState<NetContributionsState>({
    loading: false,
    summary: null,
    unavailable: false,
  });

  useEffect(() => {
    if (!connected || !publicKey) {
      setState({ loading: false, summary: null, unavailable: false });
      return;
    }
    const owner = publicKey.toBase58();
    const rpcUrl = connection.rpcEndpoint;

    if (cache.has(owner)) {
      const s = cache.get(owner) ?? null;
      setState({ loading: false, summary: s, unavailable: s == null });
      return;
    }

    let cancelled = false;
    setState({ loading: true, summary: null, unavailable: false });
    (async () => {
      try {
        const mod = await import("./contributionHistory");
        const s = await mod.fetchNetContributions(rpcUrl, owner);
        if (cancelled) return;
        cache.set(owner, s);
        setState({ loading: false, summary: s, unavailable: s == null });
      } catch {
        if (cancelled) return;
        setState({ loading: false, summary: null, unavailable: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, connected]);

  return state;
}
