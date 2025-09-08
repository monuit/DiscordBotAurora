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
                { name: "Ukdevilz", value: "ukdevilz" },
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
    // Defer reply so we have time for downloads/transcoding if needed
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
        const source = interaction.options.getString('source');
        const category = interaction.options.getString('category') || 'hot';
        const debug = interaction.options.getBoolean('debug') || false;

        try {
            let contentData = null;
            let sourceUsed = source;
            if (source === 'x') {
                contentData = await testXTwitterContent(category, debug);
            } else if (source === 'redgifs') {
                contentData = await testRedgifsContent(category, debug);
            } else if (source === 'ukdevilz') {
                contentData = await testUkdevilzContent(category, debug, client, interaction);
            } else if (source === 'both') {
                const sources = ['x', 'redgifs', 'ukdevilz'];
                sourceUsed = sources[Math.floor(Math.random() * sources.length)];
                if (sourceUsed === 'x') {
                    contentData = await testXTwitterContent(category, debug);
                } else if (sourceUsed === 'redgifs') {
                    contentData = await testRedgifsContent(category, debug);
                } else {
                    contentData = await testUkdevilzContent(category, debug, client, interaction);
                }
            }

            if (!contentData || !contentData.url) {
                console.log(`[TESTMEDIA] No content from ${sourceUsed}`);
                await interaction.editReply({ content: `No content returned from ${sourceUsed}` }).catch(() => {});
                return;
            }

            // Deduplication check (placeholder, implement with DB/model)
            // if (await isDuplicate(contentData.url, interaction.channel.id)) {
            //     await interaction.reply({ content: 'Duplicate video detected (posted in last 72h)', flags: 64 });
            //     return;
            // }

            // Detect accessibility and content-length
            let urlCheck = null;
            try {
                urlCheck = await testUrlAccessibility(contentData.url);
            } catch (err) {
                console.log('[TESTMEDIA] URL accessibility test failed:', err.message);
            }

            if (!urlCheck || !urlCheck.accessible) {
                // Special-case: ukdevilz may return a page URL when CDN direct link is expired; callers set contentData.directPlayable = false
                if (contentData.source === 'ukdevilz' && contentData.directPlayable === false) {
                    // Attempt automated rescue: render + intercept or assemble HLS into MP4 and upload via Spaces
                    await interaction.editReply({ content: `Ukdevilz CDN link unavailable. Attempting to render the page and assemble a playable MP4 (may take ~30-120s)...` }).catch(() => {});
                    try {
                        const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Operation timed out')), ms))]);
                        const scraper = require('../../Functions/others/ukdevilz_scraper.js');
                        // Allow longer timeout for Puppeteer + ffmpeg work
                        const rescue = await withTimeout(scraper.getVideoFromWatchPage(contentData.page, { timeout: 180000 }), 180000);
                        if (rescue && rescue.uploaded && rescue.url) {
                            const embed = new EmbedBuilder()
                                .setTitle(contentData.title || 'Ukdevilz video (assembled)')
                                .setURL(contentData.page)
                                .setDescription(`Category: ${contentData.category || 'unknown'}`)
                                .setColor(contentData.color || '#6b8cff')
                                .setFooter({ text: contentData.footer || 'Source: ukdevilz' });

                            await interaction.channel.send({ content: rescue.url, embeds: [embed] });
                            await interaction.editReply({ content: `Assembled and uploaded MP4: ${rescue.url}` }).catch(() => {});
                            return;
                        }
                        // If rescue returned a direct URL (mp4), fall through to accessibility checks
                        if (rescue && rescue.url) {
                            contentData.url = rescue.url;
                            // continue to downstream logic to test accessibility and potentially download/compress
                        } else {
                            await interaction.editReply({ content: `Could not extract playable video from the page. Open the page to view: ${contentData.page}` }).catch(() => {});
                            return;
                        }
                    } catch (rescueErr) {
                        console.error('[TESTMEDIA] Ukdevilz rescue failed:', rescueErr);
                        await interaction.editReply({ content: `Automated rescue failed: ${rescueErr.message}. Open the page to view the video: ${contentData.page}` }).catch(() => {});
                        return;
                    }
                }

                await interaction.editReply({ content: `Video URL not accessible: ${urlCheck && urlCheck.statusCode ? `HTTP ${urlCheck.statusCode}` : 'request failed'}` }).catch(() => {});
                return;
            }

            const MAX_DISCORD_FILE = 25 * 1024 * 1024; // 25MB
            const contentLength = urlCheck.contentLength || null;

            // If we know the size and it's within Discord limits, just post the URL
            if (contentLength && contentLength <= MAX_DISCORD_FILE) {
                const embed = new EmbedBuilder()
                    .setTitle(contentData.title || 'Media')
                    .setURL(contentData.page || contentData.url)
                    .setDescription(`Category: ${contentData.category}`)
                    .setColor(contentData.color || '#6b8cff')
                    .setFooter({ text: contentData.footer || `Source: ${sourceUsed}` });

                await interaction.channel.send({ content: contentData.url, embeds: [embed] });
                await interaction.editReply({ content: 'Posted content (URL within size limits).' }).catch(() => {});
                return;
            }

            // If contentLength exists and is too large, attempt to compress for test purposes (B)
            if (contentLength && contentLength > MAX_DISCORD_FILE) {
                await interaction.editReply({ content: `Video is too large (${Math.round(contentLength/1024/1024)}MB). Attempting to compress for test...` }).catch(() => {});
                try {
                    const path = require('path');
                    const os = require('os');
                    const fs = require('fs');
                    const axios = require('axios');

                    const tmpDir = os.tmpdir();
                    const inFile = path.join(tmpDir, `test_in_${Date.now()}.mp4`);
                    const outFile = path.join(tmpDir, `test_out_${Date.now()}.mp4`);

                    // Timeout wrapper (120s) to avoid hanging the interaction
                    const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Operation timed out')), ms))]);
                    await withTimeout(downloadToFile(contentData.url, inFile), 120000);
                    await withTimeout(compressVideo(inFile, outFile), 120000);

                    const stats = fs.statSync(outFile);
                    if (stats.size > MAX_DISCORD_FILE) {
                        // Attempt to upload to Spaces and post public URL
                        try {
                            const uploader = require('../../Functions/spacesUploader');
                            const res = await uploader.uploadFile(outFile);
                            await interaction.channel.send({ content: `File too large for Discord, uploaded to Spaces: ${res.url}` });
                            await interaction.editReply({ content: `Compression completed and uploaded to Spaces (${Math.round(stats.size/1024/1024)}MB).` }).catch(() => {});
                        } catch (upErr) {
                            console.error('[TESTMEDIA] Spaces upload failed:', upErr);
                            await interaction.editReply({ content: `Compression completed but file still too large (${Math.round(stats.size/1024/1024)}MB) and upload failed: ${upErr.message}` }).catch(() => {});
                        }
                        // cleanup
                        try { fs.unlinkSync(inFile); } catch(e){}
                        try { fs.unlinkSync(outFile); } catch(e){}
                        return;
                    }

                    // Send compressed file to channel
                    await interaction.channel.send({ files: [outFile] });
                    await interaction.editReply({ content: `Compressed and posted (${Math.round(stats.size/1024/1024)}MB).` }).catch(() => {});

                    // cleanup
                    try { fs.unlinkSync(inFile); } catch(e){}
                    try { fs.unlinkSync(outFile); } catch(e){}
                    return;
                } catch (err) {
                    console.error('[TESTMEDIA] Compression failed:', err);
                    await interaction.editReply({ content: `Compression failed: ${err.message}` }).catch(() => {});
                    return;
                }
            }

            // If contentLength not known, attempt a conservative download+compress flow
            if (!contentLength) {
                await interaction.editReply({ content: 'Content length unknown. Attempting to download and compress (best-effort)...' }).catch(() => {});
                try {
                    const path = require('path');
                    const os = require('os');
                    const fs = require('fs');
                    const tmpDir = os.tmpdir();
                    const inFile = path.join(tmpDir, `test_in_${Date.now()}.mp4`);
                    const outFile = path.join(tmpDir, `test_out_${Date.now()}.mp4`);

                    const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Operation timed out')), ms))]);
                    await withTimeout(downloadToFile(contentData.url, inFile), 120000);
                    const statsIn = fs.statSync(inFile);
                    if (statsIn.size <= MAX_DISCORD_FILE) {
                        await interaction.channel.send({ files: [inFile] });
                        await interaction.editReply({ content: `Downloaded and posted (${Math.round(statsIn.size/1024/1024)}MB).` }).catch(() => {});
                        try { fs.unlinkSync(inFile); } catch(e){}
                        return;
                    }

                    await withTimeout(compressVideo(inFile, outFile), 120000);
                    const statsOut = fs.statSync(outFile);
                    if (statsOut.size > MAX_DISCORD_FILE) {
                        try {
                            const uploader = require('../../Functions/spacesUploader');
                            const res = await uploader.uploadFile(outFile);
                            await interaction.channel.send({ content: `File too large for Discord, uploaded to Spaces: ${res.url}` });
                            await interaction.editReply({ content: `Compression completed and uploaded to Spaces (${Math.round(statsOut.size/1024/1024)}MB).` }).catch(() => {});
                        } catch (upErr) {
                            console.error('[TESTMEDIA] Spaces upload failed:', upErr);
                            await interaction.editReply({ content: `Compression completed but file still too large (${Math.round(statsOut.size/1024/1024)}MB) and upload failed: ${upErr.message}` }).catch(() => {});
                        }
                        try { fs.unlinkSync(inFile); } catch(e){}
                        try { fs.unlinkSync(outFile); } catch(e){}
                        return;
                    }

                    await interaction.channel.send({ files: [outFile] });
                    await interaction.editReply({ content: `Downloaded, compressed and posted (${Math.round(statsOut.size/1024/1024)}MB).` }).catch(() => {});
                    try { fs.unlinkSync(inFile); } catch(e){}
                    try { fs.unlinkSync(outFile); } catch(e){}
                    return;
                } catch (err) {
                    console.error('[TESTMEDIA] Download/compress failed:', err);
                    await interaction.editReply({ content: `Download/compress failed: ${err.message}` }).catch(() => {});
                    return;
                }
            }
        } catch (error) {
            console.error('[TestMedia] Error during media test:', error);
            try {
                await interaction.editReply({ content: `Error during media test: ${error.message}` });
            } catch (e) {
                // ignore edit failures
            }
        }
// Ukdevilz test logic
async function testUkdevilzContent(category, debug, client, interaction) {
    const UkdevilzRequester = require('../../Functions/others/ukdevilz_requester.js');
    const ukdevilzRequester = new UkdevilzRequester();
    // Fallback to 'anal' if unsupported
    if (!ukdevilzRequester.isCategorySupported(category)) category = 'anal';
    // Get video
    const video = await ukdevilzRequester.getRandomContent(category);
    // Validate URL and file size using the shared tester for richer diagnostics
    try {
        const urlInfo = await testUrlAccessibility(video.url, { headers: ukdevilzRequester.getRequestHeaders(video.page) });
        if (!urlInfo || !urlInfo.accessible) {
            throw new Error(`Video URL not accessible (HTTP ${urlInfo && urlInfo.statusCode ? urlInfo.statusCode : 'unknown'})`);
        }
        // attach size when known
        if (urlInfo.contentLength) video.size = urlInfo.contentLength;
        return video;
    } catch (err) {
        throw new Error(`Video URL validation failed: ${err.message}`);
    }
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

async function testUrlAccessibility(url, opts = {}) {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    const axios = require('axios');

    const headers = (opts && opts.headers) || { 'User-Agent': 'Mozilla/5.0 (AuroraBot)' };
    const timeout = (opts && opts.timeout) || 8000;

    // Prefer HEAD via axios for consistency, fallback to GET range probe
    try {
        const headRes = await axios.head(url, { headers, timeout, maxRedirects: 5, validateStatus: () => true });
        const statusCode = headRes.status;
        const accessible = statusCode >= 200 && statusCode < 400;
        const contentLength = headRes.headers && headRes.headers['content-length'] ? parseInt(headRes.headers['content-length'], 10) : null;
        if (accessible) return { accessible: true, statusCode, contentLength };
        // If HEAD gives 405/416/403/410 etc, attempt minimal GET range probe to check availability
    } catch (headErr) {
        // continue to GET probe
    }

    try {
        const rangeRes = await axios.get(url, { headers: Object.assign({}, headers, { Range: 'bytes=0-0' }), timeout, responseType: 'stream', maxRedirects: 5, validateStatus: () => true });
        const statusCode = rangeRes.status;
        const accessible = statusCode >= 200 && statusCode < 400;
        const contentLength = rangeRes.headers && (rangeRes.headers['content-length'] ? parseInt(rangeRes.headers['content-length'], 10) : (rangeRes.headers['content-range'] ? parseInt((rangeRes.headers['content-range'].split('/')[1] || '0'), 10) : null));
        return { accessible, statusCode, contentLength };
    } catch (rangeErr) {
        // Final fallback: attempt a short GET without range to get status
        try {
            const res = await axios.get(url, { headers, timeout, maxRedirects: 5, validateStatus: () => true });
            return { accessible: res.status >= 200 && res.status < 400, statusCode: res.status, contentLength: res.headers && res.headers['content-length'] ? parseInt(res.headers['content-length'], 10) : null };
        } catch (err) {
            throw new Error(`Network check failed: ${err.message}`);
        }
    }
}

async function downloadToFile(url, outPath, opts = {}) {
    const fs = require('fs');
    const axios = require('axios');
    const defaultHeaders = (opts && opts.headers) || { 'User-Agent': 'Mozilla/5.0 (AuroraBot)' };
    // Helper: assemble HLS (.m3u8) using ffmpeg when playlist is detected
    const spawn = require('child_process').spawn;
    const getFfmpegPath = () => {
        try { return require('@ffmpeg-installer/ffmpeg').path; } catch (e) { /* fallback */ }
        try { return require('ffmpeg-static'); } catch (e) { /* fallback */ }
        return 'ffmpeg';
    };

    async function downloadHlsToFile(m3u8Url, outFile, headers) {
        return new Promise((resolve, reject) => {
            const ffmpegPath = getFfmpegPath();
            // Build header block for ffmpeg (-headers expects CRLF-separated headers ending with CRLF)
            const headerLines = Object.entries(headers || {}).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n';

            const args = [
                '-y',
                '-headers', headerLines,
                '-allowed_extensions', 'ALL',
                '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
                '-i', m3u8Url,
                '-c', 'copy',
                '-bsf:a', 'aac_adtstoasc',
                outFile
            ];

            const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
            let stderr = '';
            proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
            proc.on('error', (err) => reject(err));
            proc.on('close', (code) => {
                if (code === 0) return resolve();
                const err = new Error(`ffmpeg exited with code ${code}: ${stderr.slice(0,2000)}`);
                reject(err);
            });
        });
    }

    // Probe headers to detect playlist content-type or redirected URL
    try {
        const headRes = await axios.head(url, { headers: defaultHeaders, timeout: 10000, maxRedirects: 5, validateStatus: () => true });
        const ct = (headRes.headers && headRes.headers['content-type']) ? headRes.headers['content-type'].toLowerCase() : '';
        const finalUrl = (headRes.request && headRes.request.res && headRes.request.res.responseUrl) ? headRes.request.res.responseUrl : url;
        if (ct.includes('application/vnd.apple.mpegurl') || ct.includes('application/x-mpegurl') || finalUrl.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('.m3u8')) {
            // HLS playlist detected: use ffmpeg to assemble
            await downloadHlsToFile(url, outPath, defaultHeaders);
            return;
        }
    } catch (e) {
        // head probe failed, continue to check URL suffix
        if (url.toLowerCase().includes('.m3u8')) {
            await downloadHlsToFile(url, outPath, defaultHeaders);
            return;
        }
    }

    // Fallback: regular streaming download
    const writer = fs.createWriteStream(outPath);
    const res = await axios({ url, method: 'GET', responseType: 'stream', timeout: 60000, headers: defaultHeaders, maxRedirects: 5 });
    return new Promise((resolve, reject) => {
        res.data.pipe(writer);
        let error = null;
        writer.on('error', err => {
            error = err;
            writer.close();
            reject(err);
        });
        writer.on('close', () => {
            if (!error) resolve();
        });
    });
}

async function compressVideo(inputPath, outputPath) {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path || require('ffmpeg-static');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-c:v libx264',
                '-preset veryfast',
                '-crf 28',
                '-vf scale=1280:-2',
                '-c:a aac',
                '-b:a 128k',
                '-movflags +faststart'
            ])
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}
