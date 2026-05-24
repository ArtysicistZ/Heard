# US Political District & Election System — Developer Reference

## 1. All Levels of Government

A single US citizen may have **30+ elected representatives** simultaneously.

### Federal Level
| Office | Scope | Term | Count |
|--------|-------|------|-------|
| President & VP | Nationwide (Electoral College) | 4 years | 1 |
| US Senator | Statewide | 6 years (staggered) | 2 per state, 100 total |
| US Representative | Congressional district | 2 years | 1 per district, 435 total |

### State Level (Pennsylvania)
| Office | Scope | Term | Count in PA |
|--------|-------|------|-------------|
| Governor | Statewide | 4 years | 1 |
| Lt. Governor | Statewide (runs with Gov since 2022) | 4 years | 1 |
| Attorney General | Statewide | 4 years | 1 |
| State Treasurer | Statewide | 4 years | 1 |
| Auditor General | Statewide | 4 years | 1 |
| State Senator | State senate district | 4 years (staggered) | 50 districts |
| State Representative | State house district | 2 years | 203 districts |

### County Level
| Office | Scope | Notes |
|--------|-------|-------|
| District Attorney | County-wide | Elected in PA |
| Sheriff | County-wide | Elected in PA |
| County Controller | County-wide | |
| Register of Wills | County-wide | Elected in PA |
| Coroner | County-wide | Some PA counties |

### Municipal Level (Philadelphia)
| Office | Scope | Notes |
|--------|-------|-------|
| Mayor | Citywide | 4-year term |
| City Council (district) | Council district | 10 districts |
| City Council (at-large) | Citywide | 7 seats, max 5 from one party |
| City Controller | Citywide | |
| City Commissioners | Citywide | 3 elected, run elections |

### Judicial (elected in PA)
| Court | Scope |
|-------|-------|
| PA Supreme Court | Statewide, 10-year retention |
| PA Superior Court | Statewide |
| PA Commonwealth Court | Statewide |
| Court of Common Pleas | Judicial district |
| Municipal Court | Citywide (in Philadelphia) |

---

## 2. How Districts Work

### Statewide Offices
All registered voters in the state vote. The state itself is the district. Applies to: US Senate, Governor, AG, Treasurer, Auditor General, statewide judges.

### US House — Congressional Districts
- 435 total seats apportioned by population after each census
- Each district contains roughly **761,000 people** (2020 census)
- Pennsylvania currently has **17 congressional districts** (lost 1 seat after 2020)
- District lines redrawn every 10 years

### State Senate Districts
- PA has **50 state senate districts** (~260,000 people each)
- 4-year staggered terms
- Drawn by the Legislative Reapportionment Commission

### State House Districts
- PA has **203 state house districts** (~64,000 people each)
- 2-year terms
- Districts do NOT nest within senate or congressional districts

### City Council — District vs. At-Large

**District-based:** City divided into geographic districts. Each elects one member. Only residents of that district vote.

**At-large:** All voters citywide vote. Multiple seats on same ballot.

**Hybrid (Philadelphia):** 10 district + 7 at-large. Charter guarantees at least 2 minority-party at-large seats (max 5 from one party).

---

## 3. Philadelphia Specifics

### City Council: 17 Members
- **10 District Members** — one from each of 10 council districts
- **7 At-Large Members** — elected citywide, max 5 from one party
- 4-year terms, elections in odd years (next: 2027)

### Congressional Districts Overlapping Philadelphia
Philadelphia is split across **3-4 congressional districts** (post-2020):
- **PA-2** — most of Center City, South Philly, West Philly, North Philly (mostly within city)
- **PA-3** — parts of Northeast Philadelphia, extends to Montgomery County
- **PA-4** — parts of NW Philly (Chestnut Hill, Roxborough), extends to Montgomery County
- **PA-5** — parts of Delaware County, small slice of SW Philadelphia

**Key point:** Philadelphia is NOT in one congressional district. Must geocode to determine which.

### State Legislative Districts in Philadelphia
- **~8-9 state senate districts** wholly or partially within city
- **~28-30 state house districts** wholly or partially within city
- Some districts cross into neighboring counties

### Philadelphia = Philadelphia County
- **Coterminous** — identical boundaries, no separate county government
- City government handles all county functions
- DA, Sheriff, Register of Wills are elected citywide (serving as county officers)

---

## 4. Address → Multi-District Mapping

A single Philadelphia address maps to ALL of these simultaneously:

| Level | Example | How Determined |
|---|---|---|
| US Senate (×2) | Fetterman, McCormick | State of residence |
| US House | PA-3 (Dwight Evans) | Congressional district boundary |
| Governor | Josh Shapiro | State of residence |
| State Senate | 7th District | State senate district boundary |
| State House | 188th District | State house district boundary |
| City Council District | District 3 | Council district boundary |
| City Council At-Large (×7) | All 7 members | City of residence |
| Mayor | Cherelle Parker | City of residence |
| DA | Larry Krasner | County of residence |
| Sheriff | Rochelle Bilal | County of residence |

**Total: 20-30+ elected officials for one address.**

---

## 5. Why Zip Codes Are Bad for Political Geography

### Fundamental Problem
Zip codes are **postal delivery routes**, not political or geographic boundaries. Designed by USPS to optimize mail, not represent constituencies.

### Specific Issues

1. **Zip codes cross district boundaries** — ZIP 19104 spans multiple state house districts and may cross council district boundaries.

2. **Zip codes cross jurisdictions** — ZIP 19027 (Elkins Park) spans both Philadelphia and Montgomery County = completely different local governments.

3. **Zip codes are not polygons** — they're sets of delivery routes. Census creates "ZCTAs" as approximations, but these aren't identical to actual zip codes. Some zip codes are single buildings (ZIP 19101 = PO boxes in Center City, no geographic area).

4. **Zip codes change without notice** — USPS creates, merges, or splits them for operational reasons.

5. **1 in 4 zip codes spans 2+ congressional districts** nationally. Worse in dense urban areas.

### What to Use Instead
- **Street address + geocoding** — gold standard
- **Census blocks** — smallest geographic unit, nest within political districts
- **Ward/division** — for local politics, the atomic election administration unit

---

## 6. How Redistricting Works

### The Cycle
1. **Decennial Census** (2020, 2030...) — count every person
2. **Apportionment** (year after census) — 435 House seats redistributed among states
3. **Redistricting** (1-2 years after census) — new boundaries drawn for:
   - Congressional districts (by state legislature or commission)
   - State senate districts
   - State house districts
   - City council districts (separate process)
4. **New maps take effect** — usually next election (2020 census → 2022 elections)

### Who Draws the Lines in PA?
- **Congressional districts:** State legislature + governor's signature. PA Supreme Court intervened in 2018 (threw out gerrymandered maps).
- **State legislative districts:** Legislative Reapportionment Commission (5-member bipartisan body).
- **City council districts:** City council or city redistricting commission.

### Legal Requirements
- **Equal population** — "one person, one vote" (Reynolds v. Sims, 1964)
- **Voting Rights Act (Section 2)** — cannot dilute minority voting power
- **Contiguity** — districts must be one connected piece
- **Compactness** — preferred but not always required

### Implications for Heard
- **Boundaries change every 10 years** — database must be versionable
- **Court challenges** can force mid-decade redistricting (PA 2018)
- **Transition periods** — person may be "represented" by old-district official while living in new-district boundary
- **Always use most current boundary files** — build system to re-ingest new boundaries

---

## 7. Data Sources for District Boundaries

| Source | What It Provides | Cost |
|--------|-----------------|------|
| [Cicero API](https://cicerodata.com) | Address → districts + officials (all levels) | Paid (1 credit/call) |
| [US Census Geocoder](https://geocoding.geo.census.gov) | Address → census geography + some districts | Free |
| [Google Civic Info API](https://developers.google.com/civic-information) | Address → officials at all levels | Free (with API key) |
| [OpenStates](https://openstates.org) | State legislative data | Free |
| [TIGER/Line Shapefiles](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html) | Official boundary files for all political geographies | Free |
| [OpenDataPhilly](https://opendataphilly.org) | Council districts, ward/division boundaries | Free |
