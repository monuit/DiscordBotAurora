const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PrefetchedLink = require('../../settings/models/PrefetchedLink');
const axios = require('axios');

module.exports = {
    name: ['show-redgifs-upcoming'],
    description: 'Admin: Show upcoming prefetched Redgifs scheduled to be posted',
    run: async (interaction, client) => {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                const noPerm = new EmbedBuilder().setDescription('❌ Access denied — Administrator required').setColor('#ff0000');
                await interaction.reply({ embeds: [noPerm], flags: 64 });
                return;
            }

            await interaction.deferReply({ flags: 64 });

            // Fetch up to 10 upcoming redgifs (oldest first)
            const items = await PrefetchedLink.find({ source: 'redgifs' })
                .sort({ fetchedAt: 1 })
                .limit(10)
                .lean();

            if (!items || items.length === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setTitle('Prefetch: Redgifs — Upcoming')
                    .setDescription('✅ Prefetch queue is empty for Redgifs.')
                    .setColor('#00ff00');
                await interaction.editReply({ embeds: [emptyEmbed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('Prefetch: Redgifs — Upcoming')
                .setColor('#0099ff')
                .setDescription(`Showing ${items.length} prefetched Redgifs (oldest first).`);

            let desc = '';
            for (const it of items) {
                const title = it.title || 'Untitled';
                const cat = it.category || 'unknown';
                const when = it.fetchedAt ? new Date(it.fetchedAt).toLocaleString() : 'unknown';
                const url = it.url || 'No URL';
                desc += `**${title}** — ${cat}\nScheduled: ${when}\n<${url}>\n\n`;
            }

            embed.addFields({ name: 'Next items', value: desc.slice(0, 1024) });

            await interaction.editReply({ embeds: [embed] });

            // Also send compact summary to GUILD_LOGS webhook if available
            try {
                const webhook = process.env.GUILD_LOGS;
                if (webhook) {
                    const content = items.map(it => `${it.category}: ${it.url}`).join('\n');
                    await axios.post(webhook, { content: `Upcoming Redgifs Prefetch (${items.length}):\n\n${content}` }).catch(() => null);
                }
            } catch (e) { /* ignore webhook failures */ }

        } catch (err) {
            console.error('Error in show-redgifs-upcoming:', err);
            const errorEmbed = new EmbedBuilder().setDescription('❌ Failed to fetch upcoming prefetched Redgifs').setColor('#ff0000');
            try { await interaction.editReply({ embeds: [errorEmbed] }); } catch (e) { /* ignore */ }
        }
    }
};
