const mongoose = require('mongoose');

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000, // 30 seconds
            socketTimeoutMS: 45000, // 45 seconds
            bufferMaxEntries: 0,
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            retryWrites: true,
        });
        console.log('✅ Connected to MongoDB');
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