-- Marketing Engine Database Schema
-- SQLite compatible for Phase 1, easily migratable to PostgreSQL

-- Projects to promote
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  category TEXT,
  target_audience TEXT,
  content_guidelines TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);

-- Platform accounts
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL, -- 'twitter', 'reddit', 'facebook', 'linkedin'
  username TEXT,
  display_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  rate_limit_state TEXT, -- JSON: current counters
  last_api_call DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generated content
CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id),
  platform TEXT NOT NULL,
  content_type TEXT DEFAULT 'post', -- 'post', 'reply', 'comment', 'message'
  content_body TEXT NOT NULL,
  variations TEXT, -- JSON array of alternative versions
  hashtags TEXT, -- JSON array
  metadata TEXT, -- JSON: tone, length, etc.
  is_used BOOLEAN DEFAULT 0,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Scheduled posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER REFERENCES content(id),
  account_id INTEGER REFERENCES accounts(id),
  platform TEXT NOT NULL,
  scheduled_for DATETIME NOT NULL,
  posted_at DATETIME,
  platform_post_id TEXT, -- ID returned by platform
  status TEXT DEFAULT 'pending', -- 'pending', 'posted', 'failed', 'cancelled'
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES content(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Engagement tracking
CREATE TABLE IF NOT EXISTS engagements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheduled_post_id INTEGER REFERENCES scheduled_posts(id),
  platform TEXT NOT NULL,
  platform_post_id TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  last_checked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scheduled_post_id) REFERENCES scheduled_posts(id)
);

-- Comment/interaction tracking
CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  platform_thread_id TEXT, -- post/comment ID where interaction occurred
  our_post_id TEXT, -- our post in this thread (if applicable)
  interaction_type TEXT, -- 'comment', 'reply', 'mention', 'dm'
  author_username TEXT,
  author_id TEXT,
  content_body TEXT,
  sentiment TEXT, -- 'positive', 'negative', 'neutral'
  requires_human BOOLEAN DEFAULT 0,
  handled_by TEXT, -- 'auto' or 'human'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME
);

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id),
  endpoint TEXT NOT NULL,
  requests_made INTEGER DEFAULT 0,
  window_start DATETIME,
  window_end DATETIME,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Analytics & reporting
CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id),
  platform TEXT NOT NULL,
  date DATE NOT NULL,
  posts_made INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  avg_engagement_rate REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_platform_used ON content(platform, is_used);
CREATE INDEX IF NOT EXISTS idx_interactions_platform_thread ON interactions(platform, platform_thread_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_platform_account ON rate_limits(platform, account_id);
CREATE INDEX IF NOT EXISTS idx_engagements_platform_post ON engagements(platform, platform_post_id);