const mongoose = require('mongoose');

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            
            // PERFORMANCE OPTIMIZATION: Reduced timeouts for faster responses
            serverSelectionTimeoutMS: 10000, // 10 seconds (was 30)
            socketTimeoutMS: 15000, // 15 seconds (was 45)
            connectTimeoutMS: 10000, // 10 seconds connection timeout
            
            // MEMORY OPTIMIZATION: Optimized connection pooling
            maxPoolSize: 5, // Reduced from 10 to limit memory usage
            minPoolSize: 2, // Reduced from 5
            maxIdleTimeMS: 15000, // 15 seconds (was 30) - faster cleanup
            
            // PERFORMANCE: Buffer optimization
            bufferMaxEntries: 0, // Disable mongoose buffering for faster errors
            bufferCommands: false, // Disable command buffering
            
            // RELIABILITY: Write and read concerns
            retryWrites: true,
            readPreference: 'primary', // Use primary for consistency
            
            // PERFORMANCE: Compression
            compressors: ['zlib'],
            zlibCompressionLevel: 6,
            
            // MEMORY: Connection cleanup
            heartbeatFrequencyMS: 10000, // 10 seconds heartbeat
            family: 4 // Force IPv4 for better performance
        });
        
        // PERFORMANCE: Set up monitoring for slow operations
        mongoose.connection.db.on('commandStarted', (event) => {
            if (event.commandName !== 'ismaster' && event.commandName !== 'ping') {
                console.log(`[DB] Starting ${event.commandName} on ${event.databaseName}.${event.command[event.commandName]}`);
            }
        });
        
        mongoose.connection.db.on('commandSucceeded', (event) => {
            if (event.duration > 100 && event.commandName !== 'ismaster' && event.commandName !== 'ping') {
                console.warn(`[DB] SLOW QUERY: ${event.commandName} took ${event.duration}ms`);
            }
        });
        
        console.log('✅ Connected to MongoDB with optimized settings');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        
        // Send error webhook
        if (process.env.ER_WEBHOOK) {
            try {
                const { WebhookClient, EmbedBuilder } = require('discord.js');
                const errorWebhook = new WebhookClient({ url: process.env.ER_WEBHOOK });
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Database Connection Error')
                    .setDescription(`Failed to connect to MongoDB: ${error.message}`)
                    .setColor('#ff0000')
                    .setTimestamp();
                    
                await errorWebhook.send({ embeds: [errorEmbed] });
            } catch (webhookError) {
                console.error('Failed to send database error webhook:', webhookError);
            }
        }
        
        // Exit gracefully instead of crashing
        process.exit(1);
    }
}

// Handle connection errors after initial connection
mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    connectDatabase();
});

module.exports = connectDatabase;