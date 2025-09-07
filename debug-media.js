const { EmbedBuilder } = require('discord.js');

async function debugMediaResponses() {
    try {
        console.log('🔍 DEBUGGING MEDIA RESPONSES...');
        console.log('═══════════════════════════════════════════════');
        
        // Test Redgifs
        console.log('\n📍 REDGIFS ANALYSIS:');
        const RedgifsRequester = require('./Functions/others/redgifs_requester.js');
        const redgifsRequester = new RedgifsRequester();
        
        console.log('Creating Redgifs requester...');
        const redgifsContent = await redgifsRequester.getRandomContent('amateur');
        
        console.log('\n🔍 REDGIFS RESPONSE STRUCTURE:');
        console.log('Response keys:', Object.keys(redgifsContent));
        console.log('URL:', redgifsContent.url);
        console.log('Title:', redgifsContent.title);
        console.log('Thumbnail:', redgifsContent.thumbnail);
        console.log('Description:', redgifsContent.description);
        
        console.log('\n🔍 URL VALIDATION:');
        console.log('- URL exists:', !!redgifsContent.url);
        console.log('- URL type:', typeof redgifsContent.url);
        console.log('- URL length:', redgifsContent.url?.length);
        console.log('- Starts with http:', redgifsContent.url?.startsWith('http'));
        console.log('- Contains media:', redgifsContent.url?.includes('media.redgifs.com'));
        
        // Test X/Twitter
        console.log('\n📍 X/TWITTER ANALYSIS:');
        const XTwitterRequester = require('./Functions/others/x_twitter_requester.js');
        const xRequester = new XTwitterRequester();
        
        console.log('Creating X/Twitter requester...');
        const xContent = await xRequester.getRandomContent('amateur');
        
        console.log('\n🔍 X/TWITTER RESPONSE STRUCTURE:');
        console.log('Response keys:', Object.keys(xContent));
        console.log('URL:', xContent.url);
        console.log('Title:', xContent.title);
        console.log('Thumbnail:', xContent.thumbnail);
        console.log('Description:', xContent.description);
        
        console.log('\n🔍 URL VALIDATION:');
        console.log('- URL exists:', !!xContent.url);
        console.log('- URL type:', typeof xContent.url);
        console.log('- URL length:', xContent.url?.length);
        console.log('- Starts with http:', xContent.url?.startsWith('http'));
        
        // Test Embed Creation
        console.log('\n📍 DISCORD EMBED CREATION TEST:');
        
        try {
            const redgifsEmbed = new EmbedBuilder()
                .setDescription(`🔥 **AMATEUR** from **REDGIFS**`)
                .setImage(redgifsContent.url)
                .setColor('#ff6b35');
                
            console.log('✅ Redgifs embed created successfully');
            console.log('Embed image URL:', redgifsEmbed.data.image?.url);
            console.log('Embed data:', JSON.stringify(redgifsEmbed.data, null, 2));
        } catch (embedError) {
            console.error('❌ Redgifs embed creation failed:', embedError.message);
        }
        
        try {
            const xEmbed = new EmbedBuilder()
                .setDescription(`🔥 **AMATEUR** from **X**`)
                .setImage(xContent.url)
                .setColor('#ff6b35');
                
            console.log('✅ X/Twitter embed created successfully');
            console.log('Embed image URL:', xEmbed.data.image?.url);
            console.log('Embed data:', JSON.stringify(xEmbed.data, null, 2));
        } catch (embedError) {
            console.error('❌ X/Twitter embed creation failed:', embedError.message);
        }
        
        console.log('\n🎯 SUMMARY:');
        console.log('─────────────────────────────────');
        console.log('Redgifs URL valid:', !!(redgifsContent.url && redgifsContent.url.startsWith('http')));
        console.log('X/Twitter URL valid:', !!(xContent.url && xContent.url.startsWith('http')));
        
    } catch (error) {
        console.error('❌ DEBUG FAILED:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

debugMediaResponses().then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
}).catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});
