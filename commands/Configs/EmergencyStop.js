const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: ["emergencystop"],
    description: "🚨 EMERGENCY: Stop all bot operations and suspend all activities",
    options: [
        {
            name: "action",
            description: "Emergency action to perform",
            type: 3, // STRING
            required: true,
            choices: [
                { name: "execute", value: "execute" },
                { name: "status", value: "status" },
                { name: "reinitialize", value: "reinitialize" },
                { name: "clear-cron", value: "clear-cron" }
            ]
        },
        {
            name: "confirmation",
            description: "Confirmation string for destructive actions",
            type: 3, // STRING
            required: false
        }
    ],
    UserPermissions: ["Administrator"],
    BotPermissions: ["SendMessages", "EmbedLinks"],

    async run(interaction) {
        // Defer reply immediately
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: 64 });
        }

        // Admin-only command
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🚫 Access Denied')
                .setDescription('Only administrators can use emergency commands.')
                .setTimestamp();

            return await interaction.editReply({ embeds: [embed] });
        }

        const action = interaction.options.getString('action');
        const confirmation = interaction.options.getString('confirmation');

        try {
            switch (action) {
                case 'execute':
                    await handleEmergencyStop(interaction, confirmation);
                    break;
                case 'status':
                    await handleEmergencyStatus(interaction);
                    break;
                case 'reinitialize':
                    await handleReinitialize(interaction, confirmation);
                    break;
                case 'clear-cron':
                    await handleClearCron(interaction, confirmation);
                    break;
            }
        } catch (error) {
            console.error('[EmergencyStop] Error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('⚠️ Emergency Command Error')
                .setDescription(`Error: ${error.message}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

async function handleEmergencyStop(interaction, confirmation) {
    if (confirmation !== 'EMERGENCY_STOP_CONFIRMED') {
        const embed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('🚨 Emergency Stop - Confirmation Required')
            .setDescription('**WARNING: This will stop ALL bot operations!**\n\n' +
                '**What will be stopped:**\n' +
                '• All auto-posting (Redgifs, X/Twitter)\n' +
                '• All promotional campaigns\n' +
                '• All database write operations\n' +
                '• All scheduled tasks\n' +
                '• System monitoring alerts\n\n' +
                '**To proceed, use:**\n' +
                '`/emergencystop action:execute confirmation:EMERGENCY_STOP_CONFIRMED`')
            .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
    }

    // Execute emergency stop
    const client = interaction.client;
    let stoppedSystems = [];

    try {
        // 1. Stop all auto web scraping
        if (client.autoWebScrapeSender) {
            const stoppedCount = await client.autoWebScrapeSender.emergencyStop();
            stoppedSystems.push(`Web Scraping: ${stoppedCount} auto-posts stopped`);
        }

        // 1.5. Stop Smart Auto-Post Manager
        if (global.smartAutoPostManager) {
            await global.smartAutoPostManager.stop();
            stoppedSystems.push('Smart Auto-Post Manager: Stopped');
        }

        // 2. Stop all promotional campaigns
        if (client.autoPromo) {
            await client.autoPromo.emergencyStop();
            stoppedSystems.push('Promotional Campaigns: All stopped');
        }

        // 3. Stop system monitoring
        if (client.systemMonitor) {
            await client.systemMonitor.emergencyStop();
            stoppedSystems.push('System Monitor: Suspended');
        }

        // 4. Stop all cron jobs if available
        if (global.cronJobs) {
            let cronStopped = 0;
            for (const [name, job] of global.cronJobs.entries()) {
                job.stop();
                cronStopped++;
            }
            stoppedSystems.push(`Cron Jobs: ${cronStopped} scheduled tasks stopped`);
        }

        // 5. Clear all timeouts and intervals globally
        const highestTimeoutId = setTimeout(() => {}, 0);
        for (let i = 0; i < highestTimeoutId; i++) {
            clearTimeout(i);
            clearInterval(i);
        }
        stoppedSystems.push(`Cleared ${highestTimeoutId} timeout/interval handles`);

        // 6. Set emergency flag
        client.emergencyMode = true;
        client.emergencyStoppedAt = new Date();

        // 7. Force garbage collection if available
        if (global.gc) {
            global.gc();
            stoppedSystems.push('Forced garbage collection');
        }

        console.log('[EMERGENCY] All systems stopped by admin:', interaction.user.tag);

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🚨 EMERGENCY STOP EXECUTED')
            .setDescription('**All bot operations have been suspended!**\n\n' +
                '**Systems Stopped:**\n' +
                stoppedSystems.map(system => `✅ ${system}`).join('\n') + '\n\n' +
                '**Bot is now in emergency mode.**\n' +
                'Use `/emergencystop action:reinitialize` to restore operations.')
            .addFields(
                { name: '👤 Executed By', value: interaction.user.tag, inline: true },
                { name: '⏰ Time', value: new Date().toLocaleString(), inline: true },
                { name: '🆔 Guild', value: interaction.guild.name, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('[EMERGENCY] Error during emergency stop:', error);
        throw error;
    }
}

async function handleEmergencyStatus(interaction) {
    const client = interaction.client;
    
    const isEmergencyMode = client.emergencyMode || false;
    const stoppedAt = client.emergencyStoppedAt || null;
    
    // Get current system status
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // Check what systems are running
    const systemStatus = [];
    
    // Check auto web scraping
    if (client.autoWebScrapeSender) {
        const activeCount = client.autoWebScrapeSender.activeAutoPosts?.size || 0;
        systemStatus.push(`🌐 Web Scraping: ${activeCount} active`);
    }
    
    // Check Smart Auto-Post Manager
    if (global.smartAutoPostManager) {
        const smartStatus = global.smartAutoPostManager.getStatus();
        const smartState = smartStatus.isRunning ? `Running (${smartStatus.activeWebhooks} webhooks)` : 'Stopped';
        systemStatus.push(`🤖 Smart Auto-Post: ${smartState}`);
    }
    
    // Check promotional campaigns
    if (client.autoPromo) {
        const promoStatus = client.autoPromo.isRunning ? 'Running' : 'Stopped';
        systemStatus.push(`📢 Promotions: ${promoStatus}`);
    }
    
    // Check system monitor
    if (client.systemMonitor) {
        const monitorStatus = client.systemMonitor.isRunning ? 'Active' : 'Suspended';
        systemStatus.push(`📊 Monitor: ${monitorStatus}`);
    }

    const embed = new EmbedBuilder()
        .setColor(isEmergencyMode ? '#ff0000' : '#00ff00')
        .setTitle('🚨 Emergency System Status')
        .setDescription(isEmergencyMode ? 
            '**⚠️ BOT IS IN EMERGENCY MODE**' : 
            '**✅ Bot is operating normally**')
        .addFields(
            { 
                name: '🔄 Emergency Mode', 
                value: isEmergencyMode ? '🔴 ACTIVE' : '🟢 Inactive', 
                inline: true 
            },
            { 
                name: '💾 Memory Usage', 
                value: `${memUsageMB}MB`, 
                inline: true 
            },
            { 
                name: '⏰ Last Emergency Stop', 
                value: stoppedAt ? stoppedAt.toLocaleString() : 'Never', 
                inline: true 
            }
        );

    if (systemStatus.length > 0) {
        embed.addFields({
            name: '🖥️ System Status',
            value: systemStatus.join('\n'),
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleReinitialize(interaction, confirmation) {
    if (confirmation !== 'REINITIALIZE_CONFIRMED') {
        const embed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('🔄 System Reinitialize - Confirmation Required')
            .setDescription('**This will restart all bot systems.**\n\n' +
                '**What will be reinitialized:**\n' +
                '• Auto-posting systems\n' +
                '• Promotional campaigns\n' +
                '• System monitoring\n' +
                '• Database connections\n\n' +
                '**To proceed, use:**\n' +
                '`/emergencystop action:reinitialize confirmation:REINITIALIZE_CONFIRMED`')
            .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
    }

    const client = interaction.client;
    let reinitializedSystems = [];

    try {
        // 1. Clear emergency mode
        client.emergencyMode = false;
        client.emergencyStoppedAt = null;

        // 2. Reinitialize auto web scraping
        if (client.autoWebScrapeSender) {
            client.autoWebScrapeSender.clearEmergencyMode();
            await client.autoWebScrapeSender.start();
            reinitializedSystems.push('Web Scraping System');
        }

        // 2.5. Reinitialize Smart Auto-Post Manager
        if (global.smartAutoPostManager) {
            await global.smartAutoPostManager.restart();
            reinitializedSystems.push('Smart Auto-Post Manager');
        }

        // 3. Reinitialize promotional campaigns
        if (client.autoPromo) {
            client.autoPromo.clearEmergencyMode();
            await client.autoPromo.start();
            reinitializedSystems.push('Promotional Campaigns');
        }

        // 4. Reinitialize system monitoring
        if (client.systemMonitor) {
            client.systemMonitor.clearEmergencyMode();
            client.systemMonitor.startMonitoring();
            reinitializedSystems.push('System Monitor');
        }

        // 5. Restart cron jobs if available
        if (global.cronJobs) {
            let cronRestarted = 0;
            for (const [name, job] of global.cronJobs.entries()) {
                job.start();
                cronRestarted++;
            }
            reinitializedSystems.push(`Cron Jobs: ${cronRestarted} scheduled tasks restarted`);
        }

        console.log('[EMERGENCY] All systems reinitialized by admin:', interaction.user.tag);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🔄 SYSTEMS REINITIALIZED')
            .setDescription('**All bot operations have been restored!**\n\n' +
                '**Systems Reinitialized:**\n' +
                reinitializedSystems.map(system => `✅ ${system}`).join('\n') + '\n\n' +
                '**Bot is now operating normally.**')
            .addFields(
                { name: '👤 Executed By', value: interaction.user.tag, inline: true },
                { name: '⏰ Time', value: new Date().toLocaleString(), inline: true },
                { name: '🆔 Guild', value: interaction.guild.name, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('[EMERGENCY] Error during reinitialize:', error);
        throw error;
    }
}

async function handleClearCron(interaction, confirmation) {
    if (confirmation !== 'CLEAR_CRON_CONFIRMED') {
        const embed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('🕒 Clear Cron Jobs - Confirmation Required')
            .setDescription('**WARNING: This will stop ALL scheduled tasks!**\n\n' +
                '**Cron jobs that will be cleared:**\n' +
                '• Reddit auto-posting (every 3 minutes)\n' +
                '• Premium functions (hourly)\n' +
                '• Free functions (every 15 minutes)\n' +
                '• Botlist updates (every 3 hours)\n' +
                '• Other scheduled tasks\n\n' +
                '**Note:** This will NOT stop other bot operations like web scraping, promotions, or monitoring.\n\n' +
                '**To proceed, use:**\n' +
                '`/emergencystop action:clear-cron confirmation:CLEAR_CRON_CONFIRMED`')
            .addFields(
                { name: '💾 Memory Impact', value: 'This may help reduce memory usage from scheduled tasks', inline: true },
                { name: '🔄 Recovery', value: 'Use `/emergencystop action:reinitialize` to restart', inline: true }
            )
            .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
    }

    try {
        const client = interaction.client;
        const clearedCronJobs = [];

        // Clear cron jobs if available
        if (global.cronJobs && global.cronJobs.size > 0) {
            let cronCleared = 0;
            
            for (const [name, job] of global.cronJobs.entries()) {
                try {
                    if (job && typeof job.stop === 'function') {
                        job.stop();
                        cronCleared++;
                        clearedCronJobs.push(`🕒 ${name}`);
                        console.log(`[CRON-CLEAR] Stopped cron job: ${name}`);
                    } else {
                        console.log(`[CRON-CLEAR] Cron job ${name} does not have stop method`);
                        clearedCronJobs.push(`⚠️ ${name} (no stop method)`);
                    }
                } catch (error) {
                    console.error(`[CRON-CLEAR] Error stopping cron job ${name}:`, error);
                    clearedCronJobs.push(`⚠️ ${name} (error occurred)`);
                }
            }
            
            // Clear the global cronJobs map
            global.cronJobs.clear();
            console.log(`[CRON-CLEAR] Cleared ${cronCleared} cron jobs from memory`);
        } else {
            clearedCronJobs.push('ℹ️ No active cron jobs found');
        }

        // Force garbage collection to free memory
        if (global.gc) {
            global.gc();
            console.log('[CRON-CLEAR] Forced garbage collection');
        }

        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

        console.log('[CRON-CLEAR] All cron jobs cleared by admin:', interaction.user.tag);

        const embed = new EmbedBuilder()
            .setColor('#ff9500')
            .setTitle('🕒 CRON JOBS CLEARED')
            .setDescription('**All scheduled tasks have been stopped and cleared from memory!**\n\n' +
                '**Cleared Tasks:**\n' +
                clearedCronJobs.join('\n') + '\n\n' +
                '**Other systems remain operational:**\n' +
                '✅ Web scraping (Redgifs, X/Twitter)\n' +
                '✅ Promotional campaigns\n' +
                '✅ System monitoring\n' +
                '✅ Command processing')
            .addFields(
                { name: '👤 Executed By', value: interaction.user.tag, inline: true },
                { name: '💾 Memory Usage', value: `${memoryMB}MB`, inline: true },
                { name: '⏰ Time', value: new Date().toLocaleString(), inline: true }
            )
            .setFooter({ text: 'Use /emergencystop action:reinitialize to restart all systems' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('[CRON-CLEAR] Error during cron job clearing:', error);
        throw error;
    }
}
