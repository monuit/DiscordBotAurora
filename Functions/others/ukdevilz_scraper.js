const axios = require('axios');

// Clean, minimal scraper for ukdevilz watch pages.
// Exports: getVideoFromWatchPage(url, opts)

const pickBestFormat = (formats) => {
    if (!formats || formats.length === 0) return null;
    let best = null;
    for (const f of formats) {
        if (!f || !f.url) continue;
        const lbl = parseInt(f.label) || 0;
        if (!best) { best = { f, lbl }; continue; }
        const bestIsHls = best.f.type && String(best.f.type).toLowerCase().includes('hls');
        const curIsHls = f.type && String(f.type).toLowerCase().includes('hls');
        if (!curIsHls && bestIsHls) { best = { f, lbl }; continue; }
        if (lbl > best.lbl) best = { f, lbl };
    }
    return best ? best.f : null;
};

async function assembleHlsAndUpload(m3u8Url, headers = {}) {
    const os = require('os');
    const path = require('path');
    const fs = require('fs');
    const spawn = require('child_process').spawn;
    const getFfmpegPath = () => {
        try { return require('@ffmpeg-installer/ffmpeg').path; } catch (e) {}
        try { return require('ffmpeg-static'); } catch (e) {}
        return 'ffmpeg';
    };
    const tmpDir = os.tmpdir();
    const outFile = path.join(tmpDir, `ukdevilz_${Date.now()}.mp4`);
    const headerLines = Object.entries(headers || {}).map(([k,v]) => `${k}: ${v}`).join('\r\n') + '\r\n';
    const ffmpegPath = getFfmpegPath();
    const args = ['-y','-headers', headerLines, '-allowed_extensions','ALL','-protocol_whitelist','file,http,https,tcp,tls,crypto','-i', m3u8Url, '-c','copy','-bsf:a','aac_adtstoasc', outFile];
    await new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath, args, { stdio: ['ignore','pipe','pipe'] });
        let stderr = '';
        proc.stderr.on('data', (c) => { stderr += String(c); });
        proc.on('error', (err) => reject(err));
        proc.on('close', (code) => { if (code === 0 && fs.existsSync(outFile)) return resolve(); return reject(new Error('ffmpeg failed to assemble HLS: ' + stderr.slice(0,2000))); });
    });
    try {
        const uploader = require('../spacesUploader');
        if (uploader && typeof uploader.uploadFile === 'function') {
            const res = await uploader.uploadFile(outFile);
            try { require('fs').unlinkSync(outFile); } catch (e) {}
            return { url: res && res.url ? res.url : null };
        }
    } catch (e) {}
    return { url: outFile };
}

async function getVideoFromWatchPage(url, opts = {}) {
    const ua = process.env.UKDEVILZ_AGENT || 'Mozilla/5.0 (AuroraBot)';
    let puppeteer = null;
    try { puppeteer = require('puppeteer'); } catch (e) { try { puppeteer = require('puppeteer-core'); } catch (e2) { puppeteer = null; } }

    // Puppeteer path: render page, open player iframe, monitor network for .m3u8 or mp4; fallback to runtime vars
    if (puppeteer) {
        let browser = null;
        try {
            const launchOpts = { headless: true };
            if (process.platform !== 'win32') launchOpts.args = ['--no-sandbox','--disable-setuid-sandbox'];
            browser = await puppeteer.launch(launchOpts);
            const page = await browser.newPage();
            await page.setUserAgent(ua);
            await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });
            await page.goto(url, { waitUntil: 'networkidle2', timeout: opts.timeout || 30000 });

            const iframeSrc = await page.evaluate(() => { const ifr = document.querySelector('iframe[src*="player"], iframe'); return ifr ? ifr.getAttribute('src') : null; });
            if (iframeSrc) {
                const iframeUrl = new URL(iframeSrc, url).href;
                const client = await page.target().createCDPSession();
                await client.send('Network.enable');
                let intercepted = null;
                client.on('Network.responseReceived', async (params) => {
                    try {
                        const rurl = params.response && params.response.url ? params.response.url : '';
                        const ct = params.response && params.response.mimeType ? params.response.mimeType : '';
                        const low = String(rurl).toLowerCase();
                        if (intercepted) return;
                        if (low.includes('.m3u8') || String(ct).toLowerCase().includes('mpegurl') || String(ct).toLowerCase().includes('vnd.apple.mpegurl')) {
                            intercepted = { url: rurl, type: 'm3u8' };
                            try { const body = await client.send('Network.getResponseBody', { requestId: params.requestId }); intercepted.body = body && body.body ? body.body : null; } catch (e) { intercepted.body = null; }
                            return;
                        }
                        if (String(ct).toLowerCase().includes('application/json') || low.includes('/playlist') || low.includes('/player') || low.includes('/config')) {
                            try {
                                const body = await client.send('Network.getResponseBody', { requestId: params.requestId });
                                const txt = body && body.body ? String(body.body) : '';
                                if (txt) {
                                    const m = txt.match(/https?:\/\/[^\s"'<>]+\.m3u8/);
                                    if (m && m[0]) { intercepted = { url: m[0], type: 'm3u8', body: txt }; return; }
                                    const m2 = txt.match(/https?:\/\/[^\s"'<>]+\.(mp4|mkv|mov)/);
                                    if (m2 && m2[0]) { intercepted = { url: m2[0], type: 'mp4', body: txt }; return; }
                                }
                            } catch (e) { }
                        }
                    } catch (e) { }
                });

                await page.goto(iframeUrl, { waitUntil: 'networkidle2', timeout: 20000 });
                try { await page.evaluate(() => { const v = document.querySelector('video'); if (v && v.play) try { v.play().catch(()=>{}); } catch(e){} }); } catch (e) {}
                await page.waitForTimeout(2500);

                if (intercepted && intercepted.url) {
                    if (intercepted.type === 'm3u8') {
                        try {
                            const uploaded = await assembleHlsAndUpload(intercepted.url, { 'User-Agent': ua, Referer: iframeUrl });
                            await client.send('Network.disable');
                            await browser.close();
                            if (uploaded && uploaded.url) return { url: uploaded.url, page: url, uploaded: true };
                        } catch (e) { }
                    }
                    if (intercepted.type === 'mp4') {
                        await client.send('Network.disable');
                        await browser.close();
                        return { url: intercepted.url, page: url };
                    }
                }

                try {
                    const runtime = await page.evaluate(() => {
                        const out = {};
                        try { out.playlistUrl = window.playlistUrl || null; } catch (e) { out.playlistUrl = null; }
                        try { if (window.jwplayer && typeof window.jwplayer === 'function') out.jw = window.jwplayer().getPlaylist ? window.jwplayer().getPlaylist() : null; } catch (e) { out.jw = null; }
                        try { out.playerConfig = window.playerConfig || window.sources || window.playlist || null; } catch (e) { out.playerConfig = null; }
                        return out;
                    });
                    if (runtime) {
                        let playlistUrl = runtime.playlistUrl || null;
                        let runtimeSources = null;
                        if (!playlistUrl && runtime.jw && Array.isArray(runtime.jw) && runtime.jw.length) runtimeSources = runtime.jw[0];
                        if (!playlistUrl && runtime.playerConfig) runtimeSources = runtime.playerConfig;
                        if (playlistUrl) playlistUrl = new URL(playlistUrl, iframeUrl).href;
                        if (playlistUrl) {
                            try {
                                const plRes = await axios.get(playlistUrl, { headers: { 'User-Agent': ua }, timeout: 10000 });
                                const playlist = plRes && plRes.data ? plRes.data : null;
                                if (playlist && Array.isArray(playlist.sources)) {
                                    const formats = playlist.sources.map(s => ({ url: s.file || s.src || s.fileUrl || '', type: s.type || s.format || null, label: s.label || s.height || s.width || null })).filter(f=>f&&f.url);
                                    const best = pickBestFormat(formats);
                                    const candidate = best ? best : formats[0];
                                    if (candidate && String(candidate.url).toLowerCase().includes('.m3u8')) {
                                        try { const uploaded = await assembleHlsAndUpload(candidate.url, { 'User-Agent': ua, Referer: iframeUrl }); if (uploaded && uploaded.url) { await client.send('Network.disable'); await browser.close(); return { url: uploaded.url, formats, page: url, uploaded: true }; } } catch (e) {}
                                    }
                                    await client.send('Network.disable');
                                    await browser.close();
                                    return { url: candidate ? candidate.url : (formats[0] && formats[0].url), formats, page: url };
                                }
                            } catch (e) { }
                        }
                        if (runtimeSources) {
                            const formats = (Array.isArray(runtimeSources.sources) ? runtimeSources.sources : (Array.isArray(runtimeSources) ? runtimeSources : [runtimeSources])).map(s => ({ url: s.file || s.src || s.fileUrl || '', type: s.type || s.format || null, label: s.label || s.height || s.width || null })).filter(f=>f&&f.url);
                            if (formats.length) {
                                const best = pickBestFormat(formats);
                                const candidate = best ? best : formats[0];
                                if (candidate && String(candidate.url).toLowerCase().includes('.m3u8')) {
                                    try { const uploaded = await assembleHlsAndUpload(candidate.url, { 'User-Agent': ua, Referer: iframeUrl }); if (uploaded && uploaded.url) { await client.send('Network.disable'); await browser.close(); return { url: uploaded.url, formats, page: url, uploaded: true }; } } catch (e) {}
                                }
                                await client.send('Network.disable');
                                await browser.close();
                                return { url: candidate.url, formats, page: url };
                            }
                        }
                    }
                } catch (e) { }

                await client.send('Network.disable');
                await browser.close();
            }
        } catch (e) {
            try { if (browser) await browser.close(); } catch (err) {}
        }
    }

    // Static fallback
    try {
        const res = await axios.get(url, { headers: { 'User-Agent': ua }, timeout: 10000, validateStatus: () => true });
        const body = res && res.data ? String(res.data) : '';
        let m = body.match(/<iframe[^>]+src=["']([^"']*player[^"']*)["']/i) || body.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (m && m[1]) {
            const iframeUrl = new URL(m[1], url).href;
            try {
                const ifr = await axios.get(iframeUrl, { headers: { 'User-Agent': ua }, timeout: 10000, validateStatus: () => true });
                const iframeHtml = ifr && ifr.data ? String(ifr.data) : '';
                let pm = iframeHtml.match(/window\.playlistUrl\s*=\s*['"]([^'"]+)['"]/i) || iframeHtml.match(/playlistUrl\s*[:=]\s*['"]([^'"]+)['"]/i);
                let playlistUrl = pm ? pm[1] : null;
                if (playlistUrl) playlistUrl = new URL(playlistUrl, iframeUrl).href;
                if (playlistUrl) {
                    const plRes = await axios.get(playlistUrl, { headers: { 'User-Agent': ua }, timeout: 10000 });
                    const playlist = plRes && plRes.data ? plRes.data : null;
                    if (playlist && Array.isArray(playlist.sources)) {
                        const formats = playlist.sources.map(s => ({ url: s.file || s.src || s.fileUrl || '', type: s.type || s.format || null, label: s.label || s.height || s.width || null })).filter(f=>f&&f.url);
                        const best = pickBestFormat(formats);
                        const candidate = best ? best : formats[0];
                        if (candidate && candidate.url && String(candidate.url).toLowerCase().includes('.m3u8')) {
                            try { const uploaded = await assembleHlsAndUpload(candidate.url, { 'User-Agent': ua, Referer: iframeUrl }); if (uploaded && uploaded.url) return { url: uploaded.url, formats, page: url, uploaded: true }; } catch (e) {}
                        }
                        return { url: candidate ? candidate.url : (formats[0] && formats[0].url), formats, page: url };
                    }
                }
            } catch (e) { }
        }
        m = body.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i);
        if (m && m[1]) return { url: m[1], page: url };
        m = body.match(/<video[^>]+src=["']([^"']+)["']/i) || body.match(/<source[^>]+src=["']([^"']+)["']/i);
        if (m && m[1]) return { url: m[1], page: url };
    } catch (e) { }

    return null;
}

module.exports = { getVideoFromWatchPage };
