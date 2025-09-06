const { EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, SelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const get_res = require('../../Functions/reddit_cmd_subs/Celebrity');
const { defaultNSFW } = require("../../Functions/defaultNsfwEmbed");
const { safeRedditFetch, createRedditErrorEmbed } = require("../../Functions/redditHelper");
require("dotenv").config();

module.exports = {
    name: ["reddit", "celebrity"],
    description: "get random celebrity porn",
    run: async (interaction, client, user, language) => {
        await interaction.deferReply({ ephemeral: false });

        if (!interaction.channel.nsfw) {
            interaction.reply({ embeds: [defaultNSFW(interaction)] })
        } else {
            try {
                let rs = get_res();
                const redditData = await safeRedditFetch(rs, client);
                
                if (!redditData) {
                    return interaction.editReply({ 
                        embeds: [createRedditErrorEmbed(client)] 
                    });
                }

                const { subreddit, permalink, posturl, postimage, posttitle, postup, postcomments } = redditData;

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`reddit-celebrity`)
                            .setEmoji('<:remoji:1152729404145930281>')
                            .setStyle(ButtonStyle.Secondary)
                    )

                interaction.editReply({
                    content: `**[${rs}] • ${posttitle}**\n👍 ${postup} | 📝 ${postcomments}\n[⠀](${postimage})`,
                    components: [row]
                })
                
                const filter = i => i.customId === `reddit-celebrity`

                const collector = interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 60000 * 5
                });
                
                try {
                    collector.on('collect', async i => {
                        // Check if user has administrator permissions
                        if (!i.member.permissions.has('Administrator')) {
                            return i.reply({
                                content: '❌ Only administrators can request another one.',
                                ephemeral: true
                            });
                        }
                        try {
                            let rs = get_res();
                            const redditData = await safeRedditFetch(rs, client);
                            
                            if (!redditData) {
                                return i.update({ 
                                    embeds: [createRedditErrorEmbed(client)],
                                    components: []
                                });
                            }

                            const { subreddit, permalink, posturl, postimage, posttitle, postup, postcomments } = redditData;

                            await i.update({
                                content: `**[${rs}] • ${posttitle}**\n👍 ${postup} | 📝 ${postcomments}\n[⠀](${postimage})`,
                                components: [row],
                                fetchReply: true
                            })
                        } catch (collectError) {
                            console.error('[Reddit Celebrity] Error in collector:', collectError);
                            await i.update({ 
                                embeds: [createRedditErrorEmbed(client)],
                                components: []
                            }).catch(console.error);
                        }
                    });

                    collector.on('end', async (collected, reason) => {
                        if (reason === 'time') {
                            const disabledRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`reddit-celebrity`)
                                        .setEmoji('<:remoji:1152729404145930281>')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(true)
                                )

                            interaction.editReply({ components: [disabledRow] }).catch(console.error);
                        }
                    });
                } catch (e) {
                    console.error('[Reddit Celebrity] Collector error:', e);
                    interaction.editReply({
                        embeds: [createRedditErrorEmbed(client)]
                    }).catch(console.error);
                }

            } catch (err) {
                console.error('[Reddit Celebrity] Command error:', err);
                interaction.editReply({
                    embeds: [createRedditErrorEmbed(client)]
                }).catch(console.error);
            }
        }
    }
}
