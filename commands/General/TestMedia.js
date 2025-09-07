const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: ["testmedia"],
    description: "Test X/Twitter and Redgifs content retrieval and posting",
    type: "CHAT_INPUT",
    options: [
        {
            name: "source",
            description: "Select content source to test",
            type: 3, // STRING
            required: true,
            choices: [
                { name: "X/Twitter", value: "x" },
                { name: "Redgifs", value: "redgifs" },
                { name: "Both (Random)", value: "both" }
            ]
        },
        {
            name: "category",
            description: "Content category to test (optional)",
            type: 3, // STRING
            required: false,
            choices: [
                { name: "Blowjob", value: "blowjob" },
                { name: "Anal", value: "anal" },
                { name: "Lesbian", value: "lesbian" },
                { name: "MILF", value: "milf" },
                { name: "Teen", value: "teen" },
                { name: "Amateur", value: "amateur" },
                { name: "Big Ass", value: "big-ass" },
                { name: "Big Tits", value: "big-tits" },
                { name: "Cumshot", value: "cumshot" },
                { name: "Creampie", value: "creampie" },
                { name: "Deepthroat", value: "deepthroat" },
                { name: "Hardcore", value: "hardcore" },
                { name: "Homemade", value: "homemade" },
                { name: "Asian", value: "asian" },
                { name: "Ebony", value: "ebony" },
                { name: "Latina", value: "latina" },
                { name: "Hot", value: "hot" },
                { name: "Trending", value: "trending" },
                { name: "New", value: "new" },
                { name: "Random", value: "random" }
            ]
        },
        {
            name: "debug",
            description: "Show detailed debug information",
            type: 5, // BOOLEAN
            required: false
        }
    ],

    run: async (interaction, client) => {
        // Skip interaction acknowledgment - post content directly to avoid conflicts
        const source = interaction.options.getString('source');
        const category = interaction.options.getString('category') || 'hot';
        const debug = interaction.options.getBoolean('debug') || false;

        try {
            let contentData = null;
            let sourceUsed = source;

            // Get content based on source
            if (source === 'x') {
                contentData = await testXTwitterContent(category, debug);
            } else if (source === 'redgifs') {
                contentData = await testRedgifsContent(category, debug);
            } else if (source === 'both') {
                sourceUsed = Math.random() > 0.5 ? 'x' : 'redgifs';
                if (sourceUsed === 'x') {
                    contentData = await testXTwitterContent(category, debug);
                } else {
                    contentData = await testRedgifsContent(category, debug);
                }
            }

            if (!contentData || !contentData.url) {
                console.log(`[TESTMEDIA] No content from ${sourceUsed}`);
                return;
            }

            // Post content to channel (this will be the main visible message)
            console.log(`[TESTMEDIA] Starting ${sourceUsed} test with category: ${category}`);
            
            // Post content publicly to channel
            console.log(`[TESTMEDIA] Posting ${sourceUsed} content`);
            const message = await interaction.channel.send({
                content: contentData.url
            });
            console.log(`[TESTMEDIA] Posted content successfully`);

            // Add upgrade button for redgifs after delay
            if (sourceUsed === 'redgifs' && message) {
                console.log(`[TESTMEDIA] Scheduling upgrade button for message ID: ${message.id}`);
                setTimeout(async () => {
                    try {
                        // Fetch the message fresh to ensure it still exists and we have current data
                        const freshMessage = await interaction.channel.messages.fetch(message.id);
                        
                        const upgradeButton = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setLabel('🚀 Upgrade to Premium')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL('https://upgrade.chat/storeaurora')
                            );

                        // Use the fresh message reference for editing
                        await freshMessage.edit({
                            content: contentData.url,
                            components: [upgradeButton]
                        });
                        console.log(`[TESTMEDIA] Successfully edited message ${freshMessage.id} with upgrade button`);
                    } catch (editError) {
                        console.log(`[TESTMEDIA] Edit failed: ${editError.message}`);
                        // If edit fails, log the error but don't create a new message
                        if (editError.code === 10008) {
                            console.log(`[TESTMEDIA] Message was deleted, cannot add upgrade button`);
                        } else if (editError.code === 50001) {
                            console.log(`[TESTMEDIA] Missing access to edit message`);
                        } else {
                            console.log(`[TESTMEDIA] Unknown edit error: ${editError.code}`);
                        }
                    }
                }, 3000);
            }

        } catch (error) {
            console.error('[TestMedia] Error during media test:', error);
        }
    }
};

async function testXTwitterContent(category, debug) {
    const startTime = Date.now();
    const debugInfo = { errors: [] };

    try {
        const XTwitterRequester = require('../../Functions/others/x_twitter_requester.js');
        const xRequester = new XTwitterRequester();
        
        const content = await xRequester.getRandomContent(category);
        
        debugInfo.responseTime = Date.now() - startTime;

        // Test URL accessibility
        if (content.url) {
            try {
                debugInfo.urlAccessible = await testUrlAccessibility(content.url);
            } catch (urlError) {
                debugInfo.urlAccessible = false;
                debugInfo.errors.push(`URL test failed: ${urlError.message}`);
            }
        }

        return {
            ...content,
            debug: debug ? debugInfo : null
        };

    } catch (error) {
        debugInfo.errors.push(error.message);
        throw new Error(`X/Twitter test failed: ${error.message}`);
    }
}

async function testRedgifsContent(category, debug) {
    const startTime = Date.now();
    const debugInfo = { errors: [] };

    try {
        const RedgifsRequester = require('../../Functions/others/redgifs_requester.js');
        const redgifsRequester = new RedgifsRequester();
        
        const content = await redgifsRequester.getRandomContent(category);
        
        debugInfo.responseTime = Date.now() - startTime;

        // Test URL accessibility
        if (content.url) {
            try {
                debugInfo.urlAccessible = await testUrlAccessibility(content.url);
            } catch (urlError) {
                debugInfo.urlAccessible = false;
                debugInfo.errors.push(`URL test failed: ${urlError.message}`);
            }
        }

        return {
            ...content,
            debug: debug ? debugInfo : null
        };

    } catch (error) {
        debugInfo.errors.push(error.message);
        throw new Error(`Redgifs test failed: ${error.message}`);
    }
}

async function testUrlAccessibility(url) {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const timeout = 5000; // 5 second timeout
        
        const req = client.request(url, { method: 'HEAD', timeout }, (res) => {
            const isAccessible = res.statusCode >= 200 && res.statusCode < 400;
            resolve(isAccessible);
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}
