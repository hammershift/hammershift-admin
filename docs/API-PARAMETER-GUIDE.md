# API Parameter Guide: isPlatformTab vs publicOnly

**Last Updated:** 2026-02-27
**Purpose:** Clarify the distinction between similar-sounding API parameters

---

## Quick Reference

| Parameter | Used By | Purpose | Values |
|-----------|---------|---------|--------|
| `isPlatformTab` | **Admin Panel** | Controls which admin view is shown | `"true"` or omit/`"false"` |
| `publicOnly` | **Public Website** | Filters for user-facing auctions | `"true"` or omit |

**TLDR:** If you're building admin features, use `isPlatformTab`. If you're building public-facing features, use `publicOnly`.

---

## Detailed Explanation

### isPlatformTab (Admin Context)

**Endpoint:** `/api/auctions/filter`

**Purpose:** Determines which tab the admin is viewing in the auction management interface.

**Behavior:**

```typescript
// When isPlatformTab = "true" (Admin viewing "Platform Auctions" tab)
// Shows: Auctions that are ACTIVE or have ENDED
{
  $or: [
    { isActive: true },  // Currently live auctions
    { ended: true }      // Completed auctions
  ]
}
// Result: Admins see all auctions that have been activated on the platform,
// regardless of whether they're still accepting predictions or have concluded.

// When isPlatformTab is omitted or "false" (Admin viewing "External Feed" tab)
// Shows: Auctions NOT YET activated with future deadlines
{
  $or: [
    { isActive: { $ne: true } },      // Not active
    { isActive: { $exists: false } }  // Field doesn't exist (legacy data)
  ],
  "sort.deadline": { $gt: now }  // Only future auctions
}
// Result: Admins see auctions from external sources that haven't been
// added to the platform yet and are still accepting bids externally.
```

**Example URLs:**
```
# Admin Panel - Platform Auctions Tab
GET /api/auctions/filter?isPlatformTab=true&offset=0&limit=9

# Admin Panel - External Feed Tab
GET /api/auctions/filter?offset=0&limit=9
```

**Use Cases:**
- Admin wants to see all auctions currently live on Hammershift
- Admin wants to review completed auctions
- Admin wants to find new auctions to add from external sources

---

### publicOnly (Public Website Context)

**Endpoint:** `/api/auctions/filter`

**Purpose:** Filters auctions for the public-facing website where users browse and predict.

**Behavior:**

```typescript
// When publicOnly = "true" (Public website request)
// Shows: ONLY active auctions with future deadlines
{
  isActive: true,
  "sort.deadline": { $gt: now }
}
// Result: Public users only see auctions that are:
// 1. Activated on the platform (isActive = true)
// 2. Still accepting predictions (deadline in the future)
```

**Example URLs:**
```
# Public Website - Active Auctions
GET /api/auctions/filter?publicOnly=true&offset=0&limit=20

# Public Website - Search Active Auctions
GET /api/auctions/filter?publicOnly=true&search=porsche

# Public Website - Filter by Make
GET /api/auctions/filter?publicOnly=true&make=Ferrari&sort=Ending%20Soon
```

**Use Cases:**
- Public website homepage showing active auctions
- User searching for specific cars to predict on
- Mobile app listing current predictions opportunities

---

## Visual Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                    ALL AUCTIONS IN DATABASE                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ EXTERNAL FEED (isPlatformTab=false/omit)             │  │
│  │ Not activated yet + future deadlines                  │  │
│  │                                                        │  │
│  │  [Porsche 911]  [Ferrari F40]  [Lamborghini Murc]   │  │
│  │   ↓ Click "Add to Platform" to activate              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PLATFORM AUCTIONS (isPlatformTab=true)               │  │
│  │ Activated auctions (active OR ended)                  │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │ PUBLIC VIEW (publicOnly=true)                │   │  │
│  │  │ Active + future deadline only                 │   │  │
│  │  │                                               │   │  │
│  │  │  [McLaren F1] [BMW M3] [Audi R8]            │   │  │
│  │  │  ← Users see these on public website         │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                        │  │
│  │  [Sold Porsche]  [Ended Ferrari]  ← Ended auctions  │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Mistakes

### ❌ Don't Do This

```typescript
// WRONG: Using isPlatformTab in public-facing API
// (Exposes admin logic to public users)
fetch(`/api/auctions/filter?isPlatformTab=true`)
```

```typescript
// WRONG: Using publicOnly in admin panel
// (Will hide ended auctions that admins need to see)
fetch(`/api/auctions/filter?publicOnly=true`)
```

```typescript
// WRONG: Using both parameters together
// (Conflicting logic - which takes precedence?)
fetch(`/api/auctions/filter?isPlatformTab=true&publicOnly=true`)
```

### ✅ Do This Instead

```typescript
// CORRECT: Admin Panel - Platform Tab
fetch(`/api/auctions/filter?isPlatformTab=true&offset=0&limit=10`)

// CORRECT: Admin Panel - External Tab
fetch(`/api/auctions/filter?offset=0&limit=10`)

// CORRECT: Public Website
fetch(`/api/auctions/filter?publicOnly=true&offset=0&limit=20`)
```

---

## Why Not Combine Them?

**Question:** "Why not just have one parameter with multiple values?"

**Answer:** Different consumers with different needs:

```typescript
// HYPOTHETICAL (NOT IMPLEMENTED):
// This COULD work but would require API refactoring
fetch(`/api/auctions/filter?viewMode=admin_platform`)
fetch(`/api/auctions/filter?viewMode=admin_external`)
fetch(`/api/auctions/filter?viewMode=public`)

// Current implementation keeps backward compatibility
// and separates concerns between admin/public contexts
```

**Future Improvement:** Consider refactoring to a single `viewMode` parameter in next API version.

---

## Query Logic Reference

Here's the exact MongoDB query logic for each scenario:

### External Feed (Default Admin View)

```javascript
{
  attributes: { $all: [] },  // Optional attribute filters
  $or: [
    { isActive: { $ne: true } },      // Explicitly not active
    { isActive: { $exists: false } }  // Legacy data without field
  ],
  "sort.deadline": { $gt: new Date() }  // Future deadlines only
}
```

**Returns:** ~500-1000 auctions (depends on external scraper)

---

### Platform Auctions (Admin Platform Tab)

```javascript
{
  attributes: { $all: [] },  // Optional attribute filters
  $or: [
    { isActive: true },   // Currently accepting predictions
    { ended: true }       // Completed auctions
  ]
}
```

**Returns:** ~100-300 auctions (depends on activation history)

---

### Public Website View

```javascript
{
  attributes: { $all: [] },  // Optional attribute filters
  isActive: true,                      // Must be activated
  "sort.deadline": { $gt: new Date() }  // Must have future deadline
}
```

**Returns:** ~50-150 auctions (only current active opportunities)

---

## Filtering & Search Behavior

**Important:** Search and filter behavior differs based on context:

| Feature | External Feed | Platform Tab | Public View |
|---------|---------------|--------------|-------------|
| **Search** | ✅ Works | ✅ Works | ✅ Works |
| **Make Filter** | ✅ Works | ✅ Works | ✅ Works |
| **Category Filter** | ✅ Works | ✅ Works | ✅ Works |
| **Combine Search + Filters** | ❌ Search only | ❌ Search only | ❌ Search only |
| **Deadline Filter** | Auto-applied (future) | Not applied | Auto-applied (future) |

**Note:** Search cannot be combined with make/category filters due to MongoDB Atlas Search limitations.

---

## Code Examples

### Admin Panel Integration

```typescript
// src/app/dashboard/auctions/page.tsx

const fetchData = async () => {
  setIsLoading(true);

  const data = await getCarsWithFilter({
    search: searchedKeyword,
    offset: (currentPage - 1) * 9,
    limit: displayCount,
    isPlatformTab: currentTab === "platform",  // ← Key line
  });

  if (data && "cars" in data) {
    setTotalCars(data.total);
    setTotalPages(data.totalPages);
    setCarData(data.cars);
  }

  setIsLoading(false);
};
```

### Public Website Integration

```typescript
// public-website/src/pages/auctions.tsx

const fetchActiveAuctions = async () => {
  const response = await fetch(
    `/api/auctions/filter?publicOnly=true&offset=0&limit=20`,  // ← Key param
    { cache: "no-store" }
  );

  const data = await response.json();
  return data.cars;  // Only active auctions with future deadlines
};
```

---

## Testing Checklist

When testing auction filtering:

- [ ] Admin External Feed shows only non-activated auctions
- [ ] Admin Platform Tab shows active AND ended auctions
- [ ] Public view shows ONLY active auctions with future deadlines
- [ ] Search works in all three contexts
- [ ] Pagination works correctly
- [ ] Deadline filtering is applied correctly
- [ ] Switching tabs doesn't cause data leakage

---

## Migration Path (Future)

If refactoring to a unified parameter:

```typescript
// Current (v1 API)
?isPlatformTab=true
?publicOnly=true

// Future (v2 API)
?context=admin_platform
?context=admin_external
?context=public

// Backward compatibility layer
if (isPlatformTab === "true") {
  context = "admin_platform"
} else if (publicOnly === "true") {
  context = "public"
} else {
  context = "admin_external"
}
```

---

## Related Documentation

- [Admin Panel UX Audit](./ADMIN-PANEL-UX-AUDIT.md)
- [Auction Lifecycle State Machine](./AUCTION-LIFECYCLE.md) *(to be created)*
- [API Error Handling Guide](./API-ERROR-HANDLING.md) *(to be created)*

---

## Questions?

**For Admin Panel issues:** Check admin panel UX audit
**For Public API issues:** Check public API documentation
**For database queries:** See auction model schema
**Still confused?** Open a GitHub discussion or contact the platform team.
