# Metric Library (v1.0.0)

The knowledge base contains **120 metrics** across 12 categories (10 each). The canonical source is
`src/data/metric-library.json`, generated from the compact specification in `scripts/metric-spec.mjs`.
Each metric includes: definition, unit, data type, directionality, board/trend/risk relevance,
executive meaning, recommended visualisations, related metrics, story tags, caveats, version and
active flag.

The current library uses three directionality modes: `higher_is_better`, `lower_is_better` and
`context_dependent`. The engine and conditional UI also support `target_value`, `target_range` and
`not_directional` for future governed definitions. A target-value definition requires a target plus lower and
upper acceptable limits; a target-range definition requires lower and upper acceptable bounds.

Metric definitions provide stable inherent-importance context. They do not make a current-period observation
material by themselves; findings require comparison, target, tolerance or relationship evidence.

For each selected metric, the application requires an explicit data status. An available metric requires a
current value. Comparison values are recommended but may be omitted with a stated reason; targets and tolerance
fields are mandatory only when required by the directionality. Optional earlier history improves persistence and
confidence. Optional benchmarks are retained as sourced report context only and do not affect methodology 2.0
findings.

| Letter | Category | Metrics |
|--------|----------|---------|
| A | Security incidents and threat activity | 10 |
| B | Detection, SOC and response | 10 |
| C | Vulnerability and exposure management | 10 |
| D | Patch and configuration management | 10 |
| E | Identity and access security | 10 |
| F | Endpoint, network and cloud security | 10 |
| G | Data security and privacy | 10 |
| H | Resilience, recovery and availability | 10 |
| I | Human risk and security culture | 10 |
| J | Governance, risk, compliance and assurance | 10 |
| K | Third-party, supply-chain and ecosystem risk | 10 |
| L | Strategy, investment, people and executive outcomes | 10 |

## Board Essentials preset

A curated, editable preset of 16 metrics spans threat pressure, material incidents, response,
vulnerability exposure, identity, endpoint, resilience, risk, third-party, investment, strategy and
human risk (see `BOARD_ESSENTIAL_KEYS` in `src/data/library.ts`).

## Regenerating

```bash
npm run build:library   # rewrites src/data/metric-library.json from scripts/metric-spec.mjs
npm run export:seed     # rewrites data/*.json and database/seed.sql
```

The same JSON is served by `GET /api/metrics.php` and seeded into MySQL (`database/seed.sql`).
