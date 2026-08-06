# knip — dead-code detection (`npm run deadcode`)

Guards against "generation rot": a superseded implementation surviving unnoticed
while live code re-duplicates it (a 14-file orphaned component generation and 6
further dead modules were removed when this was introduced).

## Why each `ignore` entry exists — re-justify before extending this list

- `protocolDataAdapters.kamino.ts` — deliberate STUB documented in
  suggestions/README + protocolDataSources.md as the backend adapter design.
- `SwapQuoteAlternatives.tsx` — designed Step 23C "Compared routes" disclosure,
  not yet mounted (SwapQuoteSelectedState intentionally omits it).
- `MarketConditionsSurface.tsx` — deliberately unmounted; fixture MCS-2 asserts
  it stays informational-only while unmounted.

`stableYieldProductionProbeEntry.ts` is an `entry`, not an ignore: the probe
script bundles it via an esbuild string path knip cannot follow.
