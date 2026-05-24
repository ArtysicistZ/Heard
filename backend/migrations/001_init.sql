-- Heard Platform: Initial Schema
-- Tables for auth (better-auth managed), user profiles, institutions,
-- grievances, follows, and sent actions.
--
-- better-auth auto-creates: user, session, account, verification
-- We create: institution, user_profile, grievance, grievance_follow, sent_action

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ============================================================================
-- institution — civic offices / elected official seats
-- ============================================================================
CREATE TABLE IF NOT EXISTS institution (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    level           TEXT NOT NULL DEFAULT 'municipal',
        -- 'municipal','county','state_house','state_senate','statewide','us_house','us_senate'
    address         TEXT NOT NULL DEFAULT '',
    phone           TEXT NOT NULL DEFAULT '',
    coordinates     DOUBLE PRECISION[] DEFAULT '{}',
    description     TEXT NOT NULL DEFAULT '',
    website         TEXT NOT NULL DEFAULT '',
    officeholder    TEXT,
    district        TEXT,
    state           TEXT DEFAULT 'PA',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institution_category ON institution (category);
CREATE INDEX IF NOT EXISTS idx_institution_level    ON institution (level);
CREATE INDEX IF NOT EXISTS idx_institution_state    ON institution (state);
CREATE INDEX IF NOT EXISTS idx_institution_district ON institution (district);

-- ============================================================================
-- user_profile — extends better-auth user table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profile (
    user_id             TEXT PRIMARY KEY,  -- FK to better-auth "user".id
    user_type           TEXT NOT NULL DEFAULT 'constituent'
                        CHECK (user_type IN ('constituent', 'candidate')),
    dob                 DATE,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    -- Cicero district IDs
    city                TEXT,
    state               TEXT,
    county              TEXT,
    council_district    TEXT,
    state_house_dist    TEXT,
    state_senate_dist   TEXT,
    congressional_dist  TEXT,
    -- candidate-only fields
    level               TEXT,  -- candidate_level enum
    institution_id      TEXT REFERENCES institution(id),
    title               TEXT,
    party               TEXT,
    office_address      TEXT,
    office_phone        TEXT,
    verified            BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_type        ON user_profile (user_type);
CREATE INDEX IF NOT EXISTS idx_user_profile_institution ON user_profile (institution_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_state       ON user_profile (state);
CREATE INDEX IF NOT EXISTS idx_user_profile_council     ON user_profile (council_district);
CREATE INDEX IF NOT EXISTS idx_user_profile_house       ON user_profile (state_house_dist);
CREATE INDEX IF NOT EXISTS idx_user_profile_senate      ON user_profile (state_senate_dist);
CREATE INDEX IF NOT EXISTS idx_user_profile_congress    ON user_profile (congressional_dist);

-- ============================================================================
-- grievance — constituent-filed civic issues
-- ============================================================================
CREATE TABLE IF NOT EXISTS grievance (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL,  -- FK to better-auth "user".id
    thread_id           TEXT,
    issue_summary       TEXT NOT NULL,
    issue_category      TEXT,
    severity            TEXT,
    -- exact location (private)
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    -- drifted location (public display, ±0.002 deg ≈ 200m)
    display_lat         DOUBLE PRECISION,
    display_lng         DOUBLE PRECISION,
    -- district fields (copied from user_profile at creation time)
    city                TEXT,
    state               TEXT,
    county              TEXT,
    council_district    TEXT,
    state_house_dist    TEXT,
    state_senate_dist   TEXT,
    congressional_dist  TEXT,
    -- visibility
    is_public           BOOLEAN NOT NULL DEFAULT FALSE,
    status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'resolved')),
    follow_count        INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grievance_user       ON grievance (user_id);
CREATE INDEX IF NOT EXISTS idx_grievance_thread     ON grievance (thread_id);
CREATE INDEX IF NOT EXISTS idx_grievance_public     ON grievance (is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_grievance_state      ON grievance (state);
CREATE INDEX IF NOT EXISTS idx_grievance_council    ON grievance (council_district);
CREATE INDEX IF NOT EXISTS idx_grievance_house      ON grievance (state_house_dist);
CREATE INDEX IF NOT EXISTS idx_grievance_senate     ON grievance (state_senate_dist);
CREATE INDEX IF NOT EXISTS idx_grievance_congress   ON grievance (congressional_dist);
CREATE INDEX IF NOT EXISTS idx_grievance_category   ON grievance (issue_category);
CREATE INDEX IF NOT EXISTS idx_grievance_created    ON grievance (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grievance_popular    ON grievance (follow_count DESC);

-- Full-text search index
ALTER TABLE grievance ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(issue_summary, '') || ' ' || coalesce(issue_category, ''))
    ) STORED;
CREATE INDEX IF NOT EXISTS idx_grievance_fts ON grievance USING gin(search_vector);

-- ============================================================================
-- grievance_follow — junction table for follow feature
-- ============================================================================
CREATE TABLE IF NOT EXISTS grievance_follow (
    grievance_id    UUID NOT NULL REFERENCES grievance(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,  -- FK to better-auth "user".id
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (grievance_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_grievance_follow_user ON grievance_follow (user_id);

-- ============================================================================
-- sent_action — action cards sent by constituents to officials
-- ============================================================================
CREATE TABLE IF NOT EXISTS sent_action (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id           TEXT NOT NULL,  -- FK to better-auth "user".id
    grievance_id        UUID REFERENCES grievance(id),
    thread_id           TEXT,
    -- recipient info
    recipient_name      TEXT,
    recipient_email     TEXT,
    recipient_title     TEXT,
    recipient_inst_id   TEXT REFERENCES institution(id),
    recipient_level     TEXT,
    jurisdiction        TEXT,
    -- content
    email_subject       TEXT,
    email_body          TEXT,
    card_data           JSONB,
    status              TEXT NOT NULL DEFAULT 'recorded'
                        CHECK (status IN ('recorded', 'sent', 'failed')),
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sent_action_sender    ON sent_action (sender_id);
CREATE INDEX IF NOT EXISTS idx_sent_action_grievance ON sent_action (grievance_id);
CREATE INDEX IF NOT EXISTS idx_sent_action_inst      ON sent_action (recipient_inst_id);
CREATE INDEX IF NOT EXISTS idx_sent_action_thread    ON sent_action (thread_id);
