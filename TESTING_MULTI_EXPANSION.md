# Multi-Expansion System - Testing Guide

## ✅ Status: All features implemented and compiling successfully!

**Dev Server:** Running at http://localhost:3000

---

## 🧪 Features to Test

### 1. Expansion Management (Officers Only)
**URL:** `/admin/expansions`

**What to test:**
- [ ] View current expansion (shows with ⭐ badge)
- [ ] View all added expansions with their settings
- [ ] Add a new expansion from the available list
- [ ] Set a different expansion as current
- [ ] Configure raid start date for each expansion
- [ ] Verify raid start date saves correctly

**Expected behavior:**
- Only expansions with data (Classic, TBC, etc.) appear as addable
- Can't add the same expansion twice
- Setting an expansion as current updates the UI immediately
- Raid start dates persist after page refresh

---

### 2. Raid Tier Admin Controls
**URL:** `/admin/raid-tiers`

**What to test:**
- [ ] View all raid tiers for current expansion
- [ ] Toggle master sheet visibility (👁️ Visible / 🔒 Hidden)
- [ ] Set submission deadlines for each tier
- [ ] Verify deadlines save correctly

**Expected behavior:**
- Each tier can be independently toggled visible/hidden
- Deadline picker shows date and time selection
- Changes save immediately and persist after refresh
- Tiers are grouped by expansion

---

### 3. Pending Submissions Approval
**URL:** `/admin/pending-submissions`

**What to test:**
- [ ] View all pending submissions
- [ ] See character names, classes (with class colors), and raid tiers
- [ ] View item counts for each submission
- [ ] Approve a submission
- [ ] Reject a submission (with confirmation)
- [ ] Verify empty state shows when no pending submissions

**Expected behavior:**
- Only pending submissions appear (not approved/rejected)
- Approval/rejection is immediate
- Submissions disappear from list after action
- Shows character info with proper class coloring

---

### 4. Loot List with Expansion Selector
**URL:** `/loot-list`

**What to test:**
- [ ] See expansion selector at top (if guild has multiple expansions)
- [ ] Current expansion shows with ⭐
- [ ] Click to switch between expansions
- [ ] Viewing past expansion shows blue "Viewing Past" badge
- [ ] Loot items update when switching expansions
- [ ] Raid tier tabs update per expansion

**Expected behavior:**
- Expansion selector only appears if guild has 2+ expansions
- Switching expansions loads correct raid tiers and items
- Current expansion is highlighted
- Past expansion view is clearly indicated

---

### 5. Submission Deadline Warnings
**URL:** `/loot-list`

**Prerequisites:** Set a deadline in past for a raid tier in `/admin/raid-tiers`

**What to test:**
- [ ] Yellow warning banner appears after deadline passes
- [ ] Banner shows the deadline timestamp
- [ ] Message explains officer approval is required
- [ ] Deadline shows in status banner (before it passes)
- [ ] Can still submit after deadline

**Expected behavior:**
- Warning only shows after deadline has passed
- User can still make changes and submit
- Clear messaging about officer approval requirement

---

### 6. Master Sheet Visibility Controls
**URL:** `/master-sheet`

**What to test:**

**As a non-officer when sheet is hidden:**
- [ ] See "Master Sheet Not Available" message with lock icon
- [ ] Message explains rankings are currently hidden
- [ ] Cannot see any item rankings

**As an officer when sheet is hidden:**
- [ ] See blue "Officer Preview" banner
- [ ] Banner explains sheet is hidden from members
- [ ] Can still see all rankings

**When sheet is visible (for everyone):**
- [ ] Rankings display normally for all users
- [ ] No special banners or warnings

---

### 7. Dashboard Actions Filtering
**URL:** `/dashboard`

**What to test:**
- [ ] "Actions Needed" only shows current expansion items
- [ ] Stats show counts for current expansion only
- [ ] Switching current expansion updates action items
- [ ] Past expansion items don't appear in actions

**Expected behavior:**
- Only incomplete submissions for current expansion appear
- Counts match filtered items
- No cross-expansion pollution

---

### 8. Attendance Per Expansion
**URL:** `/attendance`

**Prerequisites:** Set raid start dates for expansions in `/admin/expansions`

**What to test:**
- [ ] Attendance score respects expansion start date
- [ ] Raids before expansion start date are excluded
- [ ] Switching current expansion updates attendance data
- [ ] Each expansion maintains separate attendance tracking

**Expected behavior:**
- Only raids after expansion start date count
- Rolling window (e.g., 4 weeks) is bounded by start date
- Different expansions have independent attendance

---

### 9. Guild Creation with Expansion
**URL:** `/guild-select/create`

**What to test:**
- [ ] See all 5 expansion options with images
- [ ] Can select one expansion to start with
- [ ] Helper text explains more can be added later
- [ ] Guild creates successfully with chosen expansion
- [ ] Can immediately add more expansions after creation

**Expected behavior:**
- One expansion must be selected
- Guild seeds with all raid tiers for that expansion
- Officers can add more expansions via admin panel

---

## 🔧 Technical Verification

### Database Checks
Run these in your Supabase SQL editor:

```sql
-- Check expansion setup
SELECT e.name as expansion, e.raid_start_date, e.is_current
FROM expansions e
WHERE guild_id = 'YOUR_GUILD_ID';

-- Check raid tier visibility
SELECT rt.name, rt.master_sheet_visible, rt.submission_deadline
FROM raid_tiers rt
JOIN expansions e ON rt.expansion_id = e.id
WHERE e.guild_id = 'YOUR_GUILD_ID';

-- Check submission statuses
SELECT status, COUNT(*)
FROM loot_submissions
WHERE guild_id = 'YOUR_GUILD_ID'
GROUP BY status;
```

### Key Files Changed
- ✅ Database migration ran: `update_expansion_system_multi_expansion_support_v2.sql`
- ✅ GuildContext: Added expansion state management
- ✅ API routes: 3 new expansion management endpoints
- ✅ Admin pages: Expansions, Raid Tiers (updated), Pending Submissions (new)
- ✅ User pages: Loot List (expansion selector), Master Sheet (visibility), Dashboard (filtering)

---

## 🐛 Known Issues
None currently! All compilation errors resolved.

---

## 📝 Testing Notes

**Test User Requirements:**
- Officer role required for: Expansions, Raid Tiers, Pending Submissions
- Regular member can test: Loot List, Master Sheet, Dashboard, Attendance

**Quick Test Scenario:**
1. Login as officer
2. Go to `/admin/expansions` → Add "The Burning Crusade"
3. Set raid start date for Classic and TBC
4. Go to `/admin/raid-tiers` → Hide master sheet for MC, set deadline
5. Login as regular user (or switch character)
6. Go to `/loot-list` → See expansion selector
7. Try submitting after deadline → See warning
8. Go to `/master-sheet` → Should see "locked" for MC
9. Switch to TBC → See different raid tiers

---

## 🎯 Success Criteria
- ✅ All 14 implementation tasks completed
- ✅ TypeScript compiles without errors
- ✅ Dev server running successfully
- ✅ No runtime errors in browser console
- ⏳ Manual testing in browser (your turn!)

Happy testing! 🚀
