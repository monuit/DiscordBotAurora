# 🚀 Aurora Bot Deployment Checklist

## ✅ Pre-Deployment Cleanup (COMPLETED)
- [x] Removed all fix-*.js files
- [x] Removed all test-*.js files  
- [x] Removed batch-update-commands.js
- [x] Removed check-duplicates.js
- [x] Removed clear-*.js files
- [x] Removed *.zip archives
- [x] Cleaned up logs directory
- [x] Updated .gitignore file

## 📁 Essential Files for Deployment
### Core Bot Files
- [x] `index.js` - Main entry point
- [x] `spicy-flix.js` - Bot client class
- [x] `deploySlash.js` - Command deployment
- [x] `package.json` - Dependencies
- [x] `package-lock.json` - Lock file

### Configuration
- [x] `.env.example` - Environment template
- [x] `config/` - Configuration files
- [x] `settings/` - Database models

### Bot Logic
- [x] `commands/` - All slash commands
- [x] `events/` - Event handlers
- [x] `Functions/` - Core functionality
- [x] `handlers/` - Loading handlers
- [x] `utils/` - Utility modules

### Assets & Data
- [x] `assest/` - Images and gifs
- [x] `videos.json` - Video database
- [x] `alertedChannels.json` - Channel data

## 🔧 SSH Server Deployment Steps

### 1. Server Setup
```bash
# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Upload Files
```bash
# Upload the entire cleaned directory to server
scp -r ./DiscordBotAurora user@server:/path/to/bot/
```

### 3. Server Configuration
```bash
# Navigate to bot directory
cd /path/to/bot/DiscordBotAurora

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
nano .env  # Add your actual environment variables
```

### 4. Deployment Commands
```bash
# Deploy slash commands
node deploySlash.js guild YOUR_GUILD_ID

# Start bot with PM2
pm2 start index.js --name "aurora-bot"

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor bot
pm2 logs aurora-bot
pm2 status
```

## 🔐 Environment Variables Required
- `TOKEN` - Discord bot token
- `MONGO_URI` - MongoDB connection string
- `SHARDS_READY_WEBHOOK` - Webhook for shard notifications
- `ER_WEBHOOK` - Error webhook
- `BOTLISTMETOKEN` - Bot list token (optional)
- `G_AGENT` - User agent string

## 🎯 New Features Included
- ✅ **Enhanced Startup System** - Beautiful banners and health checks
- ✅ **System Monitoring** - CPU, Memory, DB, Network monitoring with alerts
- ✅ **Dual Auto-Promo** - Role acquisition and premium content campaigns
- ✅ **Role-Based Access Control** - Configurable command permissions
- ✅ **Webhook Retry Logic** - Robust error handling and retries
- ✅ **Comprehensive Documentation** - Bot profile and setup guides

## 📊 Monitoring & Management
- **Health Checks**: Automatic system verification on startup
- **Threshold Alerts**: Sends alerts to channel `1413616847571386418` when:
  - CPU usage > 80%
  - Memory usage > 80%
  - Database latency > 100ms
  - Network latency > 150ms
- **Command Management**: Use `/monitor` commands for system control
- **Auto-Promo Control**: Use `/managechannels` for promotional system management

## 🛡️ Security Notes
- Ensure `.env` file has correct permissions (600)
- Verify MongoDB connection is secure
- Check firewall settings for required ports
- Regular security updates for server OS

---
**Last Updated**: September 6, 2025
**Version**: 2.1.0 (Enhanced with monitoring and auto-promo systems)
