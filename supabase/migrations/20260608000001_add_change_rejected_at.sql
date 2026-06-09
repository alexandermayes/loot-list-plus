-- Pass 2 of GH #123: make a reverted post-acceptance change visible to the raider.
--
-- When an officer rejects a resubmitted change, the submission is reverted to
-- its previously-approved snapshot and its status goes back to 'approved'. That
-- left the raider seeing a green "approved" badge with no signal their change was
-- rejected ("I thought the submission didn't work"). This column lets the raider
-- UI distinguish a clean approval from "approved, but your last change was
-- rejected" so it can show a prominent banner. Cleared on the next approval.

alter table public.loot_submissions
  add column if not exists change_rejected_at timestamptz;

comment on column public.loot_submissions.change_rejected_at is
  'Set when an officer rejects a post-acceptance change via revert (status stays approved, previous list restored). Cleared on the next approval. Drives the raider "recent changes rejected" banner.';
