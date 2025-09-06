# Discord Bot Startup and Troubleshooting Guide

## Prerequisites

1. **Node.js**: Make sure you have Node.js installed (version 16 or higher recommended)
2. **MongoDB**: Ensure you have a MongoDB database set up
3. **Discord Bot**: Create a bot on Discord Developer Portal and get the token

## Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Fill in the required values in `.env`:
   - `TOKEN`: Your Discord bot token
   - `MONGO_URI`: Your MongoDB connection string
   - `G_AGENT` or `REDDIT_AGENT`: Reddit user agent (format: "BotName/1.0 by RedditUsername")
   - `OWNER_ID`: Your Discord user ID

## Installation and Startup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Deploy slash commands (run this once or when commands change):
   ```bash
   node deploySlash.js guild YOUR_GUILD_ID
   # or for global commands:
   node deploySlash.js global
   ```

3. Start the bot:
   ```bash
   node index.js
   ```

## Common Issues and Solutions

### 1. "evt.bind is not a function" Error
**Fixed**: The event loader now properly checks if exported modules are functions.

### 2. "Cannot read properties of undefined (reading 'data')" Error
**Fixed**: All Reddit commands now have proper error handling for API failures.

### 3. Unhandled Promise Rejections
**Fixed**: Added comprehensive error handling throughout the codebase.

### 4. Reddit API Issues
**Symptoms**: Reddit commands fail or return errors
**Solutions**:
- Ensure `G_AGENT` or `REDDIT_AGENT` is set in your `.env` file
- Use format: "YourBotName/1.0 by YourRedditUsername"
- Reddit API sometimes returns unexpected responses - the bot now handles this gracefully

### 5. MongoDB Connection Issues
**Symptoms**: Database-related errors on startup
**Solutions**:
- Verify your `MONGO_URI` in the `.env` file
- Ensure MongoDB is running and accessible
- Check network connectivity to your MongoDB instance

### 6. Bot Not Responding to Slash Commands
**Solutions**:
- Redeploy slash commands: `node deploySlash.js guild YOUR_GUILD_ID`
- Check bot permissions in your Discord server
- Ensure the bot has necessary permissions (Send Messages, Embed Links, etc.)

## Monitoring and Logging

- All errors are now logged with detailed information
- Configure `ER_WEBHOOK` in `.env` to receive error notifications via Discord webhook
- Check console output for detailed error messages

## Performance Optimization

- The bot now handles Reddit API failures gracefully without crashing
- Cron jobs have error handling to prevent cascading failures
- Database operations include proper error handling

## Environment Variables Reference

### Required
- `TOKEN`: Discord bot token
- `MONGO_URI`: MongoDB connection string

### Recommended
- `G_AGENT` or `REDDIT_AGENT`: Reddit user agent
- `ER_WEBHOOK`: Error logging webhook URL
- `OWNER_ID`: Bot owner's Discord ID

### Optional
- `EMBED_COLOR`: Default embed color (hex)
- `SUPPORT`: Support server invite link
- `BOLISTME`: Bot list token for botlist.me

## Need Help?

If you continue to experience issues:
1. Check the console output for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your MongoDB database is accessible
4. Check Discord bot permissions in your server

All major issues have been fixed with proper error handling and logging.
