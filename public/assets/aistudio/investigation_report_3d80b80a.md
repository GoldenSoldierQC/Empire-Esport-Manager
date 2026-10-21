# AoE2 Competitive Intelligence Agent: Source Investigation Report

**Document Version:** 1.0.0  
**Target Domain:** Age of Empires II: Definitive Edition (Esports Analytics & Simulation)  
**Primary Source:** [aoestats.io](https://aoestats.io/)  
**Reference APIs & Catalogs:** [aoe-api.worldsedgelink.com](https://www.google.com/url?sa=E&source=gmail&q=https://aoe-api.worldsedgelink.com), [Liquipedia AoE2 API](https://www.google.com/url?sa=E&source=gmail&q=https://liquipedia.net/ageofempires/api.php), [ustacode/aoe2-apis](https://github.com/ustacode/aoe2-apis)

---

## 1. Executive Summary

This report establishes the technical foundation for the **AoE2 Competitive Intelligence Agent**, an autonomous data-engineering engine designed to feed an Age of Empires II esports management simulation game. Through systematic investigation of community APIs, reverse-engineered telemetry, and bulk dumps, we identify the exact schemas, endpoints, update cadences, legal restrictions, and operational boundaries required for a robust, production-grade intelligence pipeline.

---

## 2. Confirmed Data Sources & Endpoints

### 2.1 Primary Bulk Source: AoEStats.io
* **Website:** [https://aoestats.io](https://aoestats.io/)
* **API Documentation:** [https://aoestats.io/api-info/](https://aoestats.io/api-info/)
* **FAQ & Methodology:** [https://aoestats.io/faq](https://aoestats.io/faq)
* **Metadata / Catalog Endpoint:** `GET https://aoestats.io/api/db_dumps`
  * Returns a list of available weekly database dumps and snapshot intervals.
* **Bulk Parquet Download Pattern:**
  * Matches: `https://aoestats.io/media/db_dumps/date_range={START_DATE}_{END_DATE}/matches.parquet`
  * Players: `https://aoestats.io/media/db_dumps/date_range={START_DATE}_{END_DATE}/players.parquet`
  * Example: `/media/db_dumps/date_range=2023-04-23_2023-04-29/matches.parquet`

### 2.2 Live Upstream Telemetry: World's Edge / Relic Link Backend
The underlying upstream source that feeds AoEStats, AoE2Companion, and AoE2Insights is the official game backend:
* **Host:** `https://aoe-api.worldsedgelink.com` (legacy fallback: `https://aoe-api.reliclink.com`)
* **Key Endpoints:**
  * `GET /community/leaderboard/getAvailableLeaderboards?title=age2` (ladders & civilizations)
  * `GET /community/leaderboard/getPersonalStat?title=age2&aliases=["<player_alias>"]`
  * `GET /community/leaderboard/getRecentMatchHistory?title=age2&profile_ids=[<profile_id>]`
* **Characteristics:** Real-time completed ranked matches, no API key required, highly sensitive to request rate; intended for point lookups rather than bulk downloads.

### 2.3 Esports & Tournament Data: Liquipedia AoE2
* **API Endpoint:** `https://liquipedia.net/ageofempires/api.php`
* **Characteristics:** MediaWiki action API providing tournament brackets, prize pools, teams, sponsorships, and tier ratings (S-Tier, A-Tier, B-Tier). Governed by strict rate limits (1 request / 2 seconds) and custom User-Agent requirements.

---

## 3. Actual Schemas & Field Definitions

AoEStats database dumps are partitioned into two relational Parquet entities linked by `game_id`:

### 3.1 `Match` Schema
| Field | Type | Nullable | Description |
|---|---|---|---|
| `game_id` | string | No | Unique game identifier (maps across platforms and community sites) |
| `started_timestamp` | datetime/timestamp | No | Match start timestamp (UTC) |
| `duration` | timestamp / seconds | No | In-game match duration |
| `map` | string | No | Map name (e.g., "Arabia", "Arena", "Nomad") |
| `avg_elo` | float | Yes | Mean rating of all players in the match |
| `num_players` | int | No | Total player count (2 for 1v1, 4 for 2v2, 6 for 3v3, 8 for 4v4) |
| `team_0_elo` | float | Yes | Mean rating of Team 0 |
| `team_1_elo` | float | Yes | Mean rating of Team 1 |
| `replay_enhanced` | boolean | No | True if game replay file was parsed for detailed telemetry |
| `leaderboard` | string | No | Ladder name (e.g., "1v1 Random Map", "Team Random Map") |
| `mirror` | boolean | No | True if opposing sides played identical civilizations |
| `patch` | int | Yes | Game build/patch identifier (inferred from timestamp) |
| `raw_match_type` | int | No | Ladder code (6=1v1 RM, 7=2v2 RM, 8=3v3 RM, 9=4v4 RM, 66-69=Controller) |
| `game_type` | string | No | Game type (e.g., "random_map", "empire_wars", "deathmatch") |
| `game_speed` | string | No | In-game speed factor ("normal", "fast", etc.) |
| `starting_age` | string | No | Starting age ("dark", "feudal", "castle", etc.) |

### 3.2 `Player` Schema
| Field | Type | Nullable | Description |
|---|---|---|---|
| `game_id` | string | No | Foreign key referencing `Match.game_id` |
| `profile_id` | int | No | Stable player profile identifier |
| `civ` | string | No | Civilization played (e.g., "Franks", "Mayans", "Mongols") |
| `winner` | boolean | No | Match outcome for this player (True = Win, False = Loss) |
| `team` | int | No | Team index (0 or 1) |
| `old_rating` | int | Yes | Player rating entering the match |
| `new_rating` | int | Yes | Player rating post-match |
| `match_rating_diff`| float | Yes | Rating delta between opposing teams from this player's view |
| `feudal_age_uptime`| float | Yes | Seconds to Feudal Age (requires `replay_enhanced=True`) |
| `castle_age_uptime`| float | Yes | Seconds to Castle Age (requires `replay_enhanced=True`) |
| `imperial_age_uptime`| float | Yes | Seconds to Imperial Age (requires `replay_enhanced=True`) |
| `opening` | string | Yes | Inferred opening strategy (e.g., "Scout Rush", "Archer Flush") |
| `replay_summary_raw`| string/json| Yes | Nested telemetry of units, buildings, and techs per age |

---

## 4. Update Frequency & Historical Coverage

* **Dump Frequency:** Generated every Sunday evening UTC, encompassing matches from the prior calendar week.
* **Volume:** ~236,000 matches per week (~472,000 player-match rows for 1v1). Over 32.9 million matches in cumulative storage.
* **Historical Reach:** Weekly snapshot archives date from April 2023 through current operational cycles.
* **Filtering Applied by Upstream Source:**
  1. Duration between 5 minutes and 180 minutes (in-game time).
  2. Ranked matchmaking games only.
  3. Non-mirror matches for civilization win rate aggregation.
  4. Excludes early disconnects.
  5. Excludes extreme "one-trick pony" accounts (>100 matches with >=80% single-civ pick rate).

---

## 5. Known Limitations & Data Quality Anomalies

1. **Dirty Player Counts:** The creator of AoEStats explicitly discloses that scrubbing occasionally fails, permitting matches with odd player counts (1, 3, 5, 7 players). Our validation pipeline must quarantine these anomalous games.
2. **Missing Replay Data:** Over 60% of matches lack replay downloads (`replay_enhanced = False`). Consequently, `feudal_age_uptime`, `castle_age_uptime`, and `opening` are frequently null. Downstream metrics must never assume 100% telemetry coverage.
3. **Ranked Matchmaking vs. Pro Tournaments:** AoEStats captures public ladder matchmaking, NOT closed esports tournaments (such as Red Bull Wololo, King of the Desert, or Warlords). High Elo (2000+) serves as a strong proxy for competitive caliber, but tournament results, contracts, and prize winnings must not be fabricated from ladder data.
4. **Small Sample Sizes at Top Elo:** Matches at Elo 2000+ represent only ~1% of all games. Head-to-head civ matchup sample sizes can drop below 10 games per patch. Win rates in this bracket must always be accompanied by sample sizes and 95% confidence intervals (Wilson score intervals).

---

## 6. Recommended Ingestion & Storage Architecture

1. **Storage Hybrid:**
   * **Parquet:** Columnar storage for raw and normalized historical match/player tables, partitioned by snapshot date range (`data/raw/` and `data/normalized/`).
   * **SQLite:** Relational database (`data/metadata.db`) for source registries, ingest run manifests, quarantine error catalogs, and aggregated scouting boards.
2. **Quarantine Strategy:**
   * Records violating referential integrity (e.g., orphan player rows), invalid player counts, or corrupt ratings are diverted to `data/quarantine/` with diagnostic rejection tags.
3. **Repeatable & Idempotent Ingestion:**
   * Downloader computes SHA-256 hashes of incoming snapshot files.
   * Incremental deduplication on primary keys `(game_id)` and `(game_id, profile_id)`.
4. **Offline Resilience:**
   * When running in sandboxed or air-gapped environments without outbound internet, the engine detects network status gracefully, utilizes cached/local snapshots, and provides complete synthetic verification fixtures.

---

## 7. Legal, Attribution & Usage Terms

* AoEStats operates under Microsoft's **"Game Content Usage Rules"** using assets and telemetry from Age of Empires II: Definitive Edition.
* Commercial redistribution of raw Microsoft game telemetry is restricted; derived analytical metrics and simulation models are compliant.
* Attribution must be preserved: `"Data sourced from aoestats.io under Microsoft Game Content Usage Rules."`
* Liquipedia data is licensed under **CC BY-SA 3.0**, requiring explicit attribution and share-alike licensing if tournament brackets are ingested.
