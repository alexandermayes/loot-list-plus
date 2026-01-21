# Multi-Expansion System - Known Issues & Bugs

## 🐛 Bugs to Fix

### High Priority
- [ ] None yet

### Medium Priority
- [ ] None yet

### Low Priority
- [ ] None yet

## ✅ Fixed Bugs
- **[FIXED]** useState inside map() in raid-tiers page - moved deadline inputs to component-level state

## 🔍 Testing Checklist
- [x] Can add multiple expansions to a guild
- [x] Can switch between current expansions
- [x] Raid start date saves correctly per expansion
- [x] Master sheet visibility controls work
- [x] Submission deadlines work correctly
- [x] Late submission warnings appear
- [x] Officer approval workflow functions
- [x] Expansion selector on loot list works
- [x] Viewing past expansion data works
- [x] Actions needed only shows current expansion
- [x] Attendance tracks per expansion correctly
- [x] Guild creation with expansion selection works

## 📝 Implementation Notes

### Database Changes
- Added `raid_start_date` to expansions table for per-expansion attendance tracking
- Added `master_sheet_visible` to raid_tiers for progressive release control
- Added `submission_deadline` to raid_tiers for deadline warnings
- All submissions now require officer approval (status: pending/approved/rejected)

### API Routes
- `/api/guilds/[id]/expansions` - GET/POST for listing and adding expansions
- `/api/guilds/[id]/expansions/[expansionId]` - PATCH for updating expansion settings
- `/api/expansions/available` - GET for listing available expansions

### Admin UI
- Expansions management page: `/admin/expansions`
- Raid tier controls updated with visibility toggles and deadline pickers
- Pending submissions interface: `/admin/pending-submissions`

### User-Facing Features
- Expansion selector on loot list page (shows all guild expansions)
- Deadline warnings when submitting after deadline
- Master sheet respects visibility settings (hidden until officers make visible)
- Actions needed filtered to current expansion only
- Attendance tracking uses expansion start date as lower bound

### Guild Creation Flow
- Guilds start with one expansion selection
- Officers can add more expansions via Admin > Manage Expansions
- Helpful note added to guild creation form explaining this

### Migration Status
- Migration `update_expansion_system_multi_expansion_support_v2.sql` ran successfully
- All raid tiers seeded with `master_sheet_visible = true` by default
- Expansion seeder updated to prevent duplicates
