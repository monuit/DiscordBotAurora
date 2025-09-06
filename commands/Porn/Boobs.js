const { EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, SelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { boobs_hotscop, boobs_pinporn, boobs_fiqfuq, boobs_xfollow } = require("../../Functions/porn_cmd/requester")

module.exports = {
    name: ["boobs"],
    description: "get random boobs porn video",
    run: async (interaction, client, user, language) => {
        try {
            const replies = [boobs_hotscop, boobs_pinporn, boobs_fiqfuq, boobs_xfollow];
            const reply = replies[Math.floor(Math.random() * replies.length)];
            await reply(interaction, client);
        } catch (error) {
            if (error.code === 10062 || error.code === 40060) {
                console.log(`[Boobs] Interaction timing issue: ${error.message || error.code}`);
                return;
            }
            console.error('[Boobs] Command error:', error);
        }
    }
}
