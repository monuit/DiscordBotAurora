const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class JSONLogger {
    constructor(logDir = './logs') {
        this.logDir = logDir;
        this.currentLogFile = null;
        this.currentDate = null;
        this.logStream = null;
        
        // Ensure logs directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        // Setup daily log rotation
        this.setupLogRotation();
        
        // Compress old logs on startup
        this.compressOldLogs();
    }
    
    setupLogRotation() {
        const now = new Date();
        const dateStr = this.formatDate(now);
        
        if (this.currentDate !== dateStr) {
            // Close current stream if exists
            if (this.logStream) {
                this.logStream.end();
            }
            
            // Compress yesterday's log if it exists
            if (this.currentLogFile && fs.existsSync(this.currentLogFile)) {
                this.compressLog(this.currentLogFile);
            }
            
            // Create new log file
            this.currentDate = dateStr;
            this.currentLogFile = path.join(this.logDir, `logs_${dateStr}.jsonl`);
            this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
            
            console.log(`[Logger] Started logging to: ${this.currentLogFile}`);
        }
    }
    
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
    
    log(level, message, metadata = {}) {
        // Check if we need to rotate logs
        this.setupLogRotation();
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message: message,
            ...metadata
        };
        
        const logLine = JSON.stringify(logEntry) + '\n';
        
        if (this.logStream) {
            this.logStream.write(logLine);
        }
        
        // Also output to console for immediate visibility
        console.log(`[${logEntry.timestamp}] [${logEntry.level}] ${message}`);
    }
    
    compressLog(filePath) {
        try {
            const compressed = path.join(this.logDir, path.basename(filePath) + '.gz');
            
            // Don't compress if already compressed
            if (fs.existsSync(compressed)) {
                return;
            }
            
            const readStream = fs.createReadStream(filePath);
            const writeStream = fs.createWriteStream(compressed);
            const gzip = zlib.createGzip();
            
            readStream.pipe(gzip).pipe(writeStream);
            
            writeStream.on('finish', () => {
                // Delete original file after compression
                fs.unlinkSync(filePath);
                console.log(`[Logger] Compressed and archived: ${compressed}`);
            });
            
        } catch (error) {
            console.error(`[Logger] Failed to compress log ${filePath}:`, error.message);
        }
    }
    
    compressOldLogs() {
        try {
            const files = fs.readdirSync(this.logDir);
            const today = this.formatDate(new Date());
            
            files.forEach(file => {
                if (file.endsWith('.jsonl') && !file.includes(today)) {
                    const filePath = path.join(this.logDir, file);
                    this.compressLog(filePath);
                }
            });
        } catch (error) {
            console.error('[Logger] Failed to compress old logs:', error.message);
        }
    }
    
    // Convenience methods
    info(message, metadata) {
        this.log('info', message, metadata);
    }
    
    warn(message, metadata) {
        this.log('warn', message, metadata);
    }
    
    error(message, metadata) {
        this.log('error', message, metadata);
    }
    
    debug(message, metadata) {
        this.log('debug', message, metadata);
    }
    
    command(commandName, userId, guildId, metadata = {}) {
        this.log('command', `${commandName} used by ${userId}`, {
            command: commandName,
            userId: userId,
            guildId: guildId,
            ...metadata
        });
    }
    
    antiSpam(userId, action, metadata = {}) {
        this.log('antispam', `User ${userId} ${action}`, {
            userId: userId,
            action: action,
            ...metadata
        });
    }
    
    webhook(action, channelId, metadata = {}) {
        this.log('webhook', `${action} for channel ${channelId}`, {
            action: action,
            channelId: channelId,
            ...metadata
        });
    }
    
    api(service, action, metadata = {}) {
        this.log('api', `${service}: ${action}`, {
            service: service,
            action: action,
            ...metadata
        });
    }
}

// Create singleton instance
const logger = new JSONLogger();

module.exports = logger;
