# Auction Workflow Guide for Admins

**Last Updated:** 2026-02-27
**Purpose:** Clear, step-by-step guide for managing auctions in the admin panel

---

## Quick Start: Adding an Auction to Platform

### Step 1: Navigate to Auctions

1. Log in to admin panel
2. Click "Auctions" in sidebar
3. You'll see two tabs:
   - **External Feed** (default) - Auctions you can add
   - **Platform Auctions** - Auctions already on your platform

### Step 2: Find an Auction

**In External Feed Tab:**
- Browse available auctions from external sources (BringATrailer, Cars & Bids)
- Use search bar to find specific make/model/year
- Check the "Time Left" to ensure deadline hasn't passed

**What you see:**
- 🟡 Yellow "Add to Platform" button = Not yet added
- 🟢 Green "Added to Platform" badge = Already activated
- ⏰ Time left until external auction ends

### Step 3: Add to Platform

1. Click "Add to Platform" button
2. Button changes to loading spinner (⏳)
3. After ~2 seconds, button becomes green checkmark (✅)
4. Auction is now live on Hammershift

**What happens behind the scenes:**
- Auction `isActive` flag set to `true`
- AI agents begin generating predictions (takes 2-5 minutes)
- Auction appears in "Platform Auctions" tab
- Users can now see and predict on this auction

### Step 4: Monitor Platform Auctions

1. Switch to "Platform Auctions" tab
2. You'll see all active and ended auctions
3. Use table view (desktop) or card view (mobile)

**Available actions:**
- 🔍 **View Predictions** - See who predicted what
- ✏️ **Edit** - Update details (image, price, description)
- 🔁 **Reprompt** - Retry failed AI predictions
- 🗑️ **Delete** - Deactivate auction (actually sets to inactive)

---

## Understanding Auction States

### State Diagram

```
┌─────────────────┐
│  EXTERNAL       │  Admin has not added to platform yet
│  (isActive=false)│  Users cannot see or predict
└────────┬────────┘
         │
         │ Click "Add to Platform"
         ▼
┌─────────────────┐
│  ACTIVE         │  Live on platform, accepting predictions
│  (isActive=true)│  Users can see and predict
│  (ended=false)  │  Deadline in future
└────────┬────────┘
         │
         │ Deadline passes OR admin clicks "End"
         ▼
┌─────────────────┐
│  ENDED          │  No longer accepting predictions
│  (ended=true)   │  Results can be calculated
└─────────────────┘
```

### State Details

| State | isActive | ended | What Users See | What Admins See |
|-------|----------|-------|----------------|-----------------|
| **External** | `false` | `false` | Nothing (hidden) | External Feed tab |
| **Active** | `true` | `false` | Can predict | Platform tab |
| **Ended** | `true` | `true` | View only (no predict) | Platform tab |
| **Inactive** | `false` | varies | Nothing (hidden) | External Feed tab |

**Note:** "Delete" in Platform tab doesn't actually delete - it sets `isActive` back to `false`, moving the auction back to External Feed.

---

## Common Workflows

### Workflow 1: Curating Daily Auctions

**Goal:** Add 5-10 high-quality auctions each day

1. Open External Feed tab
2. Filter by:
   - Make: Porsche, Ferrari, Lamborghini (popular brands)
   - Sort: "Ending Soon" (prioritize closing auctions)
3. Review each auction:
   - Check image quality (clear, high-res)
   - Verify details (year, make, model accurate)
   - Ensure deadline is at least 2 days away (give users time to predict)
4. Click "Add to Platform" for selected auctions
5. Switch to Platform tab to verify they appear

**Best Practices:**
- Add auctions with 3-7 days remaining (sweet spot for user engagement)
- Diversify: Mix eras, categories, price ranges
- Avoid duplicates: Check Platform tab first

---

### Workflow 2: Editing Auction Details

**Goal:** Fix incorrect information or update pricing

1. Go to Platform Auctions tab
2. Find the auction (use search if needed)
3. Click ✏️ Edit icon
4. Update fields:
   - **Image URL** - Replace with better image if needed
   - **Make/Model/Year** - Fix typos
   - **Current Bid** - Update to latest price from external site
   - **Description** - Add context or clarifications
   - **Status** - Change from Active → Ended (closes predictions)
5. Click "Save Changes"

**Warning:** Changing status from Active → Ended will immediately close predictions. Users will not be able to submit new predictions after this.

---

### Workflow 3: Managing AI Agent Predictions

**Goal:** Ensure all AI agents have generated predictions

1. Go to Platform Auctions tab
2. Click 🔁 Reprompt icon for any auction
3. Modal shows agents with failed predictions
4. Click 🔁 Retry icon next to agent name
5. Wait for ✓ checkmark (indicates success)

**Common Issues:**
- Agent gets ❌ unsuccessul status: AI couldn't parse response format
- Solution: Click retry, if still fails after 3 attempts, report to dev team

---

### Workflow 4: Viewing Predictions

**Goal:** Check who predicted what for audit/moderation

1. Go to Platform Auctions tab
2. Click 🔍 Eye icon on any auction
3. Modal shows table:
   - User/Agent name
   - Role badge (USER or AGENT)
   - Predicted price
   - Status (active, completed, refunded)
4. For agent predictions, delete button (🗑️) available if needed

**Use Cases:**
- Audit suspicious predictions
- Verify AI agent performance
- Check prediction distribution before results

---

### Workflow 5: Ending Auctions Early

**Goal:** Close predictions before external deadline

1. Go to Platform Auctions tab
2. Find the auction
3. Click ✏️ Edit icon
4. Change Status dropdown: Active → Ended
5. Confirm warning modal
6. Click "Save Changes"

**When to use:**
- External auction ended early (sold before deadline)
- Data quality issues discovered
- Emergency: inappropriate content

**Impact:** Users can no longer submit predictions. Existing predictions remain for scoring.

---

## Search & Filter Tips

### Searching

**Search works across:**
- Make (e.g., "Porsche")
- Model (e.g., "911", "Carrera")
- Year (e.g., "1995")
- Combinations (e.g., "1995 Porsche 911")

**Search is fuzzy:** "ferari" finds "Ferrari"

**Limitation:** Search cannot be combined with filters. If you search "Porsche", you can't also filter by location.

### Filtering

**Available Filters:**
- **Make** - Porsche, Ferrari, Lamborghini, etc.
- **Category** - Sports Car, Sedan, SUV, etc.
- **Era** - Classic, Modern, Vintage
- **Location** - By U.S. state

**Multiple Values:**
API uses `$` delimiter: `make=Porsche$Ferrari`
UI handles this automatically when you select multiple

### Sorting

| Sort Option | What It Does | Use Case |
|-------------|--------------|----------|
| **Newly Listed** | Most recent first (default) | Check latest additions |
| **Ending Soon** | Soonest deadline first | Prioritize time-sensitive |
| **Most Expensive** | Highest price first | Find premium auctions |
| **Least Expensive** | Lowest price first | Budget-friendly options |
| **Most Bids** | Most activity first | Popular/competitive |
| **Least Bids** | Least activity first | Undiscovered gems |

---

## Troubleshooting

### "Deadline has passed for this auction"

**Cause:** Trying to add an auction that already ended externally

**Solution:**
- Check the external site (BringATrailer, etc.)
- If truly ended, don't add it
- If deadline wrong in our system, contact dev team to fix scraper

---

### "Auction not found"

**Cause:** Invalid auction ID or auction deleted

**Solution:**
- Refresh page
- Try searching for auction by make/model
- If persists, may be database issue - report to dev team

---

### "Added to Platform" but not seeing predictions

**Cause:** AI agents still generating predictions (takes 2-5 minutes)

**Solution:**
- Wait 5 minutes
- Refresh Platform Auctions tab
- Click 🔍 View Predictions to check progress
- If after 10 minutes still no predictions, use 🔁 Reprompt

---

### Auction showing in wrong tab

**Scenario:** Auction in Platform tab but shows as inactive

**Cause:** Conflicting `isActive` and `ended` flags

**Solution:**
1. Click ✏️ Edit
2. Set status explicitly: Active or Ended
3. Save changes
4. If issue persists, contact dev team

---

### Search not working

**Cause:** MongoDB Atlas Search index not built or stale

**Solution:**
- Try exact match instead of fuzzy
- Use filters instead of search temporarily
- Report to dev team - search index may need rebuild

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search bar |
| `Tab` | Switch between tabs |
| `Esc` | Close modal |
| `Ctrl/Cmd + R` | Refresh auction list |

---

## Best Practices

### DO ✅

- Add auctions with at least 48 hours remaining
- Verify external auction still active before adding
- Update prices periodically to match external site
- Check image quality before adding
- Monitor AI prediction generation
- Diversify auction selection (variety = engagement)

### DON'T ❌

- Add auctions with <24 hours remaining (users need time)
- Add duplicate auctions (check Platform tab first)
- Delete auctions with active predictions (use End status instead)
- Edit auction details after predictions submitted (unless critical fix)
- Forget to verify changes (check Platform tab after adding)

---

## Metrics to Monitor

As an admin, keep an eye on:

- **Daily Additions:** 5-10 new auctions/day target
- **Active Auctions:** Maintain 30-50 at any time
- **Prediction Rate:** >80% of active auctions should have predictions
- **Failed Agents:** <5% of AI predictions should fail

Access metrics from Dashboard (future feature)

---

## FAQ

**Q: What's the difference between "Delete" and "End"?**
A: "Delete" (🗑️) sets `isActive=false` (moves to External Feed). "End" (via Edit) sets `ended=true` (stays in Platform but closed).

**Q: Can users still see ended auctions?**
A: Yes, they appear as "Ended" with view-only access. Good for reference.

**Q: How long do auctions stay in External Feed?**
A: Until deadline passes. Then they auto-filter out.

**Q: Can I reactivate a deleted auction?**
A: Yes, find it in External Feed and click "Add to Platform" again.

**Q: What happens if external deadline changes?**
A: Scraper updates nightly. Manual edit available if urgent.

**Q: Why do some auctions show "statusAndPriceChecked"?**
A: Internal flag. Ignore - used by background scraper for data validation.

---

## Related Documentation

- [Admin Panel UX Audit](./ADMIN-PANEL-UX-AUDIT.md) - Usability issues and improvements
- [API Parameter Guide](./API-PARAMETER-GUIDE.md) - Technical details for developers
- [Auction State Machine](./AUCTION-LIFECYCLE.md) - State transitions *(to be created)*

---

## Need Help?

- **UI Issues:** Check UX Audit document
- **API Questions:** Check API Parameter Guide
- **Bugs:** Open GitHub issue with screenshot
- **Feature Requests:** Discuss with product team
- **Emergency:** Contact platform team via Slack #admin-support

---

**Last Updated:** 2026-02-27 | **Version:** 1.0
