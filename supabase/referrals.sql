-- Referral loop: attribution and the free-premium grant.
--
-- Run this against the project BEFORE deploying the referral code. Nothing here
-- is destructive and every statement is safe to re-run.
--
-- Three columns on `letters`, no new table. Attribution belongs on the letter it
-- describes, which keeps the signup ratio a single scan rather than a join.

alter table letters add column if not exists referral_code text;
alter table letters add column if not exists referred_by_code text;
alter table letters add column if not exists referral_premium_granted_at timestamptz;

comment on column letters.referral_code is
  'Short code this letter hands out. Generated at creation. Nullable on purpose: a
   code-generation failure must never block creating the letter, which is the product.';
comment on column letters.referred_by_code is
  'referral_code of the letter whose link brought this one in. Recorded for every
   referred signup, including ones past the grant cap and ones matching no letter,
   so the attribution ratio stays honest.';
comment on column letters.referral_premium_granted_at is
  'Set when this letter received a free premium PDF through a referral. Doubles as
   the idempotency key for the grant: claimed with a conditional update, so a retry
   or a double-submit cannot deliver two PDFs.';

-- Multiple NULLs are permitted by a Postgres unique index, which is what lets the
-- column stay nullable while still guaranteeing codes do not collide.
create unique index if not exists letters_referral_code_key
  on letters (referral_code);

-- The cap query and the referrer lookup both filter on this.
create index if not exists letters_referred_by_code_idx
  on letters (referred_by_code);

-- Backfill: existing letters need codes or their share links are dead.
--
-- Alphabet omits 0/O and 1/I so a code can be read aloud or retyped from a
-- screenshot without ambiguity. 32^6 is about 1.07 billion, so collisions are
-- already unlikely at this scale; the retry loop makes the index the authority
-- rather than the odds.
do $$
declare
  r record;
  candidate text;
  i int;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  for r in select id from letters where referral_code is null loop
    loop
      candidate := '';
      for i in 1..6 loop
        candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      end loop;
      begin
        update letters set referral_code = candidate where id = r.id;
        exit;
      exception when unique_violation then
        -- Collided with an existing code. Draw again.
      end;
    end loop;
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- Queries this schema is built to answer. Not run by the migration.
-- ---------------------------------------------------------------------------

-- Referred signups as a share of all signups.
--
--   select count(*) filter (where referred_by_code is not null) as referred,
--          count(*)                                             as total,
--          round(100.0 * count(*) filter (where referred_by_code is not null)
--                / nullif(count(*), 0), 1)                      as pct
--   from letters;

-- Grants already earned by one code, which is what the cap of 5 is checked
-- against before a grant is made.
--
--   select count(*) from letters
--   where referred_by_code = $1 and referral_premium_granted_at is not null;

-- Leaderboard of referrers, granted vs merely attributed. The gap between the
-- two columns is referrals that landed past the cap.
--
--   select referred_by_code,
--          count(*)                                                   as signups,
--          count(*) filter (where referral_premium_granted_at is not null) as granted
--   from letters
--   where referred_by_code is not null
--   group by referred_by_code
--   order by signups desc;
