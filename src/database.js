const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath = null) {
    const defaultPath = path.join(__dirname, '../database/marketing.db');
    this.dbPath = dbPath || process.env.DATABASE_URL || defaultPath;

    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.init();
  }

  init() {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema (better-sqlite3 handles multiple statements)
    this.db.exec(schema);
  }

  // Projects CRUD
  createProject(project) {
    const stmt = this.db.prepare(`
      INSERT INTO projects (name, description, url, category, target_audience, content_guidelines)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      project.name,
      project.description || '',
      project.url || '',
      project.category || '',
      project.targetAudience || '',
      project.contentGuidelines || ''
    );
  }

  getProjects(activeOnly = true) {
    const stmt = this.db.prepare(`
      SELECT * FROM projects ${activeOnly ? 'WHERE is_active = 1' : ''}
    `);
    return stmt.all();
  }

  getProjectById(id) {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id);
  }

  updateProject(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const stmt = this.db.prepare(`UPDATE projects SET ${fields} WHERE id = ?`);
    return stmt.run(...values);
  }

  // Accounts CRUD
  createAccount(account) {
    const stmt = this.db.prepare(`
      INSERT INTO accounts (platform, username, display_name, access_token, refresh_token, token_expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      account.platform,
      account.username,
      account.displayName || '',
      account.accessToken,
      account.refreshToken || '',
      account.tokenExpiresAt || null
    );
  }

  getAccounts(platform = null, activeOnly = true) {
    let query = 'SELECT * FROM accounts';
    const conditions = [];
    const params = [];

    if (activeOnly) {
      conditions.push('is_active = 1');
    }
    if (platform) {
      conditions.push('platform = ?');
      params.push(platform);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  updateAccountRateLimit(id, rateLimitState) {
    const stmt = this.db.prepare(`
      UPDATE accounts SET rate_limit_state = ?, last_api_call = CURRENT_TIMESTAMP WHERE id = ?
    `);
    return stmt.run(JSON.stringify(rateLimitState), id);
  }

  // Content CRUD
  createContent(content) {
    const stmt = this.db.prepare(`
      INSERT INTO content (project_id, platform, content_type, content_body, variations, hashtags, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      content.projectId,
      content.platform,
      content.contentType || 'post',
      content.contentBody,
      JSON.stringify(content.variations || []),
      JSON.stringify(content.hashtags || []),
      JSON.stringify(content.metadata || {})
    );
  }

  getUnusedContent(platform, projectId = null, limit = 10) {
    let query = `
      SELECT * FROM content
      WHERE platform = ? AND is_used = 0
    `;
    const params = [platform];

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY generated_at ASC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  markContentUsed(id) {
    const stmt = this.db.prepare(`
      UPDATE content SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    return stmt.run(id);
  }

  // Scheduled Posts CRUD
  createScheduledPost(post) {
    const stmt = this.db.prepare(`
      INSERT INTO scheduled_posts (content_id, account_id, platform, scheduled_for)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(
      post.contentId,
      post.accountId,
      post.platform,
      post.scheduledFor
    );
  }

  getPendingPosts(before = new Date()) {
    const stmt = this.db.prepare(`
      SELECT sp.*, c.content_body, c.hashtags, c.metadata,
             a.username, a.access_token, a.platform
      FROM scheduled_posts sp
      JOIN content c ON sp.content_id = c.id
      JOIN accounts a ON sp.account_id = a.id
      WHERE sp.status = 'pending' AND sp.scheduled_for <= ?
      ORDER BY sp.scheduled_for ASC
    `);
    return stmt.all(before.toISOString());
  }

  updatePostStatus(id, status, platformPostId = null, errorMessage = null) {
    const stmt = this.db.prepare(`
      UPDATE scheduled_posts
      SET status = ?,
          platform_post_id = COALESCE(?, platform_post_id),
          error_message = COALESCE(?, error_message),
          posted_at = CASE WHEN ? = 'posted' THEN CURRENT_TIMESTAMP ELSE posted_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(status, platformPostId, errorMessage, status, id);
  }

  incrementPostAttempts(id) {
    const stmt = this.db.prepare(`
      UPDATE scheduled_posts SET attempts = attempts + 1 WHERE id = ?
    `);
    return stmt.run(id);
  }

  // Interactions
  createInteraction(interaction) {
    const stmt = this.db.prepare(`
      INSERT INTO interactions (platform, platform_thread_id, our_post_id, interaction_type,
                                author_username, author_id, content_body, sentiment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      interaction.platform,
      interaction.platformThreadId,
      interaction.ourPostId || null,
      interaction.interactionType,
      interaction.authorUsername || '',
      interaction.authorId || '',
      interaction.contentBody || '',
      interaction.sentiment || 'neutral'
    );
  }

  getUnhandledInteractions(limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM interactions
      WHERE handled_by IS NULL AND requires_human = 0
      ORDER BY created_at ASC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  markInteractionHandled(id, handledBy = 'auto') {
    const stmt = this.db.prepare(`
      UPDATE interactions SET handled_by = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    return stmt.run(handledBy, id);
  }

  // Rate Limits
  getRateLimit(platform, accountId, endpoint) {
    const stmt = this.db.prepare(`
      SELECT * FROM rate_limits
      WHERE platform = ? AND account_id = ? AND endpoint = ?
    `);
    return stmt.get(platform, accountId, endpoint);
  }

  updateRateLimit(platform, accountId, endpoint, requestsMade, windowStart, windowEnd) {
    const existing = this.getRateLimit(platform, accountId, endpoint);

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE rate_limits
        SET requests_made = ?, window_start = ?, window_end = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      return stmt.run(requestsMade, windowStart.toISOString(), windowEnd.toISOString(), existing.id);
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO rate_limits (platform, account_id, endpoint, requests_made, window_start, window_end)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      return stmt.run(platform, accountId, endpoint, requestsMade, windowStart.toISOString(), windowEnd.toISOString());
    }
  }

  // Analytics
  updateEngagement(scheduledPostId, metrics) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO engagements
      (scheduled_post_id, platform, platform_post_id, likes_count, shares_count,
       comments_count, views_count, engagement_rate, last_checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(
      scheduledPostId,
      metrics.platform,
      metrics.platformPostId,
      metrics.likes || 0,
      metrics.shares || 0,
      metrics.comments || 0,
      metrics.views || 0,
      metrics.engagementRate || 0
    );
  }

  getAnalytics(projectId, startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT * FROM analytics
      WHERE project_id = ? AND date BETWEEN ? AND ?
      ORDER BY date ASC
    `);
    return stmt.all(projectId, startDate, endDate);
  }

  close() {
    this.db.close();
  }

  // Get database instance for raw queries
  getDb() {
    return this.db;
  }
}

module.exports = DatabaseManager;