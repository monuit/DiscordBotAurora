#!/bin/bash

# Discord Bot Aurora - Server Deployment Script
# Run this script on your Linux server after copying files via WinSCP

echo "🚀 Discord Bot Aurora - Server Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Make sure you're in the bot directory."
    exit 1
fi

print_step "1. Updating system packages..."
sudo apt update

print_step "2. Installing Node.js (if not installed)..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_status "Node.js already installed: $(node --version)"
fi

print_step "3. Installing PM2 (Process Manager)..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    print_status "PM2 already installed: $(pm2 --version)"
fi

print_step "4. Installing bot dependencies..."
npm install

print_step "5. Installing web dashboard dependencies..."
if [ -d "web" ]; then
    cd web
    npm install
    
    if [ -d "client" ]; then
        cd client
        npm install
        cd ..
    fi
    
    if [ -d "server" ]; then
        cd server
        npm install
        cd ..
    fi
    
    cd ..
fi

print_step "6. Creating logs directory..."
mkdir -p logs

print_step "7. Setting up environment..."
if [ ! -f ".env" ]; then
    print_warning "No .env file found. You'll need to create one with your bot token and database URL."
    echo "# Discord Bot Aurora Environment Variables" > .env
    echo "TOKEN=your_bot_token_here" >> .env
    echo "MONGODB_URI=your_mongodb_connection_string_here" >> .env
    echo "# Add other environment variables as needed" >> .env
    print_status "Created template .env file. Please edit it with your actual values."
fi

print_step "8. Setting proper permissions..."
chmod +x server-deploy.sh
chmod +x web/setup.sh 2>/dev/null || true

print_step "9. Testing bot configuration..."
print_status "Running configuration test..."
timeout 10s node index.js --test 2>/dev/null || print_warning "Bot test timed out (this is normal if token is not set)"

print_step "10. Setting up PM2 ecosystem..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'discord-bot-aurora',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true
    }
  ]
};
EOF

print_status "PM2 ecosystem configuration created."

echo ""
echo "🎉 Deployment Setup Complete!"
echo "=============================="
echo ""
print_step "Next steps:"
echo "1. Edit .env file with your bot token and database URL:"
echo "   nano .env"
echo ""
echo "2. Deploy slash commands to your guild:"
echo "   node deploySlash.js guild YOUR_GUILD_ID"
echo ""
echo "3. Start the bot with PM2:"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "4. Save PM2 configuration for auto-restart on reboot:"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "5. Monitor the bot:"
echo "   pm2 status"
echo "   pm2 logs discord-bot-aurora"
echo ""
print_status "Your Discord Bot Aurora is ready for production!"
