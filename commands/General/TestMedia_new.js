const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: ["testmedia-new"],
    description: "Test X/Twitter and Redgifs content retrieval and posting (Enhanced Version)",
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
        // Check if user has permissions (Admin or Manage Channels)
        const member = interaction.member;
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🚫 Access Denied')
                .setDescription('You need **Administrator** or **Manage Channels** permissions to test media functionality.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await interaction.deferReply();

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
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle(`⚠️ ${sourceUsed.toUpperCase()} Test`)
                    .setDescription(`❌ **No media URL returned from ${sourceUsed.toUpperCase()}**`)
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            // Determine if it's a video or image
            const isVideo = contentData.url.includes('.mp4') || contentData.url.includes('.webm');
            const isGif = contentData.url.includes('.gif');

            if (isVideo) {
                // For videos, send URL directly so Discord can embed it properly
                const videoEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`🎥 ${sourceUsed.toUpperCase()} Video Test`)
                    .setDescription(contentData.description || `Testing ${sourceUsed.toUpperCase()} video content`)
                    .setTimestamp()
                    .setFooter({ text: `✅ ${sourceUsed.toUpperCase()} video test completed` });

                // Add debug info if requested
                if (debug && contentData.debug) {
                    const debugInfo = [];
                    if (contentData.debug.responseTime) debugInfo.push(`⏱️ ${contentData.debug.responseTime}ms`);
                    if (contentData.debug.urlAccessible !== undefined) debugInfo.push(`🔗 ${contentData.debug.urlAccessible ? '✅' : '❌'}`);
                    if (debugInfo.length > 0) {
                        videoEmbed.addFields({ name: '🔍 Debug', value: debugInfo.join(' | '), inline: false });
                    }
                }

                await interaction.editReply({ 
                    embeds: [videoEmbed],
                    content: contentData.url  // Send video URL directly for Discord embedding
                });

            } else {
                // For images and GIFs, use embed image
                const mediaEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`${isGif ? '🎞️' : '🖼️'} ${sourceUsed.toUpperCase()} ${isGif ? 'GIF' : 'Image'} Test`)
                    .setDescription(contentData.description || `Testing ${sourceUsed.toUpperCase()} content`)
                    .setImage(contentData.url)
                    .setTimestamp()
                    .setFooter({ text: `✅ ${sourceUsed.toUpperCase()} ${isGif ? 'GIF' : 'image'} test completed` });

                // Add debug info if requested
                if (debug && contentData.debug) {
                    const debugInfo = [];
                    if (contentData.debug.responseTime) debugInfo.push(`⏱️ ${contentData.debug.responseTime}ms`);
                    if (contentData.debug.urlAccessible !== undefined) debugInfo.push(`🔗 ${contentData.debug.urlAccessible ? '✅' : '❌'}`);
                    if (debugInfo.length > 0) {
                        mediaEmbed.addFields({ name: '🔍 Debug', value: debugInfo.join(' | '), inline: false });
                    }
                }

                await interaction.editReply({ embeds: [mediaEmbed] });
            }

        } catch (error) {
            console.error('[TestMedia] Error during media test:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Media Test Failed')
                .setDescription(`**${sourceUsed.toUpperCase()} Error:** ${error.message}`)
                .setTimestamp();

            if (debug) {
                errorEmbed.addFields({ 
                    name: '🔍 Debug Stack', 
                    value: `\`\`\`${error.stack?.substring(0, 1000) || 'No stack trace available'}\`\`\``, 
                    inline: false 
                });
            }

            await interaction.editReply({ embeds: [errorEmbed] });
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
