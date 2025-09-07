const { green, white } = require('chalk');
const Premium = require("../../settings/models/Premium")
const gPremium = require("../../settings/models/GPremium")
const { functions_runner } = require("../../Functions/others/Functionsrunner.js")
const { webhook_fiqfuq_auto_requester } = require("../../Functions/FiqFuqAutoSender.js")
const { webhook_reddit_sender } = require("../../Functions/WebhookRedditSender.js") //reddit
const { webhook_video_sender } = require("../../Functions/AutoVideoSender.js") // video
const { webhook_pinporn_sender } = require("../../Functions/PinPornSender.js") // video 2
const { webhook_saved_sender } = require("../../Functions/AutoRandomSavedSender.js") //saved video
const { webhook_onlytik_sender } = require("../../Functions/OnlyTikApi.js") //onlytik
const { webhook_auto_feed_sender } = require("../../Functions/AutoFeedsSender.js")//premium
const { webhook_tiktok_fiqfuq_auto_requester } = require("../../Functions/Tiktok_f_auto.js")//prmium
const { webhook_leftandright_reddit_sender } = require("../../Functions/LeftandRightSender.js") //left and right premium
const { webhook_tiktok_waptap } = require("../../Functions/waptap_tiktok_sender.js") //free tiktok
const { premium_webhook_auto_xfollow_sender } = require("../../Functions/PremiumXfollowPoster.js") //premium
const { botlistme_requester } = require("../../Functions/BotLists/botlist.me.js") //bot list: botlist.me
const { displayReadyBanner } = require('../../utils/startupBanner');
const SystemMonitor = require('../../utils/systemMonitor');
//
const BotlistMeClient = require('botlist.me.js');
//

const { botlistme_hasvoted } = require("../../Functions/BotLists/hasvoted.botlist.me.js")
//doc: https://crontab.guru/examples.html
require("dotenv").config();
const { EmbedBuilder, PermissionsBitField, WebhookClient } = require("discord.js")
var cron = require('node-cron');

module.exports = async (client) => {
    // Display ready banner
    displayReadyBanner(client);
    
    console.log(white('[') + green('Aurora') + white('] ') + green(`${client.guilds.cache.size}`) + white(` Guilds`));
    console.log(white('[') + green('INFO') + white('] ') + green(`${client.user.tag} (${client.user.id})`) + white(` is Ready!`));


    //update guild and users premium
    const users = await Premium.find();
    for (let user of users) {
        client.premiums.set(user.Id, user);
    }

    const guildss = await gPremium.find();
    for (let user of guildss) {
        client.premiums.set(user.Id, user);
    }



    const functions = [ //free functions
        webhook_video_sender,
        webhook_pinporn_sender,
        webhook_saved_sender,
        webhook_fiqfuq_auto_requester,
        webhook_tiktok_waptap,
        webhook_onlytik_sender
    ];

    const pref = [ //premium functions
        webhook_tiktok_fiqfuq_auto_requester,
        webhook_auto_feed_sender,
        premium_webhook_auto_xfollow_sender
    ]

    // Initialize global cron jobs tracking
    if (!global.cronJobs) {
        global.cronJobs = new Map();
    }

    // Free functions scheduler (every 15 minutes)
    const freeFunctionsJob = cron.schedule('*/15 * * * *', async () => {
        try {
            const randomFunction = functions_runner(functions);
            await randomFunction(client);
        } catch (error) {
            console.error('[Cron] Error in random function scheduler:', error);
        }
    })
    global.cronJobs.set('freeFunctions', freeFunctionsJob);

    // Premium functions scheduler (every hour)
    const premiumFunctionsJob = cron.schedule('0 * * * *', async () => {
        try {
            const rf = functions_runner(pref);
            await rf(client);
        } catch (error) {
            console.error('[Cron] Error in premium function scheduler:', error);
        }
    })//premium random functions
    global.cronJobs.set('premiumFunctions', premiumFunctionsJob);

    // Smart Reddit Auto-Post System (NOT cron-based, controlled by demand)
    // This system only runs when there are active webhooks and uses intelligent scheduling
    const { startSmartAutoPostSystem } = require('../../Functions/SmartAutoPostManager.js');
    await startSmartAutoPostSystem(client);

    // Left-right Reddit sender (every hour)
    const leftRightRedditJob = cron.schedule('0 * * * *', async () => {
        try {
            await webhook_leftandright_reddit_sender(client);
        } catch (error) {
            console.error('[Cron] Error in left-right Reddit sender:', error);
        }
    })//premium reddit
    global.cronJobs.set('leftRightReddit', leftRightRedditJob);

    // Start the sophisticated NSFW presence rotation system
    if (client.presenceRotation) {
        client.presenceRotation.startRotation();
    }

    // Start the auto-promotional system
    if (client.autoPromo) {
        await client.autoPromo.start();
    }

    // Start the auto web scrape system
    if (client.autoWebScrapeSender) {
        await client.autoWebScrapeSender.start();
    }

    // Start the auto-post optimizer for performance monitoring
    if (client.autoPostOptimizer) {
        client.autoPostOptimizer.startMonitoring();
        console.log('[AutoPostOptimizer] Performance monitoring started');
    }

    // Initialize and start system monitoring with 80% thresholds
    console.log('[Monitor] Initializing system monitoring with threshold alerts...');
    client.systemMonitor = new SystemMonitor(client);
    
    // Log initial system status
    setTimeout(async () => {
        try {
            const status = await client.systemMonitor.getStatus();
            console.log('[Monitor] Initial system status check completed');
            console.log(`[Monitor] CPU: ${status.cpu.current.toFixed(1)}% | Memory: ${status.memory.current.toFixed(1)}% | DB: ${status.database.latency.toFixed(1)}ms | Network: ${status.network.latency}ms`);
        } catch (error) {
            console.error('[Monitor] Failed to get initial system status:', error.message);
        }
    }, 5000); // 5 second delay to let systems stabilize

    if (process.env.BOLISTME) {
        const botlistJob = cron.schedule('0 */3 * * *', async () => {
            try {
                botlistme_requester(client.guilds.cache.size, client.count, client.user.id,
                    async (error, responseData, response) => {
                        if (!error | response.statusCode === 200) {
                            console.log("updated to botlist.me", response.body)
                            const web = new WebhookClient({ url: client.botlistlog });
                            web.send({
                                content: `BotList: botlist.me posted status (${response.statusCode})`
                            });
                        } else {
                            const web = new WebhookClient({ url: client.er_webhook });
                            web.send({
                                content: `BotList: botlist.me | ${error}`
                            });
                        }
                    })
            } catch (er) {
                console.log(er)
                const web = new WebhookClient({ url: client.er_webhook });
                web.send({
                    content: `BotList: botlist.me | ${er}`
                });
            }
        })
        global.cronJobs.set('botlistUpdater', botlistJob);
        
        // Only start botlist webhook if token is provided and port is available
        if (process.env.BOTLISTMETOKEN) {
            try {
                const webhookPort = process.env.WEBHOOK_PORT || 3001; // Use different default port
                const botlistme = new BotlistMeClient(process.env.BOTLISTMETOKEN, { 
                    webhookPort: parseInt(webhookPort), 
                    webhookAuth: process.env.WEBHOOK_AUTH || 'Jende@123' 
                });

                botlistme.webhook.on('ready', hook => {
                    console.log(`Webhook running at http://${hook.hostname}:${hook.port}${hook.path}`);
                });

                //running the shit
                botlistme.webhook.on('vote', vote => {
                    console.log(`User ${vote.user} just voted!`);
                });
                
                botlistme.webhook.on('error', (error) => {
                    console.error('[Botlist] Webhook error:', error.message);
                });
                
            } catch (botlistError) {
                console.error('[Botlist] Failed to start webhook:', botlistError.message);
            }
        } else {
            console.log('[Botlist] BOTLISTMETOKEN not provided, skipping webhook setup');
        }
    } else {
        console.log('[Botlist] BOLISTME not enabled, skipping botlist integration');
    }

    // Run final startup health checks (delayed to ensure all systems are initialized)
    setTimeout(async () => {
        try {
            const { createDefaultHealthChecks } = require('../../utils/startupHealthCheck');
            console.log('\n' + '='.repeat(60));
            console.log('🔍 Running final startup health verification...');
            console.log('='.repeat(60));
            
            const healthCheck = createDefaultHealthChecks(client);
            const results = await healthCheck.runAllChecks();
            
            console.log('='.repeat(60));
            if (results.success) {
                console.log('🎉 Aurora Bot is fully operational and ready for service!');
            } else {
                console.log('⚠️ Aurora Bot started with some issues. Check the health report above.');
            }
            console.log('='.repeat(60) + '\n');
            
        } catch (error) {
            console.error('Failed to run startup health checks:', error.message);
        }
    }, 2000); // 2-second delay to ensure all async operations complete
};
