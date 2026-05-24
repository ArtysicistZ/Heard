# Cicero API Reference

> Cicero is a legislative district matching + elected official lookup API, originally built by Azavea (Philadelphia), acquired by Melissa in March 2024. API continues at the same endpoints.

## Base URL & Authentication

**Base URL:**
```
https://app.cicerodata.com/v3.1
```

All requests use HTTPS. Default response is XML — append `format=json` to get JSON.

**Authentication — API Key (simplest):**
- Generate from "My Profile" on the Cicero dashboard
- Pass as query parameter: `?key={api_key}`
- Example:
  ```
  https://app.cicerodata.com/v3.1/official?key=YOUR_KEY&format=json&lat=39.9526&lon=-75.1635
  ```

**Authentication — User + Token:**
1. POST to `/v3.1/token/new.json` with `username={username}&password={password}`
2. Response returns `token`, `user` (user ID), `success` boolean
3. Pass on subsequent calls: `?user={user_id}&token={token}`
4. Tokens valid until end of next day (UTC). On 403, request a new token.

---

## Endpoints

| Endpoint | Method | Purpose | Cost |
|---|---|---|---|
| `/official` | GET | Officials by location or name | 1 credit |
| `/legislative_district` | GET | Legislative district boundaries by location | 1 credit |
| `/nonlegislative_district` | GET | Non-legislative boundaries (school, judicial, county) | 1 credit |
| `/map/{id}` | GET | District boundary map (PNG/JPEG) or GeoJSON | 1 credit |
| `/officials_by_region` | GET | Bulk officials by region (requires permission) | 50 credits |
| `/election_event` | GET | Election event information | Free |
| `/district_type` | GET | List all supported district types | Free |
| `/coverage` | GET | Data coverage by region | Free |
| `/account/credits_remaining` | GET | Check credit balance | Free |
| `/version` | GET | API version info | Free |

---

## Query Parameters

### Location Parameters (shared by `/official`, `/legislative_district`, `/nonlegislative_district`)

| Parameter | Description |
|---|---|
| `lat` | Latitude (most accurate method) |
| `lon` | Longitude |
| `search_loc` | Single-line address string (e.g., `990+spring+garden+st+philadelphia+pa`) |
| `search_address` | Street address component |
| `search_city` | City component |
| `search_state` | State/province component |
| `search_postal` | ZIP/postal code (supports ZIP+4) |
| `search_country` | ISO 3166-1 alpha-2 code (e.g., `US`) |

**Accuracy order:** lat/lon > full address > postal code.

### Filter Parameters

| Parameter | Description |
|---|---|
| `district_type` | Filter by district type (repeatable for OR logic) |
| `district_id` | Filter by specific district ID/number |
| `city` | Filter by city |
| `state` | Filter by state/province |
| `country` | Filter by country code |

### Pagination

| Parameter | Description |
|---|---|
| `max` | Results per page (default 40, max 200) |
| `offset` | Skip N results |
| `order` | Field name to sort by |
| `sort` | `asc` or `desc` |
| `format` | `json` or `xml` (default xml) |

---

## District Types

### Legislative Types (officials tracked)

| Value | Description | Our `level` Mapping |
|---|---|---|
| `NATIONAL_EXEC` | President | (not used in Heard) |
| `NATIONAL_UPPER` | US Senate | `us_senate` |
| `NATIONAL_LOWER` | US House | `us_house` |
| `STATE_EXEC` | Governor | `statewide` |
| `STATE_UPPER` | State Senate | `state_senate` |
| `STATE_LOWER` | State House/Assembly | `state_house` |
| `LOCAL_EXEC` | Mayor | `municipal` |
| `LOCAL` | City Council | `municipal` |

### Non-Legislative Types (from `/nonlegislative_district`)

| Value | Description |
|---|---|
| `COUNTY` | County boundaries |
| `SCHOOL` | School district boundaries |
| `JUDICIAL` | Judicial district boundaries |

### Practical Grouping for Heard

```python
CICERO_TO_HEARD_LEVEL = {
    "NATIONAL_UPPER":  "us_senate",
    "NATIONAL_LOWER":  "us_house",
    "STATE_EXEC":      "statewide",
    "STATE_UPPER":     "state_senate",
    "STATE_LOWER":     "state_house",
    "LOCAL_EXEC":      "municipal",
    "LOCAL":           "municipal",
}

# To query all levels in one call, repeat district_type:
# ?district_type=NATIONAL_UPPER&district_type=NATIONAL_LOWER&district_type=STATE_UPPER&district_type=STATE_LOWER&district_type=LOCAL
```

---

## Response JSON Structure

### Standard Wrapper

All endpoints return:
```json
{
  "response": {
    "errors": [],
    "messages": [],
    "results": { ... }
  }
}
```

### IMPORTANT: Candidates vs Flat Results

- **Query by address** (`search_loc`/`search_address`): results wrapped in `candidates[]` array (geocoder may return multiple matches)
- **Query by lat/lon**: results are **flat** (no `candidates` wrapper)

Always check for `candidates` key in response.

### `/official` with lat/lon — Response

```json
{
  "response": {
    "results": {
      "count": { "from": 0, "to": 39, "total": 64 },
      "officials": [ ... ]
    }
  }
}
```

### `/official` with address — Response

```json
{
  "response": {
    "results": {
      "candidates": [
        {
          "count": { "from": 0, "to": 9, "total": 10 },
          "officials": [ ... ],
          "districts": [ ... ],
          "match_addr": "990 Spring Garden St, Philadelphia, PA 19123",
          "score": 100,
          "x": -75.154,
          "y": 39.961
        }
      ]
    }
  }
}
```

### Official Object

```json
{
  "id": 123456,
  "first_name": "John",
  "last_name": "Doe",
  "middle_initial": "Q",
  "party": "Democrat",
  "photo_origin_url": "https://s3.amazonaws.com/cicero-media-files/...",
  "email_addresses": ["john.doe@example.gov"],
  "urls": ["https://doe.house.gov"],
  "web_form_url": "https://example.gov/contact",
  "valid_from": "2023-01-03",
  "valid_to": "2025-01-03",
  "initial_term_start_date": "2019-01-03",
  "current_term_start_date": "2023-01-03",
  "term_end_date": "2025-01-03",
  "addresses": [
    {
      "address_1": "123 Capitol Ave",
      "address_2": "Suite 200",
      "city": "Harrisburg",
      "state": "PA",
      "county": "Dauphin",
      "postal_code": "17101",
      "phone_1": "717-555-0100",
      "fax_1": "717-555-0101"
    }
  ],
  "office": {
    "title": "State Representative",
    "representing_state": "PA",
    "chamber": {
      "name_formal": "Pennsylvania House of Representatives",
      "name_short": "PA House",
      "type": "lower",
      "country": "US",
      "state": "PA"
    },
    "district": {
      "district_type": "STATE_LOWER",
      "district_id": "182",
      "label": "Pennsylvania State House District 182",
      "ocd_id": "ocd-division/country:us/state:pa/sldl:182",
      "state": "PA",
      "country": "US"
    }
  },
  "identifiers": [
    {
      "identifier_type": "TWITTER",
      "identifier_value": "@JohnDoe"
    }
  ]
}
```

### `/legislative_district` — Response

```json
{
  "response": {
    "results": {
      "candidates": [
        {
          "count": { "total": 6 },
          "districts": [
            {
              "district_type": "STATE_LOWER",
              "district_id": "182",
              "label": "Pennsylvania State House District 182",
              "ocd_id": "ocd-division/country:us/state:pa/sldl:182",
              "state": "PA",
              "country": "US",
              "valid_from": "2022-01-01",
              "valid_to": "2032-01-01"
            }
          ],
          "match_addr": "...",
          "score": 100,
          "x": -75.154,
          "y": 39.961
        }
      ]
    }
  }
}
```

---

## Credit System & Pricing

### Cost Per Call
- `/official` — 1 credit
- `/legislative_district` — 1 credit
- `/nonlegislative_district` — 1 credit
- `/map/{id}` — 1 credit
- `/officials_by_region` — 50 credits
- All other endpoints — free

### Pricing (2024)

| Credits | Commercial | Nonprofit/Gov/Edu |
|---|---|---|
| 5,000 | $298 | $268 |
| 10,000 | $388 | $348 |
| 25,000 | $648 | $578 |
| 100,000 | $1,648 | $1,498 |

- **Free trial:** 1,000 credits valid for 90 days
- **Credit expiry:** 1 year from purchase
- **Check balance:** `X-Cicero-Credit-Balance` response header, or `/account/credits_remaining`

### Rate Limits
- **200 requests per minute** (soft limit)
- 99.99% uptime SLA

---

## Verified Test Results (Philadelphia City Hall, 2026-04-12)

Query: `GET /v3.1/official?lat=39.9526&lon=-75.1635&format=json&key={KEY}&district_type=NATIONAL_UPPER&district_type=NATIONAL_LOWER&district_type=STATE_UPPER&district_type=STATE_LOWER&district_type=LOCAL`

**13 officials returned:**

| Name | Party | Cicero `district_type` | `district_id` | Heard `level` |
|------|-------|----------------------|---------------|---------------|
| John Fetterman | Democrat | `NATIONAL_UPPER` | PA | `us_senate` |
| Dave McCormick | Republican | `NATIONAL_UPPER` | PA | `us_senate` |
| Dwight Evans | Democrat | `NATIONAL_LOWER` | 3 | `us_house` |
| Nikil Saval | Democrat | `STATE_UPPER` | 1 | `state_senate` |
| Ben Waxman | Democrat | `STATE_LOWER` | 182 | `state_house` |
| Jeffery Young | Democrat | `LOCAL` | 5 | `municipal` |
| Nina Ahmad | Democrat | `LOCAL` | At Large | `municipal_at_large` |
| Kendra Brooks | Working Families | `LOCAL` | At Large | `municipal_at_large` |
| Jim Harrity | Democrat | `LOCAL` | At Large | `municipal_at_large` |
| Rue Landau | Democrat | `LOCAL` | At Large | `municipal_at_large` |
| Nicolas O'Rourke | Working Families | `LOCAL` | At Large | `municipal_at_large` |
| Katherine Richardson | Democrat | `LOCAL` | At Large | `municipal_at_large` |
| Isaiah Thomas | Democrat | `LOCAL` | At Large | `municipal_at_large` |

**Key observations:**
- `district_id = "At Large"` distinguishes at-large council from district council
- US Senators have `district_id = "PA"` (the state abbreviation)
- Response is **flat** (no `candidates` wrapper) because we queried by lat/lon
- 1 credit consumed for all 13 officials

### Real Official Object (Ben Waxman, STATE_LOWER, District 182)

```json
{
  "id": 698935,
  "first_name": "Ben",
  "last_name": "Waxman",
  "party": "Democrat",
  "valid_from": "2022-12-01 00:00:00",
  "valid_to": "2026-12-01 00:00:00",
  "current_term_start_date": "2022-12-01 00:00:00",
  "term_end_date": "2026-12-01 00:00:00",
  "photo_origin_url": "https://www.palegis.us/resources/images/members/300/1981.jpg?20260216110226",
  "email_addresses": [],
  "web_form_url": "https://www.pahouse.com/Waxman/Contact",
  "urls": [
    "https://www.palegis.us/house/members/bio/1981/rep-waxman",
    "https://www.pahouse.com/Waxman/"
  ],
  "addresses": [
    {
      "address_1": "P.O. Box 202182",
      "address_2": "226 Irvis Office Building",
      "city": "Harrisburg",
      "state": "PA",
      "postal_code": "17120",
      "phone_1": "(717) 783-4072",
      "fax_1": "(717) 787-5066"
    },
    {
      "address_1": "1500 Walnut Street",
      "address_2": "10th Floor",
      "city": "Philadelphia",
      "state": "PA",
      "postal_code": "19102",
      "phone_1": "(215) 246-1501"
    }
  ],
  "office": {
    "title": "Representative",
    "representing_state": "PA",
    "district": {
      "district_type": "STATE_LOWER",
      "district_id": "182",
      "label": "Pennsylvania House of Representatives district 182",
      "ocd_id": "ocd-division/country:us/state:pa/sldl:182",
      "state": "PA",
      "country": "US",
      "valid_from": "2022-12-01 00:00:00",
      "valid_to": "2032-12-01 00:00:00"
    },
    "chamber": {
      "name_formal": "Pennsylvania House of Representatives",
      "name": "House",
      "type": "LOWER",
      "official_count": 203,
      "term_length": "2 years",
      "url": "https://www.palegis.us/house"
    }
  },
  "identifiers": [
    { "identifier_type": "TWITTER", "identifier_value": "RepBenWaxman" },
    { "identifier_type": "FACEBOOK-OFFICIAL", "identifier_value": "https://www.facebook.com/RepBenWaxman" },
    { "identifier_type": "INSTAGRAM", "identifier_value": "repbwaxman" },
    { "identifier_type": "LINKEDIN", "identifier_value": "https://www.linkedin.com/in/ben-waxman-73253a6" }
  ],
  "committees": [
    { "name": "House Appropriations Committee" },
    { "name": "House Communications & Technology Committee" },
    { "name": "House Finance Committee" },
    { "name": "House Housing & Community Development Committee" },
    { "name": "House State Government Committee" }
  ]
}
```

**Fields we extract for Heard:**
- `first_name` + `last_name` → official name
- `party` → party affiliation
- `office.title` → title (e.g., "Representative", "Senator")
- `office.district.district_type` → maps to Heard `level`
- `office.district.district_id` → district number or "At Large" or state abbrev
- `office.district.label` → human-readable district name
- `addresses[].phone_1` → phone numbers
- `email_addresses[]` → emails (often empty — use `web_form_url` as fallback)
- `web_form_url` → contact form URL
- `photo_origin_url` → headshot
- `identifiers[]` → social media links (Twitter, Facebook, Instagram)

---

## How Heard Should Use Cicero

### Recommended Flow: One API call during onboarding

```
POST /api/civic/locate  (our endpoint)
  → Frontend sends { lat, lng } from browser geolocation
  → Backend calls Cicero: GET /v3.1/official?lat={lat}&lon={lng}&format=json&key={KEY}
  → Parse response to extract:
       - council_district  (from district_type=LOCAL)
       - state_house_dist  (from district_type=STATE_LOWER)
       - state_senate_dist (from district_type=STATE_UPPER)
       - congressional_dist (from district_type=NATIONAL_LOWER)
       - state (from any district)
       - city (from address or LOCAL district)
  → Store in user_profile
  → Return districts to frontend for confirmation
```

### Why `/official` Instead of `/legislative_district`

Using `/official` (1 credit) returns **both** officials AND their districts in one call. This is more efficient than calling `/legislative_district` (1 credit) + then looking up officials separately.

### Caching Strategy

Since district boundaries change rarely (every 10 years with redistricting):
- Cache lat/lng → districts mapping aggressively (hours/days)
- Round lat/lng to 3-4 decimal places for cache keys (~10-100m precision)
- This reduces API calls for users in the same neighborhood

---

## Sources

- [Cicero API Docs](https://app.cicerodata.com/docs/)
- [Cicero Product Page](https://www.cicerodata.com/api/)
- [Cicero Pricing](https://www.cicerodata.com/pricing/)
- [python-cicero GitHub](https://github.com/cicero-data/python-cicero)
- [Cicero Status](https://status.cicerodata.com)
