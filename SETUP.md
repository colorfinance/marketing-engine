# Marketing Engine - Setup Guide

## Quick Start (5 Minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/colorfinance/marketing-engine.git
cd marketing-engine
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.sample .env
# Edit .env with your API keys
```

### 4. Initialize Database
```bash
npm run setup
```

### 5. Start Development Server
```bash
npm run dev
```

---

## Detailed Setup

### Environment Variables (.env)

Copy `.env.sample` to `.env` and fill in your API keys:

#### Twitter/X API
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0
4. Generate API keys and access tokens
5. Add to `.env`:
```
TWITTER_API_KEY=your_key_here
TWITTER_API_SECRET=your_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_secret_here
```

#### Reddit API
1. Go to [Reddit Apps](https://www.reddit.com/prefs/apps)
2. Create a new app (script type)
3. Note client ID and secret
4. Add to `.env`:
```
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
REDDIT_USER_AGENT=marketing-engine:v1.0.0 (by u/your_username)
```

#### LLM API (Choose One)
- **OpenAI:** Get key from [OpenAI Platform](https://platform.openai.com/)
- **Anthropic:** Get key from [Anthropic Console](https://console.anthropic.com/)
- **Grok (xAI):** Get key from [xAI Console](https://console.x.ai/)
- **OpenRouter:** Get key from [OpenRouter](https://openrouter.ai/)

Add to `.env`:
```
OPENAI_API_KEY=your_key_here
# OR
ANTHROPIC_API_KEY=your_key_here
# OR
GROK_API_KEY=your_key_here
```

---

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
└── tests/
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (auto-restart on changes)
npm run dev

# Run tests
npm test

# Initialize database and create first project
npm run setup

# Run database migrations
npm run db:migrate

# Start production server
npm start
```

---

## Adding Your First Project

```bash
node scripts/add-project.js
# Follow prompts to add project details
```

Or via code:

```javascript
const db = require('./src/database');

// Add a project
db.createProject({
  name: 'My Awesome Project',
  description: 'A tool that does amazing things',
  url: 'https://myproject.com',
  category: 'developer-tools',
  targetAudience: 'developers, SaaS founders',
  contentGuidelines: 'Keep it technical but accessible'
});

console.log('Project added!');
```

---

## Platform Integration Status

| Platform | Status | Implementation |
|----------|--------|----------------|
| **Twitter/X** | ✅ Ready | OAuth 2.0, API v2 |
| **Reddit** | 🔄 In Progress | OAuth + API integration |
| **Facebook** | ⏳ Planned | Graph API |
| **LinkedIn** | ⏳ Planned | OAuth 2.0 |
| **Instagram** | ⏳ Planned | Graph API (via Facebook) |

---

## Testing

Run unit tests:
```bash
npm test
```

Run integration tests (requires API keys):
```bash
npm run test:integration
```

---

## Deployment

### Option 1: DigitalOcean/Render (Easiest)
1. Create account on [DigitalOcean](https://digitalocean.com) or [Render](https://render.com)
2. Connect GitHub repository
3. Deploy!

### Option 2: Docker
```bash
# Build image
docker build -t marketing-engine .

# Run container
docker run -p 3000:3000 --env-file .env marketing-engine
```

### Option 3: Manual (VPS)
```bash
# On your server
git clone https://github.com/colorfinance/marketing-engine.git
cd marketing-engine
npm install
npm start
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## Need Help?

- 📖 Check [docs/](./docs/) for API documentation
- 🐛 Report bugs on [GitHub Issues](https://github.com/colorfinance/marketing-engine/issues)
- 💬 Join discussion in repository

---

## License

MIT License - see [LICENSE](LICENSE) file for details.