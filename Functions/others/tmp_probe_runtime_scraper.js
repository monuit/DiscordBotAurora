const scraper = require('./ukdevilz_scraper');
(async () => {
    const testUrl = 'https://ukdevilz.com/watch/-209126874_456240449';
    console.log('Probing', testUrl);
    try {
        const res = await scraper.getVideoFromWatchPage(testUrl, { timeout: 45000, debug: true });
        console.log('Scraper result:', res);
    } catch (e) {
        console.error('Scraper error:', e && e.message ? e.message : e);
    }
})();
