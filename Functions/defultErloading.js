const { EmbedBuilder, ApplicationCommandOptionType, PermissionsBitField, ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle } = require("discord.js");
const request = require("request");
require("dotenv").config();

function defaulterloading(interaction) {
    const embed = new EmbedBuilder()
        .setDescription(`⚠️ File too large! Searching for smaller content...\n\n*Please wait while Aurora finds suitable content*`)
        .setColor(process.env.EMBED_COLOR);

    return embed;
}

// Function to show final error when no content can be delivered
function finalErrorMessage(interaction) {
    const embed = new EmbedBuilder()
        .setDescription(`❌ **Unable to deliver content**\n\nAll available files were too large or unavailable.\n*Try again later for better results.*`)
        .setColor("#ff0000");

    return embed;
}

// Function to handle file size errors with automatic cleanup
async function handleFileSizeError(interaction, retryFunction = null, maxRetries = 3) {
    try {
        // Check if interaction can be replied to
        if (!interaction.isRepliable() || (!interaction.deferred && !interaction.replied)) {
            console.log('[Error Handler] Interaction not repliable or not deferred, skipping error handling');
            return;
        }

        // Show loading message first
        await interaction.editReply({
            embeds: [defaulterloading(interaction)],
            content: ""
        }).catch(error => {
            console.log('[Error Handler] Failed to show loading message:', error.message);
            return;
        });

        // If retry function provided, try it
        if (retryFunction) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`[Retry] Attempt ${attempt}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                    
                    const result = await retryFunction();
                    if (result) {
                        return true; // Success
                    }
                } catch (error) {
                    console.log(`[Retry] Attempt ${attempt} failed:`, error.message);
                }
            }
        }

        // If all retries failed or no retry function, show final error
        console.log('[Cleanup] All attempts failed, showing final error message');
        const finalEmbed = new EmbedBuilder()
            .setDescription(`❌ **Unable to deliver content**\n\nAll available files were too large or unavailable.\n*Try again later for better results.*`)
            .setColor("#ff0000");
            
        await interaction.editReply({
            embeds: [finalEmbed],
            content: ""
        }).catch(error => {
            console.log('[Error Handler] Failed to show final error message:', error.message);
            return;
        });

        // Delete the error message after 30 seconds
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
                console.log('[Cleanup] Error message deleted after 30 seconds');
            } catch (error) {
                // Only log if it's not a common "Unknown Message" error
                if (error.code !== 10008) { // 10008 = Unknown Message
                    console.log('[Cleanup] Could not delete message:', error.message);
                }
            }
        }, 30000);

        return false;
    } catch (error) {
        console.log('[Error Handler] Failed to handle file size error:', error);
        return false;
    }
}

// New function to handle file upload with retries
async function uploadWithRetry(interaction, apiFunction, maxRetries = 5) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
        try {
            attempts++;
            console.log(`[File Upload] Attempt ${attempts}/${maxRetries}`);
            
            // Call the API function to get content
            const result = await apiFunction();
            
            if (result && result.file && result.embed) {
                // Try to upload the file
                await interaction.editReply({ 
                    embeds: [result.embed], 
                    files: [result.file] 
                });
                console.log(`[File Upload] Success on attempt ${attempts}`);
                return true;
            }
            
        } catch (error) {
            console.log(`[File Upload] Attempt ${attempts} failed:`, error.message);
            
            // If it's the last attempt, show error
            if (attempts >= maxRetries) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription(`❌ Unable to find suitable content after ${maxRetries} attempts.\n\n*All files were too large or unavailable*`)
                    .setColor("#ff0000");
                    
                await interaction.editReply({ 
                    embeds: [errorEmbed],
                    content: ""
                });
                return false;
            }
            
            // Show loading message and continue
            if (attempts === 1) {
                await interaction.editReply({
                    embeds: [defaulterloading(interaction)],
                    content: ""
                });
            }
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return false;
}

// Helper function for hotscope API requests with retry
async function hotScopeWithRetry(interaction, client, searchTerm, maxRetries = 5) {
    const fetchContent = () => {
        return new Promise((resolve, reject) => {
            const randomPage = Math.floor(Math.random() * 10) + 1;
            request({
                uri: `https://api.hotscope.tv/videos/search?search=${searchTerm}&page=${randomPage}`,
                json: true,
                jsonReplacer: true,
                headers: {
                    "User-Agent": process.env.pinporn_agent,
                }
            }, async function (err, response, body) {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) {
                        return reject(new Error('API response invalid'));
                    }

                    const randomIndex = Math.floor(Math.random() * body.data.length);
                    const selectedItem = body.data[randomIndex];

                    if (!selectedItem || !selectedItem.id) {
                        return reject(new Error('No valid item found'));
                    }

                    const new_url = `https://api.hotscope.tv/videos/video/${selectedItem.id}`;
                    const new_options = {
                        json: true,
                        jsonReplacer: true,
                        url: new_url,
                        headers: {
                            'User-Agent': process.env.pinporn_agent,
                        }
                    };

                    request(new_options, async (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            try {
                                const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
                                
                                const file = new AttachmentBuilder()
                                    .setFile(body.video)
                                    .setName("Aurora.mp4")

                                const embed = new EmbedBuilder()
                                    .setDescription(`${body.title}`)
                                    .setColor(client.color)

                                resolve({ file, embed });
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(new Error(`API error: ${error || 'Status ' + response.statusCode}`));
                        }
                    });

                } catch (error) {
                    reject(error);
                }
            });
        });
    };

    return await uploadWithRetry(interaction, fetchContent, maxRetries);
}

module.exports = {
    defaulterloading,
    finalErrorMessage,
    handleFileSizeError,
    uploadWithRetry,
    hotScopeWithRetry,
};
