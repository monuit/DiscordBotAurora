# 🚀 Discord Bot Aurora - Server Deployment Guide

## 📋 Pre-Deployment Checklist

### 🖥️ **Server Requirements**
- Ubuntu 20.04+ (or similar Linux distribution)
- Node.js 18+ 
- 2GB+ RAM
- 10GB+ disk space
- Stable internet connection

### 🔑 **Required Information**
- Discord Bot Token
- MongoDB connection string
- Guild ID for slash command deployment
- Server SSH access credentials

## 📁 **WinSCP File Transfer**

### ❌ **DO NOT Copy These:**
```
node_modules/
.git/ (optional - only if you want version control on server)
logs/
package-lock.json
web/node_modules/
web/client/node_modules/
web/server/node_modules/
*.log files
```

### ✅ **Copy Everything Else:**
- All .js files
- package.json
- All commands/, Functions/, events/, handlers/, settings/, utils/ folders
- All .md documentation files
- assest/ folder
- config/ folder
- web/ folder (excluding node_modules)
- .gitignore, .gitattributes

## 🛠️ **Server Deployment Steps**

### Step 1: Upload Files
1. Connect to your server via WinSCP
2. Navigate to `/home/yourusername/` or `/opt/`
3. Create folder: `discord-bot-aurora`
4. Upload all files (excluding those in the ❌ list above)

### Step 2: SSH into Server
```bash
ssh username@your-server-ip
cd discord-bot-aurora
```

### Step 3: Run Deployment Script
```bash
chmod +x server-deploy.sh
./server-deploy.sh
```

### Step 4: Configure Environment
```bash
nano .env
```
Add your actual values:
```env
TOKEN=your_actual_bot_token_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
NODE_ENV=production
```

### Step 5: Deploy Slash Commands
```bash
node deploySlash.js guild YOUR_GUILD_ID
```

### Step 6: Start the Bot
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔧 **Production Management Commands**

### Bot Control
```bash
# Start bot
pm2 start discord-bot-aurora

# Stop bot
pm2 stop discord-bot-aurora

# Restart bot
pm2 restart discord-bot-aurora

# View logs
pm2 logs discord-bot-aurora

# Monitor status
pm2 status
```

### System Monitoring
```bash
# View system resources
htop

# Check disk space
df -h

# View bot logs
tail -f logs/bot.log

# Check PM2 logs
pm2 logs --lines 100
```

## 🔄 **Updating the Bot**

### Method 1: Git Pull (if you copied .git folder)
```bash
git pull origin main
npm install
pm2 restart discord-bot-aurora
```

### Method 2: WinSCP Re-upload
1. Stop the bot: `pm2 stop discord-bot-aurora`
2. Upload changed files via WinSCP
3. Run: `npm install` (if package.json changed)
4. Start the bot: `pm2 start discord-bot-aurora`

## 🚨 **Troubleshooting**

### Bot Won't Start
```bash
# Check logs
pm2 logs discord-bot-aurora

# Test manually
node index.js

# Check environment
cat .env
```

### Permission Issues
```bash
# Fix file permissions
chmod -R 755 .
chmod +x server-deploy.sh

# Fix ownership
sudo chown -R $USER:$USER .
```

### Database Connection Issues
```bash
# Test MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'your-connection-string')
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));
"
```

### Memory Issues
```bash
# Increase PM2 memory limit
pm2 stop discord-bot-aurora
pm2 delete discord-bot-aurora
pm2 start ecosystem.config.js
```

## 📊 **Health Monitoring**

The bot includes built-in monitoring that will report to Discord channel `1413616847571386418`:
- CPU usage alerts (>80%)
- Memory usage alerts (>80%)
- Database connection status
- Network connectivity status

## 🔐 **Security Best Practices**

1. **Never expose your .env file**
2. **Use a firewall to restrict access**
3. **Regularly update server packages**
4. **Monitor bot logs for suspicious activity**
5. **Use strong passwords for all accounts**
6. **Enable 2FA on all services**

## 🆘 **Emergency Recovery**

If the bot crashes or becomes unresponsive:

```bash
# Kill all processes
pm2 kill

# Restart fresh
pm2 start ecosystem.config.js

# If still issues, reboot server
sudo reboot
```

---

**🎉 Your Discord Bot Aurora is now production-ready!**

For additional support, check the TROUBLESHOOTING.md file or review the comprehensive documentation included with the bot.
