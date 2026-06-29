-- Create session blacklist table for secure session management
CREATE TABLE IF NOT EXISTS session_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invalidated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason VARCHAR(100) DEFAULT 'logout',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_session_blacklist_token_hash ON session_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_session_blacklist_user_id ON session_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_session_blacklist_invalidated_at ON session_blacklist(invalidated_at);

-- Create cleanup function for old entries (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM session_blacklist 
    WHERE invalidated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;



CREATE TABLE one_time_tokens (
  jti TEXT PRIMARY KEY,
  used BOOLEAN DEFAULT FALSE,
  expired_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);