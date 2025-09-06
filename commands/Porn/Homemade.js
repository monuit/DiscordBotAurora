const { EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, SelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { homemade_hotscop, homemade_pinporn, homemade_fiqfuq } = require("../../Functions/porn_cmd/requester")

module.exports = {
    name: ["homemade"],
    description: "get random homemade porn",
    run: async (interaction, client, user, language) => {
        // Temporarily disabled homemade_hotscop due to API returning 0 results
        const replies = [homemade_pinporn, homemade_fiqfuq];
        const reply = replies[Math.floor(Math.random() * replies.length)];
        await reply(interaction, client);
    }
}
