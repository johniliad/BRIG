# Metric Library (v1.0.0)

The knowledge base contains **120 metrics** across 12 categories (10 each). The canonical source is
`src/data/metric-library.json`, generated from the compact specification in `scripts/metric-spec.mjs`.
Each metric includes: definition, unit, data type, directionality, board/trend/risk relevance,
executive meaning, recommended visualisations, related metrics, story tags, caveats, version and
active flag.

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
