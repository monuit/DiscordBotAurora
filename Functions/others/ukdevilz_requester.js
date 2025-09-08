const scraper = require('./ukdevilz_scraper');

class UkdevilzRequester {
    constructor() {
        this.baseUrl = 'https://ukdevilz.com';
        this.categories = [
            'blowjob','anal','lesbian','milf','teen','amateur','big-ass','big-tits','cumshot','creampie','deepthroat','hardcore','homemade','asian','ebony','latina','hot','trending','new','random'
        ];
    }

    isCategorySupported(cat) {
        if (!cat) return false;
        return this.categories.includes(String(cat).toLowerCase());
    }

    getRequestHeaders(referer = null, cookieHeader = null) {
        const ua = process.env.UKDEVILZ_AGENT || 'Mozilla/5.0 (AuroraBot)';
        const h = { 'User-Agent': ua };
        if (referer) h.Referer = referer;
        if (cookieHeader) h.Cookie = cookieHeader;
        return h;
    }

    async getVideosByCategory(category, limit = 6) {
        // Respect environment flag to disable ukdevilz scraping/runtime
        try {
            const enabled = (String(process.env.UKDEVILZ_ENABLED || 'false').toLowerCase() === 'true');
            if (!enabled) {
                // Return empty list when disabled to avoid accidental network operations
                return [];
            }
        } catch (e) {}

        if (!category) category = 'hot';
        const cat = String(category).toLowerCase();
        const catUrl = `${this.baseUrl}/video/${cat}`;
        // Try puppeteer render to bypass Cloudflare
        let puppeteer = null;
        try { puppeteer = require('puppeteer'); } catch (e) { try { puppeteer = require('puppeteer-core'); } catch (e2) { puppeteer = null; } }
        let watchUrls = [];
        if (puppeteer) {
            let browser = null;
            try {
                const launchOpts = { headless: true };
                if (process.platform !== 'win32') launchOpts.args = ['--no-sandbox','--disable-setuid-sandbox'];
                browser = await puppeteer.launch(launchOpts);
                const page = await browser.newPage();
                await page.setUserAgent(process.env.UKDEVILZ_AGENT || 'Mozilla/5.0 (AuroraBot)');
                await page.goto(catUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                // collect watch links
                const hrefs = await page.$$eval('a[href*="/watch/"]', els => els.map(e => e.getAttribute('href')));
                await page.close();
                await browser.close();
                watchUrls = hrefs.filter(Boolean).map(h => (h.startsWith('http') ? h : new URL(h, 'https://ukdevilz.com').href));
            } catch (err) {
                try { if (browser) await browser.close(); } catch (e) {}
                watchUrls = [];
            }
        }

        // static fallback: axios get and regex
        if (!watchUrls || watchUrls.length === 0) {
            try {
                const axios = require('axios');
                const r = await axios.get(catUrl, { headers: { 'User-Agent': process.env.UKDEVILZ_AGENT || 'Mozilla/5.0 (AuroraBot)' }, timeout: 10000, validateStatus: () => true });
                const body = r && r.data ? String(r.data) : '';
                const re = /href=["'](\/watch\/[\-\d_]+|https?:\/\/[^"']+?\/watch\/[\-\d_]+)["']/gi;
                const set = new Set(); let m;
                while ((m = re.exec(body))) { let h = m[1]; if (h.startsWith('/')) h = this.baseUrl + h; set.add(h); }
                watchUrls = Array.from(set);
            } catch (e) { watchUrls = []; }
        }

        // limit and dedupe
        watchUrls = Array.from(new Set(watchUrls)).slice(0, limit);

        const results = [];
        for (const w of watchUrls) {
            try {
                const v = await require('./ukdevilz_scraper').getVideoFromWatchPage(w);
                if (v && v.url) results.push({ title: v.title || 'Ukdevilz video', url: v.url, page: v.page || w, formats: v.formats || null });
            } catch (e) { /* ignore single failures */ }
        }

        return results;
    }

    async getRandomContent(category) {
        if (!category) category = 'amateur';
        if (!this.isCategorySupported(category)) category = 'amateur';
        // Try to fetch a list from the category then pick one at random
        const list = await this.getVideosByCategory(category, 8);
        if (list && list.length) {
            const sel = list[Math.floor(Math.random() * list.length)];
            return {
                title: sel.title || 'Ukdevilz video',
                url: sel.url,
                page: sel.page,
                size: sel.size || null,
                category: category,
                source: 'ukdevilz',
                footer: `Source: Ukdevilz • Category: ${category}`,
                color: '#6b8cff',
                directPlayable: true
            };
        }
        // Fallback: single test URL
        const testUrl = `${this.baseUrl}/watch/-127700459_456246190`;
        const v = await scraper.getVideoFromWatchPage(testUrl);
        if (!v) throw new Error('No content found');
        return {
            title: v.title || 'Ukdevilz video',
            url: v.url,
            page: v.page || testUrl,
            size: v.size || null,
            category: category,
            source: 'ukdevilz',
            footer: `Source: Ukdevilz • Category: ${category}`,
            color: '#6b8cff',
            directPlayable: true
        };
    }
}

module.exports = UkdevilzRequester;
