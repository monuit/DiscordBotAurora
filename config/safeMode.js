// Startup-only safe mode flag. Read once at process start to avoid runtime toggling.
const SAFE_MODE = String(process.env.DISABLE_DESTRUCTIVE_ACTIONS || 'false').toLowerCase() === 'true';
module.exports = { SAFE_MODE };
