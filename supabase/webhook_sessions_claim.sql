-- Exclusive claim for the Stripe webhook.
--
-- The original guard (webhook_sessions.sql) read the row, then inserted it, and
-- treated any row with completed_at null as "an earlier attempt crashed, resume
-- it". Two near-simultaneous deliveries of the same session therefore both ran
-- the full handler: the loser of the insert saw the winner's unfinished row and
-- resumed straight into it. Verified locally on 2026-09-29: two PDFs emailed for
-- one session.
--
-- processing_until is a lease. A delivery may work on a session only while it
-- holds an unexpired lease, and it takes the lease in one atomic statement that
-- succeeds only if the session is not completed and no other lease is live. A
-- delivery that crashes simply lets its lease expire, and the next Stripe retry
-- resumes it. The lease length is set by the caller (lib/storage.ts) and must
-- exceed the webhook's maxDuration in vercel.json, so a live request can never
-- lose its lease to a second one.
--
-- Safe to run before the code that uses it is deployed: the current handler
-- ignores the new column. Deploy the code only after running this, or every
-- webhook returns 500 until it is run (Stripe retries, so no order is lost).

alter table webhook_sessions add column if not exists processing_until timestamptz;

-- Returns the session row plus an "outcome":
--   claimed_new     this call created the row and holds the lease
--   claimed_resume  the row existed, was unfinished and unleased; this call now holds the lease
--   completed       already fully handled; the delivery is a replay
--   in_progress     another delivery holds a live lease
-- Returns null when a concurrent delivery created the row after this statement's
-- snapshot was taken; the caller treats that as in_progress.
create or replace function claim_webhook_session(
  p_session_id    text,
  p_letter_id     text,
  p_tier          text,
  p_lease_seconds integer
) returns jsonb
language sql
as $$
  with claimed as (
    insert into webhook_sessions as ws (stripe_session_id, letter_id, tier, processing_until)
    values (p_session_id, p_letter_id, p_tier, now() + make_interval(secs => p_lease_seconds))
    on conflict (stripe_session_id) do update
      set processing_until = excluded.processing_until
      where ws.completed_at is null
        and (ws.processing_until is null or ws.processing_until < now())
    returning ws.*, (xmax = 0) as inserted
  )
  select coalesce(
    (select to_jsonb(c) - 'inserted'
            || jsonb_build_object('outcome', case when c.inserted then 'claimed_new' else 'claimed_resume' end)
       from claimed c),
    (select to_jsonb(w)
            || jsonb_build_object('outcome', case when w.completed_at is not null then 'completed' else 'in_progress' end)
       from webhook_sessions w
      where w.stripe_session_id = p_session_id)
  );
$$;

-- Service role only, like the table itself. Supabase grants new functions to
-- anon and authenticated by default, which would expose this over the public API.
revoke execute on function claim_webhook_session(text, text, text, integer) from public, anon, authenticated;
grant execute on function claim_webhook_session(text, text, text, integer) to service_role;

notify pgrst, 'reload schema';
