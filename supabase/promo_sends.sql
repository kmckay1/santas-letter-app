-- One row per promo email sent, keyed by campaign and recipient.
--
-- Used by /api/admin/send-promo as its claim-then-send guard: a recipient is
-- claimed by inserting their row, the email is sent only if the insert wins,
-- and the row is deleted again if the send fails. Re-running a campaign after a
-- crash or a timeout therefore resumes where it stopped instead of mailing the
-- same people twice.
--
-- Run this against the project BEFORE sending a campaign. The route's dry run
-- works without it and reports it as missing; a real send refuses to start.

create table if not exists promo_sends (
  campaign  text        not null,
  email     text        not null,
  sent_at   timestamptz not null default now(),
  primary key (campaign, email)
);

-- Same posture as `letters`: RLS on, no policies, service-role access only.
-- Every row is an email address.
alter table promo_sends enable row level security;
