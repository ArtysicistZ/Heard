-- 002_responses_notifications.sql
-- Adds candidate_response and notification tables for the feedback loop.

-- Candidate responses to public grievances
CREATE TABLE IF NOT EXISTS candidate_response (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_id    UUID NOT NULL REFERENCES grievance(id) ON DELETE CASCADE,
    candidate_user_id TEXT NOT NULL,
    body            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'published'
                    CHECK (status IN ('published', 'hidden')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_response_grievance ON candidate_response (grievance_id);
CREATE INDEX IF NOT EXISTS idx_candidate_response_candidate ON candidate_response (candidate_user_id);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notification (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    type            TEXT NOT NULL
                    CHECK (type IN ('new_follower', 'candidate_response', 'milestone', 'status_change')),
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    grievance_id    UUID REFERENCES grievance(id) ON DELETE CASCADE,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_user_unread ON notification (user_id, is_read, created_at DESC);
