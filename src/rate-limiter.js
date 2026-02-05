class RateLimiter {
  constructor(db, settings) {
    this.db = db;
    this.settings = settings;
    this.resetTimers = new Map(); // Store reset timers per platform/account
  }

  /**
   * Check if we can make a request
   * Returns { canProceed: boolean, waitMs: number, remaining: number }
   */
  canMakeRequest(platform, accountId, endpoint = 'default') {
    const limits = this.settings.limits[platform];
    if (!limits) {
      return { canProceed: true, waitMs: 0, remaining: -1 };
    }

    // Get current rate limit state from database
    const current = this.db.getRateLimit(platform, accountId, endpoint);
    const now = new Date();
    const windowMs = limits.retryAfterSeconds * 1000;

    // Initialize if first request
    if (!current) {
      return { canProceed: true, waitMs: 0, remaining: limits.requestsPerMinute - 1 };
    }

    const windowStart = new Date(current.window_start);
    const windowEnd = new Date(current.window_end);

    // Check if window has expired
    if (now > windowEnd) {
      // Reset window
      const newWindowStart = now;
      const newWindowEnd = new Date(now.getTime() + windowMs);

      this.db.updateRateLimit(
        platform,
        accountId,
        endpoint,
        1,
        newWindowStart,
        newWindowEnd
      );

      return { canProceed: true, waitMs: 0, remaining: limits.requestsPerMinute - 1 };
    }

    // Window still active, check remaining requests
    const remaining = limits.requestsPerMinute - current.requests_made;

    if (remaining <= 0) {
      // Rate limited, return wait time
      const waitMs = windowEnd.getTime() - now.getTime();
      return { canProceed: false, waitMs, remaining: 0 };
    }

    // Can proceed, increment counter
    this.db.updateRateLimit(
      platform,
      accountId,
      endpoint,
      current.requests_made + 1,
      windowStart,
      windowEnd
    );

    return { canProceed: true, waitMs: 0, remaining: remaining - 1 };
  }

  /**
   * Wait until rate limit allows the request
   */
  async waitForAvailability(platform, accountId, endpoint = 'default') {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const result = this.canMakeRequest(platform, accountId, endpoint);

      if (result.canProceed) {
        return result;
      }

      // Wait for rate limit window or exponential backoff
      const waitTime = Math.min(result.waitMs, 60000); // Max 60s wait
      await this.sleep(waitTime);
      attempts++;
    }

    throw new Error(`Rate limit timeout for ${platform} after ${maxAttempts} attempts`);
  }

  /**
   * Handle 429 error from API with exponential backoff
   */
  async handleRateLimitError(platform, accountId, endpoint = 'default') {
    const limits = this.settings.limits[platform];
    let delayMs = 1000; // Start with 1 second

    for (let attempt = 1; attempt <= 5; attempt++) {
      await this.sleep(delayMs);

      const result = this.canMakeRequest(platform, accountId, endpoint);
      if (result.canProceed) {
        return result;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      delayMs = Math.min(delayMs * 2, 16000);
    }

    throw new Error(`Rate limit retry failed for ${platform} after 5 attempts`);
  }

  /**
   * Get current rate limit status
   */
  getStatus(platform, accountId, endpoint = 'default') {
    const limits = this.settings.limits[platform];
    const current = this.db.getRateLimit(platform, accountId, endpoint);

    if (!current) {
      return {
        platform,
        accountId,
        used: 0,
        limit: limits.requestsPerMinute,
        remaining: limits.requestsPerMinute,
        resetAt: new Date()
      };
    }

    return {
      platform,
      accountId,
      used: current.requests_made,
      limit: limits.requestsPerMinute,
      remaining: limits.requestsPerMinute - current.requests_made,
      resetAt: new Date(current.window_end)
    };
  }

  /**
   * Reset rate limit for specific platform/account
   */
  reset(platform, accountId, endpoint = 'default') {
    const now = new Date();
    const limits = this.settings.limits[platform];
    const windowMs = limits.retryAfterSeconds * 1000;

    const windowStart = new Date(now.getTime() - windowMs); // Past time to force reset
    const windowEnd = now;

    this.db.updateRateLimit(
      platform,
      accountId,
      endpoint,
      0,
      windowStart,
      windowEnd
    );
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Token bucket algorithm for fine-grained control
   */
  createTokenBucket(maxTokens, refillRatePerSecond) {
    let tokens = maxTokens;
    let lastRefill = Date.now();

    return {
      async consume(tokensNeeded = 1) {
        const now = Date.now();
        const elapsed = (now - lastRefill) / 1000;
        const tokensToAdd = elapsed * refillRatePerSecond;

        tokens = Math.min(maxTokens, tokens + tokensToAdd);
        lastRefill = now;

        if (tokens >= tokensNeeded) {
          tokens -= tokensNeeded;
          return true;
        }

        // Not enough tokens, calculate wait time
        const tokensNeededAfterRefill = tokensNeeded - tokens;
        const waitSeconds = tokensNeededAfterRefill / refillRatePerSecond;
        await this.sleep(waitSeconds * 1000);

        return this.consume(tokensNeeded);
      }
    };
  }
}

module.exports = RateLimiter;