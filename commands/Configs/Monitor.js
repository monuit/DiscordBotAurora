const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'monitor',
    data: new SlashCommandBuilder()
        .setName('monitor')
        .setDescription('System monitoring controls and status')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current system monitoring status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('thresholds')
                .setDescription('View or update monitoring thresholds')
                .addIntegerOption(option =>
                    option.setName('cpu')
                        .setDescription('CPU usage threshold percentage (1-100)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('memory')
                        .setDescription('Memory usage threshold percentage (1-100)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('db_latency')
                        .setDescription('Database latency threshold in milliseconds')
                        .setMinValue(1)
                        .setMaxValue(5000)
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('network_latency')
                        .setDescription('Network latency threshold in milliseconds')
                        .setMinValue(1)
                        .setMaxValue(2000)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the alert channel for monitoring notifications')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send monitoring alerts to')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Send a test monitoring alert')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        // Check if system monitor is available
        if (!client.systemMonitor) {
            return interaction.reply({
                content: '❌ System monitor is not initialized.',
                ephemeral: true
            });
        }

        try {
            switch (subcommand) {
                case 'status':
                    await handleStatus(interaction, client);
                    break;
                case 'thresholds':
                    await handleThresholds(interaction, client);
                    break;
                case 'channel':
                    await handleChannel(interaction, client);
                    break;
                case 'test':
                    await handleTest(interaction, client);
                    break;
            }
        } catch (error) {
            console.error('[Monitor Command] Error:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while executing the monitoring command.',
                    ephemeral: true
                });
            }
        }
    }
};

async function handleStatus(interaction, client) {
    try {
        const status = await client.systemMonitor.getStatus();
        
        const embed = new EmbedBuilder()
            .setTitle('📊 System Monitoring Status')
            .setDescription('Current system metrics and thresholds')
            .setColor('#00ff00')
            .addFields([
                {
                    name: '🔥 CPU Usage',
                    value: `Current: ${status.cpu.current.toFixed(1)}%\nThreshold: ${status.cpu.threshold}%\nStatus: ${getStatusEmoji(status.cpu.status)} ${status.cpu.status}`,
                    inline: true
                },
                {
                    name: '💾 Memory Usage',
                    value: `Current: ${status.memory.current.toFixed(1)}%\nThreshold: ${status.memory.threshold}%\nStatus: ${getStatusEmoji(status.memory.status)} ${status.memory.status}`,
                    inline: true
                },
                {
                    name: '🗄️ Database Latency',
                    value: `Current: ${status.database.latency.toFixed(1)}ms\nThreshold: ${status.database.threshold}ms\nStatus: ${getStatusEmoji(status.database.status)} ${status.database.status}`,
                    inline: true
                },
                {
                    name: '🌐 Network Latency',
                    value: `Current: ${status.network.latency}ms\nThreshold: ${status.network.threshold}ms\nStatus: ${getStatusEmoji(status.network.status)} ${status.network.status}`,
                    inline: true
                },
                {
                    name: '📡 Alert Channel',
                    value: `<#${client.systemMonitor.alertChannelId}>`,
                    inline: true
                },
                {
                    name: '⏰ Monitoring Info',
                    value: `Check Interval: 30 seconds\nAlert Cooldown: 5 minutes\nHistory: Last 100 readings`,
                    inline: true
                }
            ])
            .setTimestamp()
            .setFooter({ text: 'Aurora System Monitor' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        await interaction.reply({
            content: '❌ Failed to get system status: ' + error.message,
            ephemeral: true
        });
    }
}

async function handleThresholds(interaction, client) {
    const cpu = interaction.options.getInteger('cpu');
    const memory = interaction.options.getInteger('memory');
    const dbLatency = interaction.options.getInteger('db_latency');
    const networkLatency = interaction.options.getInteger('network_latency');

    // If no options provided, show current thresholds
    if (!cpu && !memory && !dbLatency && !networkLatency) {
        const currentThresholds = client.systemMonitor.thresholds;
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Current Monitoring Thresholds')
            .setDescription('Current alert thresholds for system monitoring')
            .setColor('#ffa500')
            .addFields([
                {
                    name: '🔥 CPU Usage',
                    value: `${currentThresholds.cpu}%`,
                    inline: true
                },
                {
                    name: '💾 Memory Usage',
                    value: `${currentThresholds.memory}%`,
                    inline: true
                },
                {
                    name: '🗄️ Database Latency',
                    value: `${currentThresholds.dbLatency}ms`,
                    inline: true
                },
                {
                    name: '🌐 Network Latency',
                    value: `${currentThresholds.networkLatency}ms`,
                    inline: true
                }
            ])
            .setFooter({ text: 'Use the options to update specific thresholds' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Update thresholds
    const updates = {};
    if (cpu) updates.cpu = cpu;
    if (memory) updates.memory = memory;
    if (dbLatency) updates.dbLatency = dbLatency;
    if (networkLatency) updates.networkLatency = networkLatency;

    client.systemMonitor.updateThresholds(updates);

    const updatedFields = Object.entries(updates).map(([key, value]) => {
        const displayNames = {
            cpu: '🔥 CPU Usage',
            memory: '💾 Memory Usage',
            dbLatency: '🗄️ Database Latency',
            networkLatency: '🌐 Network Latency'
        };
        const units = key.includes('Latency') ? 'ms' : '%';
        return `${displayNames[key]}: ${value}${units}`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setTitle('✅ Thresholds Updated')
        .setDescription(`The following monitoring thresholds have been updated:\n\n${updatedFields}`)
        .setColor('#00ff00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleChannel(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    
    if (!channel.isTextBased()) {
        return interaction.reply({
            content: '❌ Please select a text channel for monitoring alerts.',
            ephemeral: true
        });
    }

    client.systemMonitor.setAlertChannel(channel.id);

    const embed = new EmbedBuilder()
        .setTitle('✅ Alert Channel Updated')
        .setDescription(`Monitoring alerts will now be sent to ${channel}`)
        .setColor('#00ff00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTest(interaction, client) {
    try {
        const testChannel = await client.channels.fetch(client.systemMonitor.alertChannelId);
        
        const embed = new EmbedBuilder()
            .setTitle('🧪 TEST: System Monitor Test Alert')
            .setDescription('This is a test alert to verify the monitoring system is working correctly.')
            .setColor('#00bfff')
            .addFields([
                {
                    name: '📊 Test Metric',
                    value: 'System Monitor Test',
                    inline: true
                },
                {
                    name: '⚠️ Threshold',
                    value: 'Test Threshold',
                    inline: true
                },
                {
                    name: '🆔 Bot Info',
                    value: `${client.user.tag}\nShard: ${client.shard?.ids?.[0] ?? 0}`,
                    inline: true
                }
            ])
            .setTimestamp()
            .setFooter({ text: 'Aurora System Monitor - Test Alert' });

        await testChannel.send({ embeds: [embed] });

        await interaction.reply({
            content: `✅ Test alert sent to ${testChannel}`,
            ephemeral: true
        });
    } catch (error) {
        await interaction.reply({
            content: '❌ Failed to send test alert: ' + error.message,
            ephemeral: true
        });
    }
}

function getStatusEmoji(status) {
    switch (status) {
        case 'OK': return '✅';
        case 'WARNING': return '⚠️';
        case 'CRITICAL': return '❌';
        default: return '❓';
    }
}
