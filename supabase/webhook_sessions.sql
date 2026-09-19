-- One row per Stripe checkout session this webhook has handled.
--
-- Replaces the old replay guard, which asked "is this letter fulfilled?" and so
-- could not tell a Stripe redelivery apart from a genuine second purchase against
-- the same letter. A customer upgrading twice (premium now, physical in December)
-- produces two distinct sessions; only a redelivery of the *same* session is a
-- replay.
--
-- Run this against the project BEFORE deploying the webhook change. Until the
-- table exists the handler throws, which its catch block turns into a 500, so
-- Stripe retries with backoff rather than dropping the order. Orders are not lost
-- by running these out of order, but customers wait.

create table if not exists webhook_sessions (
  stripe_session_id   text primary key,
  letter_id           text not null,
  tier                text not null,
  -- Per-session stamp. The letters column of the same name is kept as a record of
  -- the most recent send for a letter, but is no longer a guard: a second
  -- premium-bearing purchase must be able to deliver its own PDF.
  premium_pdf_sent_at timestamptz,
  -- Set once the handler has run to completion. A row with this null means a
  -- previous attempt started and did not finish, and the work should be retried.
  completed_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists webhook_sessions_letter_id_idx
  on webhook_sessions (letter_id);

-- Same posture as `letters`: RLS on, no policies, service-role access only. The
-- row references a letter id and a payment, neither of which belongs in a browser.
alter table webhook_sessions enable row level security;
