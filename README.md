# Marketing Engine - Phase 1 Setup

## Project Structure
```
marketing-engine/
├── src/
│   ├── content/          # Content generation engine
│   ├── platforms/        # Platform integrations
│   ├── scheduling/       # Post scheduler & queue
│   ├── rate-limiter/     # Rate limiting logic
│   ├── monitoring/       # Comment monitoring
│   └── utils/           # Helper functions
├── config/
│   ├── platform-keys.sample.json
│   └── settings.json
├── database/
│   └── schema.sql
├── scripts/
│   ├── setup.sh
│   └── deploy.sh
├── docs/
│   ├── API.md
│   └── SETUP.md
├── tests/
├── package.json
├── .env.sample
└── README.md
```

## Development Plan

### Week 1-2: Foundation
- [ ] Project setup & dependencies
- [ ] Twitter/X OAuth integration
- [ ] Basic content generator with LLM
- [ ] Database schema & migrations

### Week 3-4: Core Features
- [ ] Reddit API integration
- [ ] Rate limiter implementation
- [ ] Scheduling system
- [ ] Post queue manager

### Week 5-6: Engagement
- [ ] Facebook/Instagram API
- [ ] Comment monitoring
- [ ] Auto-reply logic (conservative)
- [ ] LinkedIn integration (basic)

### Week 7-8: Polish & Launch
- [ ] Analytics dashboard
- [ ] Safety controls
- [ ] Load testing
- [ ] Documentation

## Tech Stack
- **Backend:** Node.js + Express
- **Database:** SQLite → PostgreSQL
- **Queue:** Bull (Redis-based)
- **LLM:** OpenAI/Anthropic/OpenRouter APIs
- **OAuth:** Passport.js + platform-specific SDKs