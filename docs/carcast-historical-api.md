# Velocity Markets — Historical Auction Data API

## For: CarCast (Google TimesFM car price prediction)

This document describes the external API for consuming historical BringATrailer auction data from the Velocity Markets platform. The data is normalized and structured for direct ingestion into time-series forecasting models.

---

## Base URL

```
Production: https://admin.velocity-markets.com
```

---

## Authentication

All requests require an API key in the `x-api-key` header.

Keys use the `mm_` prefix and are validated against bcrypt-hashed records in the `mm_api_keys` MongoDB collection.

### Generating a Key

**Via admin panel API** (requires admin session):

```bash
curl -X POST https://admin.velocity-markets.com/api/admin/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin-session-cookie>" \
  -d '{"name": "carcast-prod"}'
```

Response (key shown ONCE — store it securely):
```json
{
  "key": {
    "id": "664a...",
    "name": "carcast-prod",
    "createdAt": "2026-04-12T...",
    "isActive": true
  },
  "plainKey": "mm_abc123...xyz"
}
```

### Using the Key

Include in every request:
```
x-api-key: mm_abc123...xyz
```

### Revoking a Key

```bash
curl -X DELETE "https://admin.velocity-markets.com/api/admin/api-keys?id=<keyId>" \
  -H "Cookie: <admin-session-cookie>"
```

---

## Endpoint: Historical Auction Data

```
GET /api/data/auctions/historical
```

Returns a flat table of resolved auction sales — one row per sale. Only auctions with a confirmed hammer price (resolved via oracle) are included.

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | API key with `mm_` prefix |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `make` | string | — | Filter by vehicle make (case-insensitive exact match). E.g., `Porsche` |
| `model` | string | — | Filter by vehicle model (case-insensitive exact match). E.g., `911` |
| `trim` | string | — | Filter by trim (case-insensitive partial match). E.g., `Carrera` |
| `yearMin` | integer | — | Minimum vehicle year (inclusive) |
| `yearMax` | integer | — | Maximum vehicle year (inclusive) |
| `priceMin` | number | — | Minimum hammer price in USD (inclusive) |
| `priceMax` | number | — | Maximum hammer price in USD (inclusive) |
| `from` | string | — | Start date for sale date range (ISO 8601: `YYYY-MM-DD`) |
| `to` | string | — | End date for sale date range (ISO 8601: `YYYY-MM-DD`) |
| `page` | integer | 1 | Page number (1-indexed) |
| `pageSize` | integer | 500 | Results per page (max 5000) |
| `sort` | string | `date_asc` | Sort order: `date_asc` or `date_desc` |

### Response

```json
{
  "count": 1842,
  "page": 1,
  "pageSize": 500,
  "totalPages": 4,
  "data": [
    {
      "date": "2024-03-15",
      "price": 145000,
      "make": "Porsche",
      "model": "911",
      "trim": "Carrera Rs",
      "year": 1973
    },
    {
      "date": "2024-03-16",
      "price": 67500,
      "make": "Bmw",
      "model": "M3",
      "trim": "Competition",
      "year": 2021
    }
  ]
}
```

### Field Definitions

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `date` | string | No | Sale date in `YYYY-MM-DD` format. Derived from market resolution date, auction deadline, or last update (in that priority). |
| `price` | integer | No | Hammer price (final sale price) in USD. Whole dollars, no cents. Confirmed by oracle signature verification. |
| `make` | string | No | Vehicle manufacturer. Title-cased. Extracted from auction attributes. |
| `model` | string | No | Vehicle model. Title-cased. Extracted from auction attributes. |
| `trim` | string | Yes | Vehicle trim/variant. Title-cased. `null` if not available in auction data. |
| `year` | integer | Yes | Vehicle model year. `null` if not available. `0` should be treated as missing. |

### Data Quality Notes

- Rows with missing `make` or `price <= 0` are excluded server-side.
- Data comes from BringATrailer (BaT) auctions only.
- Hammer prices are oracle-verified (EIP-191 signature from scraper service).
- The `trim` field has lower coverage than make/model — expect nulls.
- `year` stored as integer. Some records may have `0` — treat as missing.
- Make/model values are title-cased for normalization but reflect BaT's categorization.

---

## Example Usage for TimesFM

### Fetch all data for a single make/model

```python
import requests
import pandas as pd

API_KEY = "mm_your_key_here"
BASE_URL = "https://admin.velocity-markets.com"

def fetch_historical(make=None, model=None, page_size=5000):
    """Fetch all historical auction data, paginated."""
    all_data = []
    page = 1

    while True:
        params = {"page": page, "pageSize": page_size, "sort": "date_asc"}
        if make:
            params["make"] = make
        if model:
            params["model"] = model

        resp = requests.get(
            f"{BASE_URL}/api/data/auctions/historical",
            headers={"x-api-key": API_KEY},
            params=params,
        )
        resp.raise_for_status()
        body = resp.json()
        all_data.extend(body["data"])

        if page >= body["totalPages"]:
            break
        page += 1

    return pd.DataFrame(all_data)


# Fetch Porsche 911 sales
df = fetch_historical(make="Porsche", model="911")
df["date"] = pd.to_datetime(df["date"])
df = df.sort_values("date")

print(f"Records: {len(df)}")
print(df.head())
```

### Prepare for TimesFM

```python
from timesfm import TimesFm

# Group by month for smoother time series
monthly = df.set_index("date").resample("M")["price"].agg(["mean", "median", "count"])
monthly = monthly[monthly["count"] >= 3]  # Drop months with too few sales

# TimesFM expects a 1D array of values
time_series = monthly["median"].values

# Initialize and forecast
tfm = TimesFm(
    context_len=128,
    horizon_len=12,  # Predict 12 months ahead
    input_patch_len=32,
    output_patch_len=128,
)
tfm.load_from_checkpoint()

forecast = tfm.forecast([time_series])
print("12-month price forecast:", forecast[0])
```

### Fetch everything (all makes/models)

```python
# For cross-vehicle analysis or building covariates
df_all = fetch_historical()

# Pivot: one series per make+model
for (make, model), group in df_all.groupby(["make", "model"]):
    if len(group) < 20:  # Skip sparse series
        continue
    series = group.set_index("date").resample("M")["price"].median()
    # Feed each series to TimesFM...
```

---

## Rate Limits

No explicit rate limit is enforced on this endpoint currently. Be reasonable — batch your fetches and cache locally. If you need the full dataset, fetch once with `pageSize=5000` and paginate through all pages.

---

## Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 401 | `{"error": "Unauthorized — provide a valid API key via x-api-key header"}` | Missing, invalid, or revoked API key |
| 500 | `{"error": "Internal server error"}` | Server-side failure (DB connection, aggregation error) |

---

## Key Management API (Admin Only)

These endpoints require an active admin session (cookie-based auth, role: `owner` or `admin`).

### List Keys

```
GET /api/admin/api-keys
```

Returns all keys (active and revoked) without exposing the hashed key value.

### Create Key

```
POST /api/admin/api-keys
Content-Type: application/json

{"name": "carcast-prod"}
```

Returns the plain key in `plainKey` field. **This is the only time the key is visible.** Store it immediately.

### Revoke Key

```
DELETE /api/admin/api-keys?id=<keyObjectId>
```

Soft-revokes the key (sets `isActive: false`, `revokedAt: now`). Key immediately stops working.

---

## Data Source

- **Source:** BringATrailer (BaT) auction results
- **Scraper:** Separate service that monitors BaT, posts hammer prices to admin webhook
- **Verification:** Oracle EIP-191 signature on every hammer price
- **Coverage:** All auctions that the Velocity Markets platform has tracked and resolved
- **Freshness:** New data appears after auction resolution (typically within hours of BaT auction close)
