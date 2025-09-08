const request = require('request');
const { EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    AttachmentBuilder } = require("discord.js");

const { request_site } = require("../others/one_requester")
const { PornHub } = require('pornhub.js')
const { defaultNSFW } = require("../defaultNsfwEmbed")
const { defaulterloading, finalErrorMessage, handleFileSizeError, uploadWithRetry, hotScopeWithRetry } = require("../defultErloading")
const { defershow } = require("../defaultErrshow")

// Function-level rate limiting to prevent rapid execution
const functionRateLimit = new Map();

function checkFunctionRateLimit(functionName, userId, minIntervalMs = 3000) {
    const key = `${functionName}_${userId}`;
    const now = Date.now();
    const lastCall = functionRateLimit.get(key);
    
    if (lastCall && (now - lastCall) < minIntervalMs) {
        const remaining = Math.ceil((minIntervalMs - (now - lastCall)) / 1000);
        return { allowed: false, remaining };
    }
    
    functionRateLimit.set(key, now);
    return { allowed: true };
}

// Cleanup old rate limit data every 5 minutes
setInterval(() => {
    const now = Date.now();
    const cutoff = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, timestamp] of functionRateLimit.entries()) {
        if (now - timestamp > cutoff) {
            functionRateLimit.delete(key);
        }
    }
}, 5 * 60 * 1000);

require("dotenv").config();
module.exports = {
    // Helper function to safely get array items and validate structure
    safeArrayAccess: function(arr, requiredPath = '') {
        if (!arr || !Array.isArray(arr) || arr.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * arr.length);
        const item = arr[randomIndex];
        
        if (!item) return null;
        
        // Check if required path exists (e.g., 'id', 'post.media.0.url')
        if (requiredPath) {
            const pathParts = requiredPath.split('.');
            let current = item;
            
            for (const part of pathParts) {
                if (part === '0' && Array.isArray(current)) {
                    current = current[0];
                } else if (current && typeof current === 'object') {
                    current = current[part];
                } else {
                    return null;
                }
                
                if (current === undefined || current === null) {
                    return null;
                }
            }
        }
        
        return item;
    },

    sleep: async function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    homemade_pinporn: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('homemade_pinporn', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }

            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) { console.log(`[HOMEMADE PINPORN] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[HOMEMADE PINPORN] Interaction no longer repliable'); return; }

            await interaction.deferReply();

            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({ uri: `https://pin.porn/api/videoInfo/?tag_id=327/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`, json: true, jsonReplacer: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, async (err, res, body) => {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) { console.log('[HOMEMADE PINPORN] API error or empty response'); await handleFileSizeError(interaction); return; }

                    const item = body.data[Math.floor(Math.random() * body.data.length)];
                    const file = new AttachmentBuilder().setFile(item.link).setName('Aurora.mp4');
                    const embed = new EmbedBuilder().setDescription(item.title || 'Homemade').setColor(client.color);
                    try { await interaction.editReply({ content: '**🔥️ Homemade Porn**', embeds: [embed], files: [file] }); } catch (uploadErr) { console.log('[HOMEMADE PINPORN] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[HOMEMADE PINPORN] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[HOMEMADE PINPORN Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    homemade_hotscop: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('homemade_hotscop', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) { console.log(`[HOMEMADE HOTSCOP] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[HOMEMADE HOTSCOP] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }
            await hotScopeWithRetry(interaction, client, 'homemade');
        } catch (error) { console.log('[HOMEMADE HOTSCOP Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    lesbian_pinporn: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('lesbian_pinporn', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) { console.log(`[LESBIAN PINPORN] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[LESBIAN PINPORN] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({ uri: `https://pin.porn/api/videoInfo/?tag_id=19/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`, json: true, jsonReplacer: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, async (err, res, body) => {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) { console.log('[LESBIAN PINPORN] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const item = body.data[Math.floor(Math.random() * body.data.length)];
                    const file = new AttachmentBuilder().setFile(item.link).setName('Aurora.mp4');
                    const embed = new EmbedBuilder().setDescription(item.title || 'Lesbian').setColor(client.color);
                    try { await interaction.editReply({ content: '**🔥️ Lesbian Porn**', embeds: [embed], files: [file] }); } catch (uploadErr) { console.log('[LESBIAN PINPORN] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[LESBIAN PINPORN] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[LESBIAN PINPORN Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    lesbian_hotscop: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('lesbian_hotscop', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2800) { console.log(`[LESBIAN HOTSCOP] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[LESBIAN HOTSCOP] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            const tryRequest = () => new Promise((resolve, reject) => {
                request({ uri: `https://api.hotscope.tv/videos/search?search=lesbian&page=${Math.floor(Math.random() * 10) + 1}`, json: true, jsonReplacer: true, headers: { "User-Agent": process.env.pinporn_agent }, timeout: 10000 }, (err, res, body) => {
                    if (err) return reject(err); if (!res || res.statusCode !== 200) return reject(new Error(`HTTP ${res ? res.statusCode : 'NO_RESPONSE'}`)); if (body && body.data && Array.isArray(body.data) && body.data.length > 0) return resolve(body); return reject(new Error('No data'));
                });
            });

            let body = null; try { body = await tryRequest(); } catch (e) { console.log('[LESBIAN HOTSCOP] tryRequest failed:', e.message); }
            if (!body) { const retrySuccess = await hotScopeWithRetry(interaction, client, 'lesbian', 3); if (!retrySuccess) await handleFileSizeError(interaction); return; }

            const selectedItem = module.exports.safeArrayAccess(body.data, 'id') || body.data[Math.floor(Math.random() * body.data.length)]; if (!selectedItem || !selectedItem.id) { await handleFileSizeError(interaction); return; }

            const detailUrl = `https://api.hotscope.tv/videos/video/${selectedItem.id}`;
            request({ url: detailUrl, json: true, headers: { "User-Agent": process.env.pinporn_agent }, timeout: 10000 }, async (err, res, videoBody) => {
                try {
                    if (err || !videoBody || !videoBody.video) { console.log('[LESBIAN HOTSCOP] Video detail fetch failed:', err?.message || 'No video'); await handleFileSizeError(interaction); return; }
                    const file = new AttachmentBuilder().setFile(videoBody.video).setName('Aurora.mp4'); const embed = new EmbedBuilder().setDescription(`${videoBody.title || 'Lesbian Content'}`).setColor(client.color);
                    try { await interaction.editReply({ embeds: [embed], files: [file] }); } catch (uploadErr) { console.log('[LESBIAN HOTSCOP] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[LESBIAN HOTSCOP] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[LESBIAN HOTSCOP Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    milf_pinporn: async function (interaction, client) {
        try {
            // Check function-level rate limiting first
            const rateCheck = checkFunctionRateLimit('milf_pinporn', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 });
                }
                return;
            }

            // Check interaction age
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) {
                console.log(`[Milf PinPorn] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            // Check if interaction is still valid before trying to defer
            if (!interaction.isRepliable()) {
                console.log('[Milf PinPorn] Interaction no longer repliable, skipping');
                return;
            }

            await interaction.deferReply();

            const support = client.support_server
            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            request({
                uri: `https://pin.porn/api/videoInfo/?tag_id=25/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                json: true,
                jsonReplacer: true,
                headers: {
                    "User-Agent": process.env.pinporn_agent,
                }
            }, async function (err, response, body) {
                try {
                    // Validate response
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) {
                        console.log('[Milf PinPorn] Invalid response, trying alternative');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const FileSender = new AttachmentBuilder()
                        .setFile(body.data[0].link)
                        .setName('Aurora.mp4')

                    const arryTags = body.data[0].tags
                    const SelectedTags = arryTags.map(tag => tag.tag).join(', ');

                    const embed = new EmbedBuilder()
                        .setDescription(body.data[0].title)
                        .setColor(client.color)
                    
                    try {
                        await interaction.editReply({
                            content: "**🔥️ Milf Porn**",
                            embeds: [embed],
                            files: [FileSender]
                        });
                    } catch (e) {
                        console.log('[File Error] Upload failed, handling file size error:', e.message);
                        await handleFileSizeError(interaction);
                    }

                } catch (requestError) {
                    console.log('[Milf PinPorn Request Error]:', requestError.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[Milf PinPorn Error]:', error.message);
            // Don't try to reply if interaction is already expired
            if (error.code !== 10062 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },


    milf_hotscop: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('milf_hotscop', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[MILF HOTSCOP] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[MILF HOTSCOP] Interaction no longer repliable'); return; }
            await interaction.deferReply(); if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            const tryRequest = (page = Math.floor(Math.random() * 7) + 1) => new Promise((resolve, reject) => {
                request({ uri: `https://api.hotscope.tv/videos/search?search=milf&page=${page}`, json: true, jsonReplacer: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, (err, res, body) => {
                    if (err) return reject(err); if (!res || res.statusCode !== 200) return reject(new Error(`HTTP ${res ? res.statusCode : 'NO_RESPONSE'}`)); if (body && body.data && Array.isArray(body.data) && body.data.length > 0) return resolve(body); return reject(new Error('No data'));
                });
            });

            let body = null; for (let i = 0; i < 3; i++) { try { body = await tryRequest(); break; } catch (e) { console.log('[MILF HOTSCOP] tryRequest failed:', e.message); } }
            if (!body) { const retrySuccess = await hotScopeWithRetry(interaction, client, 'milf', 3); if (!retrySuccess) await handleFileSizeError(interaction); return; }

            const selectedItem = module.exports.safeArrayAccess(body.data, 'id') || body.data[Math.floor(Math.random() * body.data.length)]; if (!selectedItem || !selectedItem.id) { await handleFileSizeError(interaction); return; }

            const detailUrl = `https://api.hotscope.tv/videos/video/${selectedItem.id}`;
            request({ url: detailUrl, json: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, async (err, res, videoBody) => {
                try {
                    if (err || !videoBody || !videoBody.video) { console.log('[MILF HOTSCOP] Video detail fetch failed:', err?.message || 'No video'); await handleFileSizeError(interaction); return; }
                    const file = new AttachmentBuilder().setFile(videoBody.video).setName('Aurora.mp4'); const embed = new EmbedBuilder().setDescription(`${videoBody.title || 'Milf Content'}`).setColor(client.color);
                    try { await interaction.editReply({ embeds: [embed], files: [file] }); } catch (uploadErr) { console.log('[MILF HOTSCOP] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[MILF HOTSCOP] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[MILF HOTSCOP Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },



    onlyfans_pinporn: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('onlyfans_pinporn', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[ONLYFANS PINPORN] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[ONLYFANS PINPORN] Interaction no longer repliable'); return; }
            await interaction.deferReply(); if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({ uri: `https://pin.porn/api/videoInfo/?tag_id=214/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`, json: true, jsonReplacer: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, async (err, res, body) => {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) { console.log('[ONLYFANS PINPORN] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const item = body.data[Math.floor(Math.random() * body.data.length)]; const file = new AttachmentBuilder().setFile(item.link).setName('Aurora.mp4'); const embed = new EmbedBuilder().setDescription(item.title || 'Onlyfans').setColor(client.color);
                    try { await interaction.editReply({ content: '**🔥️ Onlyfans Porn**', embeds: [embed], files: [file] }); } catch (uploadErr) { console.log('[ONLYFANS PINPORN] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[ONLYFANS PINPORN] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[ONLYFANS PINPORN Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    onlyfans_hotscop: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('onlyfans_hotscop', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2800) { console.log(`[ONLYFANS HOTSCOP] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[ONLYFANS HOTSCOP] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({
                uri: `https://api.hotscope.tv/videos/group?group=onlyfans&page=${Math.floor(Math.random() * 3) + 1}`,
                json: true,
                jsonReplacer: true,
                headers: { "User-Agent": process.env.pinporn_agent },
                timeout: 10000
            }, async function (err, response, body) {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) { console.log('[ONLYFANS HOTSCOP] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const selectedItem = module.exports.safeArrayAccess(body.data, 'id');
                    if (!selectedItem || !selectedItem.id) { console.log('[ONLYFANS HOTSCOP] No valid item found'); await handleFileSizeError(interaction); return; }

                    const randomId = selectedItem.id;
                    const new_url = `https://api.hotscope.tv/videos/video/${randomId}`;
                    request({ url: new_url, json: true, headers: { "User-Agent": process.env.pinporn_agent }, timeout: 10000 }, async (error, response, videoBody) => {
                        try {
                            if (error || !videoBody || !videoBody.video) { console.log('[ONLYFANS HOTSCOP] Video fetch failed'); await handleFileSizeError(interaction); return; }
                            const file = new AttachmentBuilder().setFile(videoBody.video).setName("Aurora.mp4");
                            const embed = new EmbedBuilder().setDescription(`${videoBody.title || 'OnlyFans Content'}`).setColor(client.color);
                            try { await interaction.editReply({ embeds: [embed], files: [file] }); } catch (e) { console.log('[ONLYFANS HOTSCOP] Upload failed:', e.message); await handleFileSizeError(interaction); }
                        } catch (ex) { console.log('[ONLYFANS HOTSCOP] Video processing error:', ex.message); await handleFileSizeError(interaction); }
                    });
                } catch (ex) { console.log('[ONLYFANS HOTSCOP] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[ONLYFANS HOTSCOP Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    porn_hotscop: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('porn_hotscop', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }

            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) { console.log(`[PORN HOTSCOP] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[PORN HOTSCOP] Interaction no longer repliable'); return; }

            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            const tryRequest = (page = Math.floor(Math.random() * 20) + 1) => new Promise((resolve, reject) => {
                request({ uri: `https://api.hotscope.tv/videos/group?group=other&page=${page}`, json: true, jsonReplacer: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, (err, res, body) => {
                    if (err) return reject(err);
                    if (!res || res.statusCode !== 200) return reject(new Error(`HTTP ${res ? res.statusCode : 'NO_RESPONSE'}`));
                    if (body && body.data && Array.isArray(body.data) && body.data.length > 0) return resolve(body);
                    return reject(new Error('No data'));
                });
            });

            let body = null;
            for (let i = 0; i < 3; i++) {
                try { body = await tryRequest(); break; } catch (e) { console.log('[PORN HOTSCOP] tryRequest failed:', e.message); }
            }

            if (!body) { const retrySuccess = await hotScopeWithRetry(interaction, client, 'other', 3); if (!retrySuccess) await handleFileSizeError(interaction); return; }

            const selectedItem = module.exports.safeArrayAccess(body.data, 'id') || body.data[Math.floor(Math.random() * body.data.length)];
            if (!selectedItem || !selectedItem.id) { await handleFileSizeError(interaction); return; }

            const detailUrl = `https://api.hotscope.tv/videos/video/${selectedItem.id}`;
            request({ url: detailUrl, json: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, async (err, res, videoBody) => {
                try {
                    if (err || !videoBody || !videoBody.video) { console.log('[PORN HOTSCOP] Video detail fetch failed:', err?.message || 'No video'); await handleFileSizeError(interaction); return; }
                    const file = new AttachmentBuilder().setFile(videoBody.video).setName('Aurora.mp4');
                    const embed = new EmbedBuilder().setDescription(`${videoBody.title || 'Porn Content'}`).setColor(client.color);
                    try { await interaction.editReply({ embeds: [embed], files: [file] }); } catch (uploadErr) { console.log('[PORN HOTSCOP] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[PORN HOTSCOP] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[PORN HOTSCOP Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    tiktok_hotscop: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('tiktok_hotscop', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[TIKTOK HOTSCOP] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[TIKTOK HOTSCOP] Interaction no longer repliable'); return; }
            await interaction.deferReply(); if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            const tryRequest = () => new Promise((resolve, reject) => {
                request({ uri: `https://api.hotscope.tv/videos/search?search=tiktok&page=1`, json: true, jsonReplacer: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, (err, res, body) => {
                    if (err) return reject(err); if (!res || res.statusCode !== 200) return reject(new Error(`HTTP ${res ? res.statusCode : 'NO_RESPONSE'}`)); if (body && body.data && Array.isArray(body.data) && body.data.length > 0) return resolve(body); return reject(new Error('No data'));
                });
            });

            let body = null; try { body = await tryRequest(); } catch (e) { console.log('[TIKTOK HOTSCOP] tryRequest failed:', e.message); }
            if (!body) { const retrySuccess = await hotScopeWithRetry(interaction, client, 'tiktok', 3); if (!retrySuccess) await handleFileSizeError(interaction); return; }

            const selectedItem = module.exports.safeArrayAccess(body.data, 'id') || body.data[Math.floor(Math.random() * body.data.length)]; if (!selectedItem || !selectedItem.id) { await handleFileSizeError(interaction); return; }

            const detailUrl = `https://api.hotscope.tv/videos/video/${selectedItem.id}`;
            request({ url: detailUrl, json: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, async (err, res, videoBody) => {
                try {
                    if (err || !videoBody || !videoBody.video) { console.log('[TIKTOK HOTSCOP] Video detail fetch failed:', err?.message || 'No video'); await handleFileSizeError(interaction); return; }
                    const file = new AttachmentBuilder().setFile(videoBody.video).setName('Aurora.mp4'); const embed = new EmbedBuilder().setDescription(`${videoBody.title || 'TikTok Content'}`).setColor(client.color);
                    try { await interaction.editReply({ embeds: [embed], files: [file] }); } catch (uploadErr) { console.log('[TIKTOK HOTSCOP] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[TIKTOK HOTSCOP] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[TIKTOK HOTSCOP Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    tiktok_pinporn: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('tiktok_pinporn', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[TIKTOK PINPORN] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[TIKTOK PINPORN] Interaction no longer repliable'); return; }
            await interaction.deferReply(); if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({ uri: `https://pin.porn/api/videoInfo/?tag_id=226/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`, json: true, jsonReplacer: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, async (err, res, body) => {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) { console.log('[TIKTOK PINPORN] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const item = body.data[Math.floor(Math.random() * body.data.length)]; const file = new AttachmentBuilder().setFile(item.link).setName('Aurora.mp4'); const embed = new EmbedBuilder().setDescription(item.title || 'Nsfw TikTok').setColor(client.color);
                    try { await interaction.editReply({ content: '**🔥️ Nsfw TikTok**', embeds: [embed], files: [file] }); } catch (uploadErr) { console.log('[TIKTOK PINPORN] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[TIKTOK PINPORN] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[TIKTOK PINPORN Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    tiktok_tikporn: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('tiktok_tikporn', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[TIKTOK TIKPORN] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[TIKTOK TIKPORN] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({
                uri: `https://api.tik.porn/api/video/getrecommendation`,
                json: true,
                jsonReplacer: true,
                headers: { "User-Agent": process.env.pinporn_agent },
                timeout: 10000
            }, async function (err, response, body) {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) { console.log('[TIKTOK TIKPORN] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const entry = body.data[0];
                    const title = entry?.video_text?.meta_title?.default?.text || '';
                    const StandarnPornResponseText = title.length > 20 ? title.slice(0, 20) + '...' : title;
                    const embed = new EmbedBuilder().setDescription(`${StandarnPornResponseText}`).setColor(client.color);
                    const FileSender = new AttachmentBuilder().setFile(entry.fileurl || entry.file || entry.fileUrl).setName('Aurora.mp4');
                    try { await interaction.editReply({ content: "**🔥️ Nsfw TikTok**", embeds: [embed], files: [FileSender] }); } catch (e) { console.log('[TIKTOK TIKPORN] Upload failed:', e.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[TIKTOK TIKPORN] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[TIKTOK TIKPORN Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    tiktok_onlytik: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('tiktok_onlytik', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[TIKTOK ONLYTIK] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[TIKTOK ONLYTIK] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({
                method: 'POST',
                uri: `https://onlytik.com/api/new-videos`,
                json: true,
                jsonReplacer: true,
                headers: { "User-Agent": process.env.pinporn_agent },
                body: { limit: 10 },
                timeout: 10000
            }, async function (err, response, body) {
                try {
                    if (err || !body || !Array.isArray(body) || body.length === 0) { console.log('[TIKTOK ONLYTIK] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const MapTheAPi = Math.floor(Math.random() * body.length);
                    const entry = body[MapTheAPi];
                    const randomUrl = entry.url || entry.file || entry.video || null;
                    if (!randomUrl) { console.log('[TIKTOK ONLYTIK] No video URL found in entry'); await handleFileSizeError(interaction); return; }
                    const FileSender = new AttachmentBuilder().setFile(randomUrl).setName('FpicyFlix.mp4');
                    try { await interaction.editReply({ content: "**🔥️ Nsfw TikTok**", files: [FileSender] }); } catch (e) { console.log('[TIKTOK ONLYTIK] Upload failed:', e.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[TIKTOK ONLYTIK] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[TIKTOK ONLYTIK Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    tiktok_tube: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('tiktok_tube', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[TIKTOK TUBE] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[TIKTOK TUBE] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            let RadnomMaximumuAccordingToSitePage = Math.floor(Math.random() * 70) + 1;
            request({
                uri: `https://tikporn.tube/api/videos2.php?params=3600/str/relevance/${RadnomMaximumuAccordingToSitePage}/search..1.all..&s=tiktok`,
                json: true,
                jsonReplacer: true,
                headers: { "User-Agent": process.env.pinporn_agent },
                timeout: 10000
            }, async function (err, response, body) {
                try {
                    if (err || !body || !body.videos || !Array.isArray(body.videos) || body.videos.length === 0) { console.log('[TIKTOK TUBE] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const videos = body.videos;
                    const randomIndex = Math.floor(Math.random() * videos.length);
                    const randomVideo = videos[randomIndex];
                    const randomVideoId = randomVideo.video_id;
                    const videoLink = `https://v.tikporn.tube/videos/${randomVideoId}.mp4`;
                    const file = new AttachmentBuilder().setFile(videoLink).setName("Aurora.mp4");
                    const embed = new EmbedBuilder().setDescription(randomVideo.title || "dont have").setColor(client.color);
                    try { await interaction.editReply({ content: "**🔥️ Nsfw TikTok**", files: [file], embeds: [embed] }); } catch (e) { console.log('[TIKTOK TUBE] Upload failed:', e.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[TIKTOK TUBE] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[TIKTOK TUBE Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    tiktok_figfat: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('tiktok_figfat', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[TIKTOK FIGFAT] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[TIKTOK FIGFAT] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            let shet = Math.floor(Math.random() * 30) + 1;
            let skipp = Math.floor(Math.random() * 4) + 1;
            const requestData = { a: 'discover', skip: skipp, limit: shet, id: 0, sort: 1, author: '', discover: 'tiktok', category: '' };

            request({ uri: `https://fiqfuq.com/api`, json: true, method: 'POST', jsonReplacer: true, headers: { "User-Agent": process.env.pinporn_agent }, body: requestData, timeout: 10000 }, async function (err, response, body) {
                try {
                    if (err || !body || !Array.isArray(body) || body.length === 0) { console.log('[TIKTOK FIGFAT] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const randomItem = body[Math.floor(Math.random() * body.length)];
                    const videoUrl = randomItem.video_url || randomItem.video || randomItem.file || '';
                    const thumbnailUrl = randomItem.thumbnail;
                    const desc = randomItem.description;

                    let file;
                    if (typeof videoUrl === 'string' && videoUrl.endsWith('.mp4')) { file = new AttachmentBuilder().setFile(videoUrl).setName("Aurora.mp4"); }
                    else if (typeof videoUrl === 'string' && (videoUrl.endsWith('.jpg') || videoUrl.endsWith('.jpeg') || videoUrl.endsWith('.png'))) { file = new AttachmentBuilder().setFile(videoUrl).setName("Aurora.jpg"); }
                    else { console.log('[TIKTOK FIGFAT] Invalid file format or missing URL'); }

                    const embed = new EmbedBuilder().setDescription(desc || "don't have").setColor(client.color);
                    try { await interaction.editReply({ content: "**🔥️ Nsfw TikTok**", embeds: [embed], files: file ? [file] : [] }); } catch (e) { console.log('[TIKTOK FIGFAT] Upload failed:', e.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[TIKTOK FIGFAT] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[TIKTOK FIGFAT Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    neko_4k: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('neko_4k', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[NEKO 4K] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[NEKO 4K] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            try {
                let response = await fetch(`https://nekobot.xyz/api/image?type=4k`).then(r => r.json());
                if (!response || !response.message) { console.log('[NEKO 4K] API returned invalid response'); await handleFileSizeError(interaction); return; }

                const file = new AttachmentBuilder(`${response.message}`).setName('Aurora.png');
                const get = new EmbedBuilder().setTitle('4k Photo').setImage('attachment://Aurora.png').setColor(client.color);
                try { await interaction.editReply({ embeds: [get], files: [file] }); } catch (uploadErr) { console.log('[NEKO 4K] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
            } catch (err) {
                console.log('[NEKO 4K] API error:', err.message);
                const apioff = new EmbedBuilder().setDescription(`Oops! the api is off\n\n[Support Server](${client.support})`).setColor(client.color);
                await interaction.editReply({ embeds: [apioff] }).catch(() => {});
            }
        } catch (error) { console.log('[NEKO 4K Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    neko_anal: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('neko_anal', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[NEKO ANAL] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[NEKO ANAL] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            try {
                let response = await fetch(`https://nekobot.xyz/api/image?type=anal`).then(r => r.json());
                if (!response || !response.message) { console.log('[NEKO ANAL] API returned invalid response'); await handleFileSizeError(interaction); return; }

                const imageUrl = response.message;
                let resptype = '';
                if (imageUrl.endsWith('.gif')) { resptype = 'gif'; } 
                else if (imageUrl.endsWith('.jpg')) { resptype = 'png'; } 
                else { resptype = 'png'; }

                const file = new AttachmentBuilder(imageUrl).setName(`Aurora.${resptype}`);
                const get = new EmbedBuilder().setTitle('Anal Nude').setImage(`attachment://Aurora.${resptype}`).setColor(client.color);
                try { await interaction.editReply({ embeds: [get], files: [file] }); } catch (uploadErr) { console.log('[NEKO ANAL] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
            } catch (err) {
                console.log('[NEKO ANAL] API error:', err.message);
                const apioff = new EmbedBuilder().setDescription(`Oops! the api is off\n\n[Support Server](${client.support})`).setColor(client.color);
                await interaction.editReply({ embeds: [apioff] }).catch(() => {});
            }
        } catch (error) { console.log('[NEKO ANAL Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    neko_paizuri: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('neko_paizuri', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[NEKO PAIZURI] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[NEKO PAIZURI] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            try {
                let response = await fetch(`https://nekobot.xyz/api/image?type=paizuri`).then(r => r.json());
                if (!response || !response.message) { console.log('[NEKO PAIZURI] API returned invalid response'); await handleFileSizeError(interaction); return; }

                const file = new AttachmentBuilder(`${response.message}`).setName('Aurora.png');
                const get = new EmbedBuilder().setTitle('Paizuri Nude').setImage('attachment://Aurora.png').setColor(client.color);
                try { await interaction.editReply({ embeds: [get], files: [file] }); } catch (uploadErr) { console.log('[NEKO PAIZURI] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
            } catch (err) {
                console.log('[NEKO PAIZURI] API error:', err.message);
                const apioff = new EmbedBuilder().setDescription(`Oops! the api is off\n\n[Support Server](${client.support})`).setColor(client.color);
                await interaction.editReply({ embeds: [apioff] }).catch(() => {});
            }
        } catch (error) { console.log('[NEKO PAIZURI Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    neko_tentacle: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('neko_tentacle', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[NEKO TENTACLE] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[NEKO TENTACLE] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            try {
                let response = await fetch(`https://nekobot.xyz/api/image?type=tentacle`).then(r => r.json());
                if (!response || !response.message) { console.log('[NEKO TENTACLE] API returned invalid response'); await handleFileSizeError(interaction); return; }

                const file = new AttachmentBuilder(`${response.message}`).setName('Aurora.png');
                const get = new EmbedBuilder().setTitle('Tentacle Nude').setImage('attachment://Aurora.png').setColor(client.color);
                try { await interaction.editReply({ embeds: [get], files: [file] }); } catch (uploadErr) { console.log('[NEKO TENTACLE] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
            } catch (err) {
                console.log('[NEKO TENTACLE] API error:', err.message);
                const apioff = new EmbedBuilder().setDescription(`Oops! the api is off\n\n[Support Server](${client.support})`).setColor(client.color);
                await interaction.editReply({ embeds: [apioff] }).catch(() => {});
            }
        } catch (error) { console.log('[NEKO TENTACLE Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    neko_yaoi: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('neko_yaoi', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[NEKO YAOI] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[NEKO YAOI] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            try {
                let response = await fetch(`https://nekobot.xyz/api/image?type=yaoi`).then(r => r.json());
                if (!response || !response.message) { console.log('[NEKO YAOI] API returned invalid response'); await handleFileSizeError(interaction); return; }

                const file = new AttachmentBuilder(`${response.message}`).setName('Aurora.png');
                const get = new EmbedBuilder().setTitle('Yaoi Nude').setImage('attachment://Aurora.png').setColor(client.color);
                try { await interaction.editReply({ embeds: [get], files: [file] }); } catch (uploadErr) { console.log('[NEKO YAOI] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
            } catch (err) {
                console.log('[NEKO YAOI] API error:', err.message);
                const apioff = new EmbedBuilder().setDescription(`Oops! the api is off\n\n[Support Server](${client.support})`).setColor(client.color);
                await interaction.editReply({ embeds: [apioff] }).catch(() => {});
            }
        } catch (error) { console.log('[NEKO YAOI Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    anal_hotscop: async function (interaction, client) {
        try {
            // Check function-level rate limiting first
            const rateCheck = checkFunctionRateLimit('anal_hotscop', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({
                        content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`,
                        flags: 64
                    });
                }
                return;
            }

            // Check interaction age immediately
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2000) {
                console.log(`[ANAL HOTSCOP] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            // Check if interaction is still valid before deferring
            if (!interaction.isRepliable()) {
                console.log('[ANAL HOTSCOP] Interaction no longer repliable');
                return;
            }

            // Defer immediately to prevent timeout
            await interaction.deferReply();

            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            // Try multiple search terms to improve success rate
            const searchTerms = ['anal', 'hardcore', 'porn', 'adult'];
            let attempts = 0;
            const maxAttempts = searchTerms.length;

            const tryRequest = async (searchTerm, page = 1) => {
                return new Promise((resolve, reject) => {
                    request({
                        uri: `https://api.hotscope.tv/videos/search?search=${searchTerm}&page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            "User-Agent": process.env.pinporn_agent,
                        },
                        timeout: 10000 // 10 second timeout
                    }, function (err, response, body) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        if (response.statusCode !== 200) {
                            reject(new Error(`HTTP ${response.statusCode}`));
                            return;
                        }

                        if (body && body.data && Array.isArray(body.data) && body.data.length > 0) {
                            resolve(body);
                        } else {
                            reject(new Error('No data returned'));
                        }
                    });
                });
            };

            // Try each search term until we get results
            let body = null;
            for (const searchTerm of searchTerms) {
                try {
                    console.log(`[ANAL HOTSCOP] Trying search term: ${searchTerm}`);
                    body = await tryRequest(searchTerm, Math.floor(Math.random() * 5) + 1);
                    break; // Success, exit loop
                } catch (error) {
                    console.log(`[ANAL HOTSCOP] Search term '${searchTerm}' failed:`, error.message);
                    attempts++;
                }
            }

            if (!body) {
                console.log("[ANAL HOTSCOP] All search attempts failed, using fallback");
                await handleFileSizeError(interaction);
                return;
            }

            const selectedItem = body.data[Math.floor(Math.random() * body.data.length)];
            if (!selectedItem || !selectedItem.id) {
                console.log("[ANAL HOTSCOP] Invalid item selected");
                await handleFileSizeError(interaction);
                return;
            }

            // Get video details
            const detailUrl = `https://api.hotscope.tv/videos/video/${selectedItem.id}`;
            request({
                url: detailUrl,
                json: true,
                headers: { "User-Agent": process.env.pinporn_agent },
                timeout: 10000
            }, async (error, response, videoBody) => {
                try {
                    if (error || !videoBody || !videoBody.video) {
                        console.log('[ANAL HOTSCOP] Video details failed:', error?.message || 'No video data');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const file = new AttachmentBuilder()
                        .setFile(videoBody.video)
                        .setName("Aurora.mp4");

                    const embed = new EmbedBuilder()
                        .setDescription(`${videoBody.title || 'Anal Content'}`)
                        .setColor(client.color);

                    await interaction.editReply({ embeds: [embed], files: [file] });

                } catch (uploadError) {
                    console.log('[ANAL HOTSCOP] Upload failed:', uploadError.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[ANAL HOTSCOP Error]:', error.message);
            // Don't try to reply if interaction is already expired
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },


    anal_pinporn: async function (interaction, client) {
        try {
            // Check function-level rate limiting first
            const rateCheck = checkFunctionRateLimit('anal_pinporn', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({
                        content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`,
                        ephemeral: true
                    });
                }
                return;
            }

            // Check interaction age immediately
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) {
                console.log(`[ANAL PINPORN] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            // Check if interaction is still valid before deferring
            if (!interaction.isRepliable()) {
                console.log('[ANAL PINPORN] Interaction no longer repliable');
                return;
            }

            // Defer immediately to prevent timeout
            await interaction.deferReply();

            const support = client.support_server
            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            request({
                uri: `https://pin.porn/api/videoInfo/?tag_id=7/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                json: true,
                jsonReplacer: true,
                headers: {
                    "User-Agent": process.env.pinporn_agent,
                }
            }, async function (err, response, body) {
                try {
                    // Validate response
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) {
                        console.log('[Anal PinPorn] Invalid response, trying alternative');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const FileSender = new AttachmentBuilder()
                        .setFile(body.data[0].link)
                        .setName('Aurora.mp4')

                    const arryTags = body.data[0].tags
                    const SelectedTags = arryTags.map(tag => tag.tag).join(', ');

                    const embed = new EmbedBuilder()
                        .setDescription(body.data[0].title)
                        .setColor(client.color)
                    
                    try {
                        await interaction.editReply({
                            content: "**🔥️ Anal Porn**",
                            embeds: [embed],
                            files: [FileSender]
                        });
                    } catch (e) {
                        console.log('[File Error] Upload failed, handling file size error:', e.message);
                        await handleFileSizeError(interaction);
                    }

                } catch (requestError) {
                    console.log('[Anal PinPorn Request Error]:', requestError.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[Anal PinPorn Error]:', error.message);
            // Don't try to reply if interaction is already expired
            if (error.code !== 10062 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },

    asian_hotscop: async function (interaction, client) {
        try {
            // function-level rate limiting
            const rateCheck = checkFunctionRateLimit('asian_hotscop', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 });
                }
                return;
            }

            // quick interaction age check - more lenient for API calls
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2800) {
                console.log(`[ASIAN HOTSCOP] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            if (!interaction.isRepliable()) {
                console.log('[ASIAN HOTSCOP] Interaction no longer repliable');
                return;
            }

            await interaction.deferReply();

            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            const tryRequest = (page = Math.floor(Math.random() * 6) + 1) => {
                return new Promise((resolve, reject) => {
                    request({
                        uri: `https://api.hotscope.tv/videos/search?search=asian&page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: { 'User-Agent': process.env.pinporn_agent },
                        timeout: 8000 // Reduced timeout
                    }, (err, res, body) => {
                        if (err) return reject(err);
                        if (!res || res.statusCode !== 200) return reject(new Error(`HTTP ${res ? res.statusCode : 'NO_RESPONSE'}`));
                        if (body && body.data && Array.isArray(body.data) && body.data.length > 0) return resolve(body);
                        return reject(new Error('No data'));
                    });
                });
            };

            let body = null;
            // try a few random pages to increase chance of results
            for (let i = 0; i < 3; i++) {
                try {
                    body = await tryRequest();
                    break;
                } catch (e) {
                    console.log('[ASIAN HOTSCOP] tryRequest failed:', e.message);
                }
            }

            if (!body) {
                // fallback to shared helper which may have smarter retries
                const retrySuccess = await hotScopeWithRetry(interaction, client, 'asian', 3);
                if (!retrySuccess) await handleFileSizeError(interaction);
                return;
            }

            const selectedItem = module.exports.safeArrayAccess(body.data, 'id') || body.data[Math.floor(Math.random() * body.data.length)];
            if (!selectedItem || !selectedItem.id) {
                await handleFileSizeError(interaction);
                return;
            }

            const detailUrl = `https://api.hotscope.tv/videos/video/${selectedItem.id}`;
            request({ url: detailUrl, json: true, headers: { 'User-Agent': process.env.pinporn_agent }, timeout: 10000 }, async (err, res, videoBody) => {
                try {
                    if (err || !videoBody || !videoBody.video) {
                        console.log('[ASIAN HOTSCOP] Video detail fetch failed:', err?.message || 'no video');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const file = new AttachmentBuilder().setFile(videoBody.video).setName('Aurora.mp4');
                    const embed = new EmbedBuilder().setDescription(`${videoBody.title || 'Asian Content'}`).setColor(client.color);

                    try {
                        await interaction.editReply({ embeds: [embed], files: [file] });
                    } catch (uploadErr) {
                        console.log('[ASIAN HOTSCOP] Upload failed:', uploadErr.message);
                        await handleFileSizeError(interaction);
                    }
                } catch (ex) {
                    console.log('[ASIAN HOTSCOP] Unexpected error:', ex.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[ASIAN HOTSCOP Error]:', error.message);
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },


    asian_pinporn: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('asian_pinporn', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2800) { console.log(`[ASIAN PINPORN] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[ASIAN PINPORN] Interaction no longer repliable'); return; }

            await interaction.deferReply();

            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({
                uri: `https://pin.porn/api/videoInfo/?tag_id=32/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                json: true,
                jsonReplacer: true,
                headers: { 'User-Agent': process.env.pinporn_agent },
                timeout: 8000 // Reduced timeout
            }, async (err, res, body) => {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) {
                        console.log('[ASIAN PINPORN] API error or no data - trying alternative');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const item = body.data[Math.floor(Math.random() * body.data.length)];
                    if (!item || !item.link) { await handleFileSizeError(interaction); return; }

                    const file = new AttachmentBuilder().setFile(item.link).setName('Aurora.mp4');
                    const embed = new EmbedBuilder().setDescription(item.title || 'Asian Content').setColor(client.color);

                    try {
                        await interaction.editReply({ content: '**🔥️ Asian Porn**', embeds: [embed], files: [file] });
                    } catch (uploadErr) {
                        console.log('[ASIAN PINPORN] Upload failed:', uploadErr.message);
                        await handleFileSizeError(interaction);
                    }
                } catch (ex) {
                    console.log('[ASIAN PINPORN] Unexpected error:', ex.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[ASIAN PINPORN Error]:', error.message);
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },


    boobs_hotscop: async function (interaction, client) {
        try {
            // Check function-level rate limiting first
            const rateCheck = checkFunctionRateLimit('boobs_hotscop', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({
                        content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`,
                        flags: 64
                    });
                }
                return;
            }

            // Check interaction age immediately
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2000) {
                console.log(`[BOOBS HOTSCOP] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            // Check if interaction is still valid before deferring
            if (!interaction.isRepliable()) {
                console.log('[BOOBS HOTSCOP] Interaction no longer repliable');
                return;
            }

            // Defer immediately to prevent timeout
            await interaction.deferReply();
            
            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            // Try multiple search terms to improve success rate
            const searchTerms = ['boobs', 'tits', 'breasts', 'busty'];
            let attempts = 0;
            const maxAttempts = searchTerms.length;

            const tryRequest = async (searchTerm, page = 1) => {
                return new Promise((resolve, reject) => {
                    request({
                        uri: `https://api.hotscope.tv/videos/search?search=${searchTerm}&page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            "User-Agent": process.env.pinporn_agent,
                        },
                        timeout: 10000
                    }, function (err, response, body) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        if (response.statusCode !== 200) {
                            reject(new Error(`HTTP ${response.statusCode}`));
                            return;
                        }

                        if (body && body.data && Array.isArray(body.data) && body.data.length > 0) {
                            resolve(body);
                        } else {
                            reject(new Error('No data returned'));
                        }
                    });
                });
            };

            // Try each search term until we get results
            let body = null;
            for (const searchTerm of searchTerms) {
                try {
                    console.log(`[BOOBS HOTSCOP] Trying search term: ${searchTerm}`);
                    body = await tryRequest(searchTerm, Math.floor(Math.random() * 10) + 1);
                    break; // Success, exit loop
                } catch (error) {
                    console.log(`[BOOBS HOTSCOP] Search term '${searchTerm}' failed:`, error.message);
                    attempts++;
                }
            }

            if (!body) {
                console.log("[BOOBS HOTSCOP] All search attempts failed, using fallback");
                await handleFileSizeError(interaction);
                return;
            }

            const selectedItem = body.data[Math.floor(Math.random() * body.data.length)];
            if (!selectedItem || !selectedItem.id) {
                console.log("[BOOBS HOTSCOP] Invalid item selected");
                await handleFileSizeError(interaction);
                return;
            }

            // Get video details
            const detailUrl = `https://api.hotscope.tv/videos/video/${selectedItem.id}`;
            request({
                url: detailUrl,
                json: true,
                headers: { "User-Agent": process.env.pinporn_agent },
                timeout: 10000
            }, async (error, response, videoBody) => {
                try {
                    if (error || !videoBody || !videoBody.video) {
                        console.log('[BOOBS HOTSCOP] Video details failed:', error?.message || 'No video data');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const file = new AttachmentBuilder()
                        .setFile(videoBody.video)
                        .setName("Aurora.mp4");

                    const embed = new EmbedBuilder()
                        .setDescription(`${videoBody.title || 'Boobs Content'}`)
                        .setColor(client.color);

                    await interaction.editReply({ embeds: [embed], files: [file] });

                } catch (uploadError) {
                    console.log('[BOOBS HOTSCOP] Upload failed:', uploadError.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[BOOBS HOTSCOP Error]:', error.message);
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },

    boobs_pinporn: async function (interaction, client) {
        try {
            // Check function-level rate limiting first
            const rateCheck = checkFunctionRateLimit('boobs_pinporn', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({
                        content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`,
                        flags: 64
                    });
                }
                return;
            }

            // Check interaction age immediately
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2000) {
                console.log(`[BOOBS PINPORN] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            // Check if interaction is still valid before deferring
            if (!interaction.isRepliable()) {
                console.log('[BOOBS PINPORN] Interaction no longer repliable');
                return;
            }

            // Defer immediately to prevent timeout
            await interaction.deferReply();

            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            // Try multiple pages to improve success rate
            const maxAttempts = 3;
            let attempts = 0;

            const tryRequest = async () => {
                return new Promise((resolve, reject) => {
                    const page = Math.floor(Math.random() * 20) + 1;
                    const ipp = Math.floor(Math.random() * 45) + 1;
                    
                    request({
                        uri: `https://pin.porn/api/videoInfo/?tag_id=201/&ipp=${ipp}&from_page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            "User-Agent": process.env.pinporn_agent,
                        },
                        timeout: 10000
                    }, function (err, response, body) {
                        if (err) {
                            reject(err);
                            return;
                        }

                        if (response.statusCode !== 200) {
                            reject(new Error(`HTTP ${response.statusCode}`));
                            return;
                        }

                        if (body && body.data && Array.isArray(body.data) && body.data.length > 0) {
                            resolve(body);
                        } else {
                            reject(new Error('No data returned'));
                        }
                    });
                });
            };

            // Retry logic
            let body = null;
            while (attempts < maxAttempts && !body) {
                try {
                    console.log(`[BOOBS PINPORN] Attempt ${attempts + 1}/${maxAttempts}`);
                    body = await tryRequest();
                    break;
                } catch (error) {
                    console.log(`[BOOBS PINPORN] Attempt ${attempts + 1} failed:`, error.message);
                    attempts++;
                }
            }

            if (!body) {
                console.log("[BOOBS PINPORN] All attempts failed");
                await handleFileSizeError(interaction);
                return;
            }

            const selectedItem = body.data[Math.floor(Math.random() * body.data.length)];
            if (!selectedItem || !selectedItem.link) {
                console.log("[BOOBS PINPORN] Invalid item selected");
                await handleFileSizeError(interaction);
                return;
            }

            const FileSender = new AttachmentBuilder()
                .setFile(selectedItem.link)
                .setName('Aurora.mp4');

            const arryTags = selectedItem.tags || [];
            const SelectedTags = arryTags.map(tag => tag.tag || tag).join(', ');

            const embed = new EmbedBuilder()
                .setDescription(selectedItem.title || 'Boobs Content')
                .setColor(client.color);

            try {
                await interaction.editReply({
                    content: "**🔥️ Boobs Porn**",
                    embeds: [embed],
                    files: [FileSender]
                });
            } catch (uploadError) {
                console.log('[BOOBS PINPORN] Upload failed:', uploadError.message);
                await handleFileSizeError(interaction);
            }

        } catch (error) {
            console.log('[BOOBS PINPORN Error]:', error.message);
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },


    gay_pinporn: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                request({
                    uri: `https://pin.porn/api/videoInfo/?tag_id=560/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                    json: true,
                    jsonReplacer: true,
                    headers: {
                        "User-Agent": process.env.pinporn_agent,
                    }
                }, async function (err, response, body) {

                    const FileSender = new AttachmentBuilder()
                        .setFile(body.data[0].link)
                        .setName('Aurora.mp4')

                    const arryTags = body.data[0].tags
                    const SelectedTags = arryTags.map(tag => tag.tag).join(', ');

                    const embed = new EmbedBuilder()
                        .setDescription(body.data[0].title)
                        .setColor(client.color)
                    try {
                        interaction.editReply({
                            content: "**🔥️ Gay Porn**",
                            embeds: [embed],
                            files: [FileSender]
                        })
                    } catch (e) {
                                    console.log('[File Error] Upload failed, handling file size error:', e.message);
                                    await handleFileSizeError(interaction);
                                }
                })
            }
        })
    },


    porn_pinporn: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                request({
                    uri: `https://pin.porn/api/videoInfo/?tag_id=${[535, 58, 270, 25, 14, 201, 7][Math.floor(Math.random() * 7)]}/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                    // https://pin.porn/api/videoInfo/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}
                    json: true,
                    jsonReplacer: true,
                    headers: {
                        "User-Agent": process.env.pinporn_agent,
                    }
                }, async function (err, response, body) {

                    const FileSender = new AttachmentBuilder()
                        .setFile(body.data[0].link)
                        .setName('Aurora.mp4')

                    const arryTags = body.data[0].tags
                    const SelectedTags = arryTags.map(tag => tag.tag).join(', ');

                    const embed = new EmbedBuilder()
                        .setDescription(body.data[0].title)
                        .setColor(client.color)
                    try {
                        interaction.editReply({
                            content: "**🔥️ Random Porn**",
                            embeds: [embed],
                            files: [FileSender]
                        })
                    } catch (e) {
                                    console.log('[File Error] Upload failed, handling file size error:', e.message);
                                    await handleFileSizeError(interaction);
                                }
                })
            }
        })
    },

    cuckold_pinporn: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('cuckold_pinporn', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[CUCKOLD PINPORN] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[CUCKOLD PINPORN] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({
                uri: `https://pin.porn/api/videoInfo/?tag_id=592/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                json: true,
                jsonReplacer: true,
                headers: { "User-Agent": process.env.pinporn_agent },
                timeout: 10000
            }, async function (err, response, body) {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) { console.log('[CUCKOLD PINPORN] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const entry = body.data[0];
                    const FileSender = new AttachmentBuilder().setFile(entry.link).setName('Aurora.mp4');
                    const arryTags = entry.tags || []; const SelectedTags = arryTags.map(tag => tag.tag).join(', ');
                    const embed = new EmbedBuilder().setDescription(entry.title || 'Cuckold Content').setColor(client.color);
                    try { await interaction.editReply({ content: "**🔥️ Cuckold Porn**", embeds: [embed], files: [FileSender] }); } catch (e) { console.log('[CUCKOLD PINPORN] Upload failed:', e.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[CUCKOLD PINPORN] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[CUCKOLD PINPORN Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    blowjob_pinporn: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('blowjob_pinporn', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[BLOWJOB PINPORN] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[BLOWJOB PINPORN] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({
                uri: `https://pin.porn/api/videoInfo/?tag_id=14/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                json: true,
                jsonReplacer: true,
                headers: { "User-Agent": process.env.pinporn_agent },
                timeout: 10000
            }, async function (err, response, body) {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) { console.log('[BLOWJOB PINPORN] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const entry = body.data[0];
                    const FileSender = new AttachmentBuilder().setFile(entry.link).setName('Aurora.mp4');
                    const arryTags = entry.tags || []; const SelectedTags = arryTags.map(tag => tag.tag).join(', ');
                    const embed = new EmbedBuilder().setDescription(entry.title || 'Blowjob Content').setColor(client.color);
                    try { await interaction.editReply({ content: "**🔥️ Blowjob Porn**", embeds: [embed], files: [FileSender] }); } catch (e) { console.log('[BLOWJOB PINPORN] Upload failed:', e.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[BLOWJOB PINPORN] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[BLOWJOB PINPORN Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    eboy_pinporn: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('eboy_pinporn', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[EBOY PINPORN] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[EBOY PINPORN] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            request({
                uri: `https://pin.porn/api/videoInfo/?tag_id=12/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                json: true,
                jsonReplacer: true,
                headers: { "User-Agent": process.env.pinporn_agent },
                timeout: 10000
            }, async function (err, response, body) {
                try {
                    if (err || !body || !body.data || !Array.isArray(body.data) || body.data.length === 0) { console.log('[EBOY PINPORN] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const entry = body.data[0];
                    const FileSender = new AttachmentBuilder().setFile(entry.link).setName('Aurora.mp4');
                    const arryTags = entry.tags || []; const SelectedTags = arryTags.map(tag => tag.tag).join(', ');
                    const embed = new EmbedBuilder().setDescription(entry.title || 'Eboy Content').setColor(client.color);
                    try { await interaction.editReply({ content: "**🔥️ Eboy Porn**", embeds: [embed], files: [FileSender] }); } catch (e) { console.log('[EBOY PINPORN] Upload failed:', e.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[EBOY PINPORN] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[EBOY PINPORN Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    neko_nekoa: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('neko_nekoa', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[NEKO NEKOA] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[NEKO NEKOA] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            try {
                let response = await fetch(`https://nekobot.xyz/api/image?type=neko`).then(r => r.json());
                if (!response || !response.message) { console.log('[NEKO NEKOA] API returned invalid response'); await handleFileSizeError(interaction); return; }

                const file = new AttachmentBuilder(`${response.message}`).setName('Aurora.png');
                const get = new EmbedBuilder().setTitle('Neko Nude').setImage('attachment://Aurora.png').setColor(client.color);
                try { await interaction.editReply({ embeds: [get], files: [file] }); } catch (uploadErr) { console.log('[NEKO NEKOA] Upload failed:', uploadErr.message); await handleFileSizeError(interaction); }
            } catch (err) {
                console.log('[NEKO NEKOA] API error:', err.message);
                const apioff = new EmbedBuilder().setDescription(`Oops! the api is off\n\n[Support Server](${client.support})`).setColor(client.color);
                await interaction.editReply({ embeds: [apioff] }).catch(() => {});
            }
        } catch (error) { console.log('[NEKO NEKOA Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    porn_saved: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('porn_saved', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[PORN SAVED] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[PORN SAVED] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            try {
                var { video } = require('../../videos.json');
                if (!video || !Array.isArray(video) || video.length === 0) { console.log('[PORN SAVED] No videos in saved list'); await handleFileSizeError(interaction); return; }
                var content = `${video[Math.floor(Math.random() * video.length)]}`;
                await interaction.editReply({ content: `**🔥️ Random Porn**\n*If content dose not open please use the command again* [⠀](${content})` });
            } catch (err) {
                console.log('[PORN SAVED] Error:', err.message);
                const apioff = new EmbedBuilder().setDescription(`Oops! the api is off\n\n[Support Server](${client.support})`).setColor(client.color);
                await interaction.editReply({ embeds: [apioff] }).catch(() => {});
            }
        } catch (error) { console.log('[PORN SAVED Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },


    pornhub_searcher: async function (interaction, client, searcherstring) {
        interaction.deferReply().then(async () => {
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                try {
                    const pornhub = new PornHub()
                    const randomPage = Math.floor(Math.random() * 10) + 1;
                    const res = await pornhub.searchVideo(searcherstring, {
                        page: randomPage,
                        production: 'professional',
                        durationMin: 10,
                        durationMax: 30
                    })

                    const getRandomItem = (data) => {
                        const randomIndex = Math.floor(Math.random() * data.length);
                        return data[randomIndex];
                    };
                    const randomItem = getRandomItem(res.data);

                    const file = new AttachmentBuilder(randomItem.preview)
                        .setName('Aurora.png')

                    const embed = new EmbedBuilder()
                        .setTitle(`${randomItem.title}`)
                    embed.addFields([
                        // { name: "Video Link", value: `[Here](${randomItem.url})`, inline: true },
                        { name: "Views", value: `${randomItem.views}`, inline: true },
                        { name: "Duration", value: `${randomItem.duration}`, inline: true },
                        { name: "HD video ?", value: `${randomItem.hd}`, inline: true },
                        { name: "Premium video ?", value: `${randomItem.premium}`, inline: true },
                    ])
                        .setDescription(`[Click here to watch this video](${randomItem.url})`)
                        .setColor(client.color)
                        .setImage('attachment://Aurora.png')

                    const butex = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`more-${searcherstring}`)
                                .setLabel('More Videos')
                                .setStyle(ButtonStyle.Secondary)
                        )

                    interaction.editReply({
                        embeds: [embed],
                        files: [file],
                        content: "",
                        components: [butex]
                    })

                    const filter = i => i.customId === `more-${searcherstring}`

                    const collector = interaction.channel.createMessageComponentCollector({
                        filter,
                        time: 60000 * 5
                    });

                    collector.on('collect', async i => {
                        if (i.message.interaction.user.id !== interaction.user.id) {
                            return;
                        }
                        const pornhub = new PornHub()
                        const randomPage = Math.floor(Math.random() * 10) + 1;
                        const res = await pornhub.searchVideo(searcherstring, {
                            page: randomPage,
                            production: 'professional',
                            durationMin: 10,
                            durationMax: 30
                        })

                        const getRandomItem = (data) => {
                            const randomIndex = Math.floor(Math.random() * data.length);
                            return data[randomIndex];
                        };
                        const randomItem = getRandomItem(res.data);

                        const file = new AttachmentBuilder(randomItem.preview)
                            .setName('Aurora.png')

                        const embed = new EmbedBuilder()
                            .setTitle(`${randomItem.title}`)
                        embed.addFields([
                            // { name: "Video Link", value: `[Here](${randomItem.url})`, inline: true },
                            { name: "Views", value: `${randomItem.views}`, inline: true },
                            { name: "Duration", value: `${randomItem.duration}`, inline: true },
                            { name: "HD video ?", value: `${randomItem.hd}`, inline: true },
                            { name: "Premium video ?", value: `${randomItem.premium}`, inline: true },
                        ])
                            .setDescription(`[Click here to watch this video](${randomItem.url})`)
                            .setColor(client.color)
                            .setImage('attachment://Aurora.png')

                        await i.update({
                            embeds: [embed],
                            files: [file],
                            content: "",
                            components: [butex],
                            fetchReply: true
                        })

                    })

                    collector.on('end', async (collected, reason) => { //time out
                        if (reason === 'time') {

                            const shetbtn = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('more')
                                        .setLabel('More Videos')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(true),
                                )

                            interaction.editReply({ components: [shetbtn], content: "" })
                        }
                    });
                } catch (e) {
                    console.log(e)

                    const apioff = new EmbedBuilder()
                        .setDescription(`search something diffrent ! if your problem dosnt solved please contact [support](${client.support}) to get support about this error`)
                        .setColor(client.color)

                    interaction.editReply({
                        embeds: [apioff],
                        files: [],
                        content: "",
                        flags: 64
                    })
                }

            }
        })
    },


    tiktok_fiqfuq: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const bodyData = {
                    "a": "discover",
                    "skip": Math.floor(Math.random() * 10) + 1,
                    "limit": 12,
                    "id": 0,
                    "sort": 1,
                    "author": "",
                    "discover": "tiktok",
                    "category": '',
                    "filter": "videos"
                };
                request({
                    uri: `https://fiqfuq.com/api`,
                    method: 'POST',
                    json: true,
                    jsonReplacer: true,
                    headers: {
                        'User-Agent': `${process.env.USERAGENT}`,
                    },
                    body: bodyData
                }, async function (err, response, body) {

                    const ran = Math.floor(Math.random() * body.length);
                    const files = new AttachmentBuilder(body[ran].video_url, 'Aurora.mp4')
                    await interaction.editReply({ content: `${body[ran].description || "none"}\n\nloading content...` })

                    try {
                        await interaction.editReply({
                            files: [files], content: `**🔥️ Nsfw TikTok**\n${body[ran].description || "none"}`
                        })
                    } catch (e) {
                                    console.log('[File Error] Upload failed, handling file size error:', e.message);
                                    await handleFileSizeError(interaction);
                                }
                })
            }
        })
    },

    anal_fiqfuq: async function (interaction, client) {
        try {
            // Check function-level rate limiting first
            const rateCheck = checkFunctionRateLimit('anal_fiqfuq', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({
                        content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`,
                        ephemeral: true
                    });
                }
                return;
            }

            // Check interaction age immediately
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) {
                console.log(`[ANAL FIQFUQ] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            // Check if interaction is still valid before deferring
            if (!interaction.isRepliable()) {
                console.log('[ANAL FIQFUQ] Interaction no longer repliable');
                return;
            }

            // Defer immediately to prevent timeout
            await interaction.deferReply();

            const support = client.support_server
            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }
            const bodyData = {
                "a": "discover",
                "skip": Math.floor(Math.random() * 10) + 1,
                "limit": 12,
                "id": 0,
                "sort": 1,
                "author": "",
                "discover": "anal",
                "category": '',
                "filter": "videos"
            };

            request({
                uri: `https://fiqfuq.com/api`,
                method: 'POST',
                json: true,
                jsonReplacer: true,
                headers: {
                    'User-Agent': process.env.G_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                body: bodyData
            }, async function (err, response, body) {
                try {
                    if (err || !body || !Array.isArray(body) || body.length === 0) {
                        console.log("API error or invalid response - trying alternative");
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const ran = Math.floor(Math.random() * body.length);
                    const files = new AttachmentBuilder(body[ran].video_url, 'Aurora.mp4')
                    await interaction.editReply({ content: `${body[ran].description || "none"}\n\nloading content...` })

                    try {
                        await interaction.editReply({
                            files: [files], content: `**🔥️ Nsfw Anal**\n${body[ran].description || "none"}`
                        })
                    } catch (e) {
                        console.log('[File Error] Upload failed, handling file size error:', e.message);
                        await handleFileSizeError(interaction);
                    }
                } catch (requestError) {
                    console.log('[Request Error]:', requestError.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[ANAL FIQFUQ Error]:', error.message);
            // Don't try to reply if interaction is already expired
            if (error.code !== 10062 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },

    asian_fiqfuq: async function (interaction, client) {
        try {
            // function-level rate limiting
            const rateCheck = checkFunctionRateLimit('asian_fiqfuq', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true });
                }
                return;
            }

            // quick interaction age check
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2800) {
                console.log(`[ASIAN FIQFUQ] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            if (!interaction.isRepliable()) {
                console.log('[ASIAN FIQFUQ] Interaction no longer repliable');
                return;
            }

            await interaction.deferReply();

            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            const bodyData = {
                "a": "discover",
                "skip": Math.floor(Math.random() * 10) + 1,
                "limit": 12,
                "id": 0,
                "sort": 1,
                "author": "",
                "discover": "asian",
                "category": '',
                "filter": "videos"
            };

            request({
                uri: `https://fiqfuq.com/api`,
                method: 'POST',
                json: true,
                jsonReplacer: true,
                headers: {
                    'User-Agent': `${process.env.USERAGENT}`,
                },
                body: bodyData
            }, async function (err, response, body) {
                try {
                    if (err || !body || !Array.isArray(body) || body.length === 0) {
                        console.log('[ASIAN FIQFUQ] API error or no data:', err?.message || 'no data');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const ran = Math.floor(Math.random() * body.length);
                    const selectedItem = body[ran];
                    
                    if (!selectedItem || !selectedItem.video_url) {
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const files = new AttachmentBuilder(selectedItem.video_url, 'Aurora.mp4');
                    
                    try {
                        await interaction.editReply({
                            files: [files], 
                            content: `**🔥️ Nsfw Asian**\n${selectedItem.description || "none"}`
                        });
                    } catch (uploadErr) {
                        console.log('[ASIAN FIQFUQ] Upload failed:', uploadErr.message);
                        await handleFileSizeError(interaction);
                    }
                } catch (ex) {
                    console.log('[ASIAN FIQFUQ] Unexpected error:', ex.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[ASIAN FIQFUQ Error]:', error.message);
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },

    boobs_fiqfuq: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('boobs_fiqfuq', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[BOOBS FIQFUQ] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[BOOBS FIQFUQ] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            const bodyData = { "a": "discover", "skip": Math.floor(Math.random() * 10) + 1, "limit": 12, "id": 0, "sort": 1, "author": "", "discover": "boobs", "category": '', "filter": "videos" };
            request({
                uri: `https://fiqfuq.com/api`,
                json: true,
                method: 'POST',
                jsonReplacer: true,
                headers: { 'User-Agent': `${process.env.USERAGENT}` },
                body: bodyData,
                timeout: 10000
            }, async function (err, response, body) {
                try {
                    if (err || !body || !Array.isArray(body) || body.length === 0) { console.log('[BOOBS FIQFUQ] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const ran = Math.floor(Math.random() * body.length);
                    const entry = body[ran];
                    const videoUrl = entry.video_url || entry.file || entry.video;
                    if (!videoUrl) { console.log('[BOOBS FIQFUQ] No video URL found'); await handleFileSizeError(interaction); return; }
                    const files = new AttachmentBuilder(videoUrl, 'Aurora.mp4');
                    try { await interaction.editReply({ files: [files], content: `**🔥️ Nsfw Boobs**\n${entry.description || "none"}` }); } catch (e) { console.log('[BOOBS FIQFUQ] Upload failed:', e.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[BOOBS FIQFUQ] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[BOOBS FIQFUQ Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    porn_fiqfuq: async function (interaction, client) {
        try {
            const rateCheck = checkFunctionRateLimit('porn_fiqfuq', interaction.user.id);
            if (!rateCheck.allowed) { if (interaction.isRepliable()) await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true }); return; }
            const interactionAge = Date.now() - interaction.createdTimestamp; if (interactionAge > 2500) { console.log(`[PORN FIQFUQ] Interaction too old (${interactionAge}ms), skipping`); return; }
            if (!interaction.isRepliable()) { console.log('[PORN FIQFUQ] Interaction no longer repliable'); return; }
            await interaction.deferReply();
            if (!interaction.channel.nsfw) { await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {}); return; }

            const bodyData = { "a": "discover", "skip": Math.floor(Math.random() * 10) + 1, "limit": 12, "id": 0, "sort": 1, "author": "", "discover": "porn", "category": '', "filter": "videos" };
            request({
                uri: `https://fiqfuq.com/api`,
                json: true,
                method: 'POST',
                jsonReplacer: true,
                headers: { 'User-Agent': `${process.env.USERAGENT}` },
                body: bodyData,
                timeout: 10000
            }, async function (err, response, body) {
                try {
                    if (err || !body || !Array.isArray(body) || body.length === 0) { console.log('[PORN FIQFUQ] API error or empty response'); await handleFileSizeError(interaction); return; }
                    const ran = Math.floor(Math.random() * body.length);
                    const entry = body[ran];
                    const videoUrl = entry.video_url || entry.file || entry.video;
                    if (!videoUrl) { console.log('[PORN FIQFUQ] No video URL found'); await handleFileSizeError(interaction); return; }
                    const files = new AttachmentBuilder(videoUrl, 'Aurora.mp4');
                    try { await interaction.editReply({ files: [files], content: `**🔥️ Nsfw Porn**\n${entry.description || "none"}` }); } catch (e) { console.log('[PORN FIQFUQ] Upload failed:', e.message); await handleFileSizeError(interaction); }
                } catch (ex) { console.log('[PORN FIQFUQ] Unexpected error:', ex.message); await handleFileSizeError(interaction); }
            });
        } catch (error) { console.log('[PORN FIQFUQ Error]:', error.message); if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) { await handleFileSizeError(interaction).catch(() => {}); } }
    },

    cuckold_fiqfuq: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const bodyData = {
                    "a": "discover",
                    "skip": Math.floor(Math.random() * 10) + 1,
                    "limit": 12,
                    "id": 0,
                    "sort": 1,
                    "author": "",
                    "discover": "cuckold",
                    "category": '',
                    "filter": "videos"
                };
                request({
                    uri: `https://fiqfuq.com/api`,
                    json: true,
                    jsonReplacer: true,
                    headers: {
                        'User-Agent': `${process.env.USERAGENT}`,
                    },
                    body: bodyData
                }, async function (err, response, body) {

                    const ran = Math.floor(Math.random() * body.length);
                    const files = new AttachmentBuilder(body[ran].video_url, 'Aurora.mp4')
                    await interaction.editReply({ content: `${body[ran].description || "none"}\n\nloading content...` })

                    try {
                        await interaction.editReply({
                            files: [files], content: `**🔥️ Nsfw Cuckold**\n${body[ran].description || "none"}`
                        })
                    } catch (e) {
                                    console.log('[File Error] Upload failed, handling file size error:', e.message);
                                    await handleFileSizeError(interaction);
                                }
                })
            }
        })
    },


    gay_fiqfuq: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const bodyData = {
                    "a": "discover",
                    "skip": Math.floor(Math.random() * 5) + 1,
                    "limit": 12,
                    "id": 0,
                    "sort": 1,
                    "author": "",
                    "discover": "gay",
                    "category": '',
                    "filter": "videos"
                };
                request({
                    uri: `https://fiqfuq.com/api`,
                    json: true,
                    jsonReplacer: true,
                    headers: {
                        'User-Agent': `${process.env.USERAGENT}`,
                    },
                    body: bodyData
                }, async function (err, response, body) {

                    const ran = Math.floor(Math.random() * body.length);
                    const files = new AttachmentBuilder(body[ran].video_url, 'Aurora.mp4')
                    await interaction.editReply({ content: `${body[ran].description || "none"}\n\nloading content...` })

                    try {
                        await interaction.editReply({
                            files: [files], content: `**🔥️ Nsfw Gay**\n${body[ran].description || "none"}`
                        })
                    } catch (e) {
                                    console.log('[File Error] Upload failed, handling file size error:', e.message);
                                    await handleFileSizeError(interaction);
                                }
                })
            }
        })
    },

    homemade_fiqfuq: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const bodyData = {
                    "a": "discover",
                    "skip": Math.floor(Math.random() * 10) + 1,
                    "limit": 12,
                    "id": 0,
                    "sort": 1,
                    "author": "",
                    "discover": "homemade",
                    "category": '',
                    "filter": "videos"
                };
                request({
                    uri: `https://fiqfuq.com/api`,
                    method: 'POST',
                    json: true,
                    jsonReplacer: true,
                    headers: {
                        'User-Agent': `${process.env.USERAGENT}`,
                    },
                    body: bodyData
                }, async function (err, response, body) {
                    try {
                        // Validate response structure
                        if (err || !body || !Array.isArray(body) || body.length === 0) {
                            console.error('FiqFuq Homemade API error or empty response:', err);
                            await handleFileSizeError(interaction);
                            return;
                        }

                        const ran = Math.floor(Math.random() * body.length);
                        const selectedItem = body[ran];

                        // Validate selected item
                        if (!selectedItem || !selectedItem.video_url) {
                            console.error('No video URL found in FiqFuq Homemade response');
                            await handleFileSizeError(interaction);
                            return;
                        }

                        const files = new AttachmentBuilder(selectedItem.video_url, 'Aurora.mp4')
                        await interaction.editReply({ content: `${selectedItem.description || "none"}\n\nloading content...` })

                        try {
                            await interaction.editReply({
                                files: [files], content: `**🔥️ Nsfw Homemade**\n${selectedItem.description || "none"}`
                            })
                        } catch (e) {
                            console.log('[File Error] homemade_fiqfuq upload failed:', e.message);
                            await handleFileSizeError(interaction);
                        }
                    } catch (e) {
                        console.error('[FiqFuq Error] homemade_fiqfuq failed:', e.message);
                        await handleFileSizeError(interaction);
                    }
                })
            }
        })
    },

    lesbian_fiqfuq: async function (interaction, client) {
        try {
            // function-level rate limiting
            const rateCheck = checkFunctionRateLimit('lesbian_fiqfuq', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 });
                }
                return;
            }

            // quick interaction age check
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2800) {
                console.log(`[LESBIAN FIQFUQ] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            if (!interaction.isRepliable()) {
                console.log('[LESBIAN FIQFUQ] Interaction no longer repliable');
                return;
            }

            await interaction.deferReply();

            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            const bodyData = {
                "a": "discover",
                "skip": Math.floor(Math.random() * 10) + 1,
                "limit": 12,
                "id": 0,
                "sort": 1,
                "author": "",
                "discover": "lesbian",
                "category": '',
                "filter": "videos"
            };

            request({
                uri: `https://fiqfuq.com/api`,
                method: 'POST',
                json: true,
                jsonReplacer: true,
                headers: {
                    'User-Agent': `${process.env.USERAGENT}`,
                },
                body: bodyData
            }, async function (err, response, body) {
                try {
                    if (err || !body || !Array.isArray(body) || body.length === 0) {
                        console.log('[LESBIAN FIQFUQ] API error or no data:', err?.message || 'no data');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const ran = Math.floor(Math.random() * body.length);
                    const selectedItem = body[ran];
                    
                    if (!selectedItem || !selectedItem.video_url) {
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const files = new AttachmentBuilder(selectedItem.video_url, 'Aurora.mp4');
                    
                    try {
                        await interaction.editReply({
                            files: [files], 
                            content: `**🔥️ Nsfw Lesbian**\n${selectedItem.description || "none"}`
                        });
                    } catch (uploadErr) {
                        console.log('[LESBIAN FIQFUQ] Upload failed:', uploadErr.message);
                        await handleFileSizeError(interaction);
                    }
                } catch (ex) {
                    console.log('[LESBIAN FIQFUQ] Unexpected error:', ex.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[LESBIAN FIQFUQ Error]:', error.message);
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },

    onlyfans_fiqfuq: async function (interaction, client) {
        try {
            // function-level rate limiting
            const rateCheck = checkFunctionRateLimit('onlyfans_fiqfuq', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, flags: 64 });
                }
                return;
            }

            // quick interaction age check
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2800) {
                console.log(`[ONLYFANS FIQFUQ] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            if (!interaction.isRepliable()) {
                console.log('[ONLYFANS FIQFUQ] Interaction no longer repliable');
                return;
            }

            await interaction.deferReply();

            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            const bodyData = {
                "a": "discover",
                "skip": Math.floor(Math.random() * 10) + 1,
                "limit": 12,
                "id": 0,
                "sort": 1,
                "author": "",
                "discover": "onlyfans",
                "category": '',
                "filter": "videos"
            };

            request({
                uri: `https://fiqfuq.com/api`,
                method: 'POST',
                json: true,
                jsonReplacer: true,
                headers: {
                    'User-Agent': `${process.env.USERAGENT}`,
                },
                body: bodyData
            }, async function (err, response, body) {
                try {
                    if (err || !body || !Array.isArray(body) || body.length === 0) {
                        console.log('[ONLYFANS FIQFUQ] API error or no data:', err?.message || 'no data');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const ran = Math.floor(Math.random() * body.length);
                    const selectedItem = body[ran];
                    
                    if (!selectedItem || !selectedItem.video_url) {
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const files = new AttachmentBuilder(selectedItem.video_url, 'Aurora.mp4');
                    
                    try {
                        await interaction.editReply({
                            files: [files], 
                            content: `**🔥️ Nsfw Onlyfans**\n${selectedItem.description || "none"}`
                        });
                    } catch (uploadErr) {
                        console.log('[ONLYFANS FIQFUQ] Upload failed:', uploadErr.message);
                        await handleFileSizeError(interaction);
                    }
                } catch (ex) {
                    console.log('[ONLYFANS FIQFUQ] Unexpected error:', ex.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[ONLYFANS FIQFUQ Error]:', error.message);
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },

    blowjob_fiqfuq: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const bodyData = {
                    "a": "discover",
                    "skip": Math.floor(Math.random() * 5) + 1,
                    "limit": 12,
                    "id": 0,
                    "sort": 1,
                    "author": "",
                    "discover": "blowjob",
                    "category": '',
                    "filter": "videos"
                };

                request({
                    uri: `https://fiqfuq.com/api`,
                    json: true,
                    jsonReplacer: true,
                    headers: {
                        'User-Agent': `${process.env.USERAGENT}`,
                    },
                    body: bodyData
                }, async function (err, response, body) {

                    const ran = Math.floor(Math.random() * body.length);
                    const files = new AttachmentBuilder(body[ran].video_url, 'Aurora.mp4')
                    await interaction.editReply({ content: `${body[ran].description || "none"}\n\nloading content...` })

                    try {
                        await interaction.editReply({
                            files: [files], content: `**🔥️ Nsfw Blowjob**\n${body[ran].description || "none"}`
                        })
                    } catch (e) {
                                    console.log('[File Error] Upload failed, handling file size error:', e.message);
                                    await handleFileSizeError(interaction);
                                }
                })
            }
        })
    },

    tiktok_xfollow: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const randomNumber = Math.floor(Math.random() * 23) + 1;
                const page = Math.floor(Math.random() * 12) + 1;
                try {
                    request({
                        uri: `https://www.xfollow.com/api/v1/post/tag/tiktok?genders=cf&limit=${randomNumber}&page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            'User-Agent': `${process.env.USERAGENT}`,
                        },
                    }, async function (err, response, body) {
                        try {
                            // Validate response structure
                            if (err || !body || !body.list || !Array.isArray(body.list) || body.list.length === 0) {
                                console.error('XFollow TikTok API error or empty response:', err);
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const MapTheAPi = Math.floor(Math.random() * body.list.length);
                            const selectedItem = body.list[MapTheAPi];

                            // Validate selected item structure
                            if (!selectedItem || !selectedItem.post || !selectedItem.post.media || 
                                !Array.isArray(selectedItem.post.media) || selectedItem.post.media.length === 0) {
                                console.error('Invalid XFollow TikTok response structure');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const ranfile = selectedItem.post.media[0].url;
                            if (!ranfile) {
                                console.error('No media URL found in XFollow TikTok response');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const files = new AttachmentBuilder(ranfile, 'Aurora.mp4')
                            await interaction.editReply({ content: `${selectedItem.post.text || " "}\n\nloading content...` })

                            try {
                                await interaction.editReply({
                                    files: [files], content: `**🔥️ Nsfw Tiktok**\n${selectedItem.post.text || " "}`
                                })
                            } catch (e) {
                                console.log('[File Error] tiktok_xfollow upload failed:', e.message);
                                await handleFileSizeError(interaction);
                            }
                        } catch (error) {
                            console.error('XFollow processing error:', error);
                            await handleFileSizeError(interaction);
                        }
                    })
                } catch (e) {
                    console.log(e)
                    interaction.editReply({
                        embeds: [defershow(interaction)],
                        content: ""
                    })
                }
            }
        })
    },

    feet_xfollow: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const randomNumber = Math.floor(Math.random() * 23) + 1;
                const page = Math.floor(Math.random() * 12) + 1;
                try {
                    request({
                        uri: `https://www.xfollow.com/api/v1/post/tag/feet?genders=cf&limit=${randomNumber}&page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            'User-Agent': `${process.env.USERAGENT}`,
                        },
                    }, async function (err, response, body) {
                        try {
                            // Validate response structure
                            if (err || !body || !body.list || !Array.isArray(body.list) || body.list.length === 0) {
                                console.error('XFollow Feet API error or empty response:', err);
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const MapTheAPi = Math.floor(Math.random() * body.list.length);
                            const selectedItem = body.list[MapTheAPi];

                            // Validate selected item structure
                            if (!selectedItem || !selectedItem.post || !selectedItem.post.media || 
                                !Array.isArray(selectedItem.post.media) || selectedItem.post.media.length === 0) {
                                console.error('Invalid XFollow Feet response structure');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const ranfile = selectedItem.post.media[0].url;
                            if (!ranfile) {
                                console.error('No media URL found in XFollow Feet response');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const files = new AttachmentBuilder(ranfile, 'Aurora.mp4')
                            await interaction.editReply({ content: `${selectedItem.post.text || " "}\n\nloading content...` })

                            try {
                                await interaction.editReply({
                                    files: [files], content: `**🔥️ Feet**\n${selectedItem.post.text || " "}`
                                })
                            } catch (e) {
                                console.log('[File Error] feet_xfollow upload failed:', e.message);
                                await handleFileSizeError(interaction);
                            }
                        } catch (e) {
                            console.error('[XFollow Error] feet_xfollow failed:', e.message);
                            await handleFileSizeError(interaction);
                        }
                    })
                } catch (e) {
                    console.log(e)
                    interaction.editReply({
                        embeds: [defershow(interaction)],
                        content: ""
                    })
                }
            }
        })
    },


    fetish_xfollow: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const randomNumber = Math.floor(Math.random() * 23) + 1;
                const page = Math.floor(Math.random() * 12) + 1;
                try {
                    request({
                        uri: `https://www.xfollow.com/api/v1/post/tag/fetish?genders=cf&limit=${randomNumber}&page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            'User-Agent': `${process.env.USERAGENT}`,
                        },
                    }, async function (err, response, body) {
                        try {
                            // Validate response structure
                            if (err || !body || !body.list || !Array.isArray(body.list) || body.list.length === 0) {
                                console.error('XFollow Fetish API error or empty response:', err);
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const MapTheAPi = Math.floor(Math.random() * body.list.length);
                            const selectedItem = body.list[MapTheAPi];

                            // Validate selected item structure
                            if (!selectedItem || !selectedItem.post || !selectedItem.post.media || 
                                !Array.isArray(selectedItem.post.media) || selectedItem.post.media.length === 0) {
                                console.error('Invalid XFollow Fetish response structure');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const ranfile = selectedItem.post.media[0].url;
                            if (!ranfile) {
                                console.error('No media URL found in XFollow Fetish response');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const files = new AttachmentBuilder(ranfile, 'Aurora.mp4')
                            await interaction.editReply({ content: `${selectedItem.post.text || " "}\n\nloading content...` })

                            try {
                                await interaction.editReply({
                                    files: [files], content: `**🔥️ Fetish**\n${selectedItem.post.text || " "}`
                                })
                            } catch (e) {
                                console.log('[File Error] fetish_xfollow upload failed:', e.message);
                                await handleFileSizeError(interaction);
                            }
                        } catch (e) {
                            console.error('[XFollow Error] fetish_xfollow failed:', e.message);
                            await handleFileSizeError(interaction);
                        }
                    })
                } catch (e) {
                    console.log(e)
                    interaction.editReply({
                        embeds: [defershow(interaction)],
                        content: ""
                    })
                }
            }
        })
    },


    feet_pinporn: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                try {
                    request({
                        uri: `https://pin.porn/api/videoInfo/?tag_id=287/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            "User-Agent": process.env.pinporn_agent,
                        }
                    }, async function (err, response, body) {

                        const FileSender = new AttachmentBuilder()
                            .setFile(body.data[0].link)
                            .setName('Aurora.mp4')

                        const arryTags = body.data[0].tags
                        const SelectedTags = arryTags.map(tag => tag.tag).join(', ');

                        const embed = new EmbedBuilder()
                            .setDescription(body.data[0].title)
                            .setColor(client.color)
                        try {
                            interaction.editReply({
                                content: "**🔥️ Feet Porn**",
                                embeds: [embed],
                                files: [FileSender]
                            })
                        } catch (e) {
                                    console.log('[File Error] Upload failed, handling file size error:', e.message);
                                    await handleFileSizeError(interaction);
                                }
                    })
                } catch (e) {
                    console.log(e)
                    interaction.editReply({
                        embeds: [defershow(interaction)],
                        content: ""
                    })
                }
            }
        })
    },

    dildo_pinporn: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                try {
                    request({
                        uri: `https://pin.porn/api/videoInfo/?tag_id=273/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            "User-Agent": process.env.pinporn_agent,
                        }
                    }, async function (err, response, body) {

                        const FileSender = new AttachmentBuilder()
                            .setFile(body.data[0].link)
                            .setName('Aurora.mp4')

                        const arryTags = body.data[0].tags
                        const SelectedTags = arryTags.map(tag => tag.tag).join(', ');

                        const embed = new EmbedBuilder()
                            .setDescription(body.data[0].title)
                            .setColor(client.color)
                        try {
                            interaction.editReply({
                                content: "**🔥️ Dildo Porn**",
                                embeds: [embed],
                                files: [FileSender]
                            })
                        } catch (e) {
                                    console.log('[File Error] Upload failed, handling file size error:', e.message);
                                    await handleFileSizeError(interaction);
                                }
                    })
                } catch (e) {
                    console.log(e)
                    interaction.editReply({
                        embeds: [defershow(interaction)],
                        content: ""
                    })
                }
            }
        })
    },


    asian_xfollow: async function (interaction, client) {
        try {
            // function-level rate limiting
            const rateCheck = checkFunctionRateLimit('asian_xfollow', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true });
                }
                return;
            }

            // quick interaction age check
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2800) {
                console.log(`[ASIAN XFOLLOW] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            if (!interaction.isRepliable()) {
                console.log('[ASIAN XFOLLOW] Interaction no longer repliable');
                return;
            }

            await interaction.deferReply();

            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            const randomNumber = Math.floor(Math.random() * 23) + 1;
            const page = Math.floor(Math.random() * 12) + 1;
            
            request({
                uri: `https://www.xfollow.com/api/v1/post/tag/asian?genders=cf&limit=${randomNumber}&page=${page}`,
                json: true,
                jsonReplacer: true,
                headers: {
                    'User-Agent': `${process.env.USERAGENT}`,
                },
            }, async function (err, response, body) {
                try {
                    // Validate response structure
                    if (err || !body || !body.list || !Array.isArray(body.list) || body.list.length === 0) {
                        console.error('[ASIAN XFOLLOW] API error or empty response:', err?.message || 'no data');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const MapTheAPi = Math.floor(Math.random() * body.list.length);
                    const selectedItem = body.list[MapTheAPi];

                    // Validate selected item structure
                    if (!selectedItem || !selectedItem.post || !selectedItem.post.media || 
                        !Array.isArray(selectedItem.post.media) || selectedItem.post.media.length === 0) {
                        console.error('[ASIAN XFOLLOW] Invalid response structure');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const ranfile = selectedItem.post.media[0].url;
                    if (!ranfile) {
                        console.error('[ASIAN XFOLLOW] No media URL found');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const files = new AttachmentBuilder(ranfile, 'Aurora.mp4');
                    
                    try {
                        await interaction.editReply({
                            files: [files], 
                            content: `**🔥️ Asian**\n${selectedItem.post.text || selectedItem.description || " "}`
                        });
                    } catch (uploadErr) {
                        console.log('[ASIAN XFOLLOW] Upload failed:', uploadErr.message);
                        await handleFileSizeError(interaction);
                    }
                } catch (ex) {
                    console.error('[ASIAN XFOLLOW] Processing error:', ex.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[ASIAN XFOLLOW Error]:', error.message);
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },

    blowjob_xfollow: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const randomNumber = Math.floor(Math.random() * 23) + 1;
                const page = Math.floor(Math.random() * 12) + 1;
                try {
                    request({
                        uri: `https://www.xfollow.com/api/v1/post/tag/blowjob?genders=cf&limit=${randomNumber}&page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            'User-Agent': `${process.env.USERAGENT}`,
                        },
                    }, async function (err, response, body) {
                        try {
                            // Validate response structure
                            if (err || !body || !body.list || !Array.isArray(body.list) || body.list.length === 0) {
                                console.error('XFollow Blowjob API error or empty response:', err);
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const MapTheAPi = Math.floor(Math.random() * body.list.length);
                            const selectedItem = body.list[MapTheAPi];

                            // Validate selected item structure
                            if (!selectedItem || !selectedItem.post || !selectedItem.post.media || 
                                !Array.isArray(selectedItem.post.media) || selectedItem.post.media.length === 0) {
                                console.error('Invalid XFollow Blowjob response structure');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const ranfile = selectedItem.post.media[0].url;
                            if (!ranfile) {
                                console.error('No media URL found in XFollow Blowjob response');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const files = new AttachmentBuilder(ranfile, 'Aurora.mp4')
                            await interaction.editReply({ content: `${selectedItem.post.text || " "}\n\nloading content...` })

                            try {
                                await interaction.editReply({
                                    files: [files], content: `**🔥️ Blowjob**\n${selectedItem.post.text || " "}`
                                })
                            } catch (e) {
                                console.log('[File Error] blowjob_xfollow upload failed:', e.message);
                                await handleFileSizeError(interaction);
                            }
                        } catch (e) {
                            console.error('[XFollow Error] blowjob_xfollow failed:', e.message);
                            await handleFileSizeError(interaction);
                        }
                    })
                } catch (e) {
                    console.log(e)
                    interaction.editReply({
                        embeds: [defershow(interaction)],
                        content: ""
                    })
                }
            }
        })
    },


    boobs_xfollow: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const randomNumber = Math.floor(Math.random() * 23) + 1;
                const page = Math.floor(Math.random() * 12) + 1;
                try {
                    const boobs_tag = ['boobies', 'smallboobs', 'hugeboobs', 'bigboobsbigtits', 'milkboobs', 'bigboobies', 'flashboobs'];
                    const ri = Math.floor(Math.random() * boobs_tag.length);
                    const ran_tag = boobs_tag[ri];
                    request({
                        uri: `https://www.xfollow.com/api/v1/post/tag/${ran_tag}?genders=cf&limit=${randomNumber}&page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            'User-Agent': `${process.env.USERAGENT}`,
                        },
                    }, async function (err, response, body) {
                        try {
                            // Validate response structure
                            if (err || !body || !body.list || !Array.isArray(body.list) || body.list.length === 0) {
                                console.error('XFollow Boobs API error or empty response:', err);
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const MapTheAPi = Math.floor(Math.random() * body.list.length);
                            const selectedItem = body.list[MapTheAPi];

                            // Validate selected item structure
                            if (!selectedItem || !selectedItem.post || !selectedItem.post.media || 
                                !Array.isArray(selectedItem.post.media) || selectedItem.post.media.length === 0) {
                                console.error('Invalid XFollow Boobs response structure');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const ranfile = selectedItem.post.media[0].url;
                            if (!ranfile) {
                                console.error('No media URL found in XFollow Boobs response');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const files = new AttachmentBuilder(ranfile, 'Aurora.mp4')
                            await interaction.editReply({ content: `${selectedItem.post.text || " "}\n\nloading content...` })

                            try {
                                await interaction.editReply({
                                    files: [files], content: `**🔥️ Boobs**\n${selectedItem.post.text || " "}`
                                })
                            } catch (e) {
                                console.log('[File Error] boobs_xfollow upload failed:', e.message);
                                await handleFileSizeError(interaction);
                            }
                        } catch (e) {
                            console.error('[XFollow Error] boobs_xfollow failed:', e.message);
                            await handleFileSizeError(interaction);
                        }
                    })
                } catch (e) {
                    console.log(e)
                    interaction.editReply({
                        embeds: [defershow(interaction)],
                        content: ""
                    })
                }
            }
        })
    },


    cuckold_xfollow: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const randomNumber = Math.floor(Math.random() * 23) + 1;
                const page = Math.floor(Math.random() * 12) + 1;
                try {
                    request({
                        uri: `https://www.xfollow.com/api/v1/post/tag/cuckold?genders=cf&limit=${randomNumber}&page=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            'User-Agent': `${process.env.USERAGENT}`,
                        },
                    }, async function (err, response, body) {
                        try {
                            // Validate response structure
                            if (err || !body || !body.list || !Array.isArray(body.list) || body.list.length === 0) {
                                console.error('XFollow Cuckold API error or empty response:', err);
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const MapTheAPi = Math.floor(Math.random() * body.list.length);
                            const selectedItem = body.list[MapTheAPi];

                            // Validate selected item structure
                            if (!selectedItem || !selectedItem.post || !selectedItem.post.media || 
                                !Array.isArray(selectedItem.post.media) || selectedItem.post.media.length === 0) {
                                console.error('Invalid XFollow Cuckold response structure');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const ranfile = selectedItem.post.media[0].url;
                            if (!ranfile) {
                                console.error('No media URL found in XFollow Cuckold response');
                                await handleFileSizeError(interaction); 
                                return;
                            }

                            const files = new AttachmentBuilder(ranfile, 'Aurora.mp4')
                            await interaction.editReply({ content: `${selectedItem.post.text || " "}\n\nloading content...` })

                            try {
                                await interaction.editReply({
                                    files: [files], content: `**🔥️ Cuckold**\n${selectedItem.post.text || " "}`
                                })
                            } catch (e) {
                                console.log('[File Error] cuckold_xfollow upload failed:', e.message);
                                await handleFileSizeError(interaction);
                            }
                        } catch (e) {
                            console.error('[XFollow Error] cuckold_xfollow failed:', e.message);
                            await handleFileSizeError(interaction);
                        }
                    })
                } catch (e) {
                    console.log(e)
                    interaction.editReply({
                        embeds: [defershow(interaction)],
                        content: ""
                    })
                }
            }
        })
    },

    milf_xfollow: async function (interaction, client) {
        try {
            // Check if interaction is still valid before trying to defer
            if (!interaction.isRepliable()) {
                console.log('[Milf XFollow] Interaction no longer repliable, skipping');
                return;
            }

            // Check interaction age
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) {
                console.log(`[Milf XFollow] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            await interaction.deferReply();

            const support = client.support_server
            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            const randomNumber = Math.floor(Math.random() * 23) + 1;
            const page = Math.floor(Math.random() * 12) + 1;
            
            request({
                uri: `https://www.xfollow.com/api/v1/post/tag/milf?genders=cf&limit=${randomNumber}&page=${page}`,
                json: true,
                jsonReplacer: true,
                headers: {
                    'User-Agent': `${process.env.USERAGENT}`,
                },
            }, async function (err, response, body) {
                try {
                    // Validate response structure
                    if (err || !body || !body.list || !Array.isArray(body.list) || body.list.length === 0) {
                        console.error('XFollow Milf API error or empty response:', err);
                        await handleFileSizeError(interaction); 
                        return;
                    }

                    const MapTheAPi = Math.floor(Math.random() * body.list.length);
                    const selectedItem = body.list[MapTheAPi];

                    // Validate selected item structure
                    if (!selectedItem || !selectedItem.post || !selectedItem.post.media || 
                        !Array.isArray(selectedItem.post.media) || selectedItem.post.media.length === 0) {
                        console.error('Invalid XFollow Milf response structure');
                        await handleFileSizeError(interaction); 
                        return;
                    }

                    const ranfile = selectedItem.post.media[0].url;
                    if (!ranfile) {
                        console.error('No media URL found in XFollow Milf response');
                        await handleFileSizeError(interaction); 
                        return;
                    }

                    const files = new AttachmentBuilder(ranfile, 'Aurora.mp4')
                    await interaction.editReply({ content: `${selectedItem.post.text || " "}\n\nloading content...` })

                    try {
                        await interaction.editReply({
                            files: [files], content: `**🔥️ Milf**\n${selectedItem.post.text || " "}`
                        })
                    } catch (e) {
                        console.log('[File Error] milf_xfollow upload failed:', e.message);
                        await handleFileSizeError(interaction);
                    }
                } catch (e) {
                    console.error('[XFollow Error] milf_xfollow failed:', e.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[Milf XFollow Error]:', error.message);
            // Don't try to reply if interaction is already expired
            if (error.code !== 10062 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },

    onlyfans_xfollow: async function (interaction, client) {
        try {
            // function-level rate limiting
            const rateCheck = checkFunctionRateLimit('onlyfans_xfollow', interaction.user.id);
            if (!rateCheck.allowed) {
                if (interaction.isRepliable()) {
                    await interaction.reply({ content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`, ephemeral: true });
                }
                return;
            }

            // quick interaction age check
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2800) {
                console.log(`[ONLYFANS XFOLLOW] Interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            if (!interaction.isRepliable()) {
                console.log('[ONLYFANS XFOLLOW] Interaction no longer repliable');
                return;
            }

            await interaction.deferReply();

            if (!interaction.channel.nsfw) {
                await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
                return;
            }

            const randomNumber = Math.floor(Math.random() * 23) + 1;
            const page = Math.floor(Math.random() * 12) + 1;

            request({
                uri: `https://www.xfollow.com/api/v1/post/tag/onlyfans?genders=cf&limit=${randomNumber}&page=${page}`,
                json: true,
                jsonReplacer: true,
                headers: {
                    'User-Agent': `${process.env.USERAGENT}`,
                },
            }, async function (err, response, body) {
                try {
                    // Validate response structure
                    if (err || !body || !body.list || !Array.isArray(body.list) || body.list.length === 0) {
                        console.error('[ONLYFANS XFOLLOW] API error or empty response:', err?.message || 'no data');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const MapTheAPi = Math.floor(Math.random() * body.list.length);
                    const selectedItem = body.list[MapTheAPi];

                    // Validate selected item structure
                    if (!selectedItem || !selectedItem.post || !selectedItem.post.media || 
                        !Array.isArray(selectedItem.post.media) || selectedItem.post.media.length === 0) {
                        console.error('[ONLYFANS XFOLLOW] Invalid response structure');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const ranfile = selectedItem.post.media[0].url;
                    if (!ranfile) {
                        console.error('[ONLYFANS XFOLLOW] No media URL found');
                        await handleFileSizeError(interaction);
                        return;
                    }

                    const files = new AttachmentBuilder(ranfile, 'Aurora.mp4');
                    
                    try {
                        await interaction.editReply({
                            files: [files], 
                            content: `**🔥️ Onlyfans**\n${selectedItem.post.text || " "}`
                        });
                    } catch (uploadErr) {
                        console.log('[ONLYFANS XFOLLOW] Upload failed:', uploadErr.message);
                        await handleFileSizeError(interaction);
                    }
                } catch (ex) {
                    console.error('[ONLYFANS XFOLLOW] Processing error:', ex.message);
                    await handleFileSizeError(interaction);
                }
            });

        } catch (error) {
            console.log('[ONLYFANS XFOLLOW Error]:', error.message);
            if (error.code !== 10062 && error.code !== 40060 && !error.message.includes('Unknown interaction')) {
                await handleFileSizeError(interaction).catch(() => {});
            }
        }
    },


    tiktok_fikfap: async function (interaction, client) {
        interaction.deferReply().then(async () => {
            const support = client.support_server
            if (!interaction.channel.nsfw) {

                interaction.editReply({ embeds: [defaultNSFW(interaction)] })
            } else {
                const randomNumber = Math.floor(Math.random() * 20) + 1;
                const page = Math.floor(Math.random() * 33) + 1;
                try {
                    request({
                        uri: `https://api.fikfap.com/hashtags/label/tiktok/posts?amount=${randomNumber}&topPercentage=${page}`,
                        json: true,
                        jsonReplacer: true,
                        headers: {
                            'User-Agent': `${process.env.USERAGENT}`,
                            'Authorization-Anonymous': `${process.env.FIKFAP_AUTH}`,
                        },
                    }, async function (err, response, body) {

                        const MapTheAPi = Math.floor(Math.random() * body.length);
                        const ranris = body[MapTheAPi];

                        const files = new AttachmentBuilder(ranris.videoFileHqUrl, 'Aurora.mp4')
                        await interaction.editReply({ content: `${ranris.label || " "}\n\nloading content...` })

                        try {
                            await interaction.editReply({
                                files: [files], content: `**🔥️ TikTok**\n${ranris.label || " "}`
                            })
                        } catch (e) {
                            console.log(e)
                            interaction.editReply({
                                embeds: [finalErrorMessage(interaction)],
                                content: ""
                            })
                        }
                    })
                } catch (e) {
                    console.log(e)
                    interaction.editReply({
                        embeds: [defershow(interaction)],
                        content: ""
                    })
                }
            }
        })
    },
}
