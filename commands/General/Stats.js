const { EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, PermissionsBitField, SelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
module.exports = {
    name: ["stats"],
    description: "check bot stats",
    run: async (interaction, client) => {

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages)) {
            return await
                interaction.editReply({
                    content: `${interaction.user.username} I need this permissions to do this commands here (check permissions in this channel)\n\nPermissions\n'Send Messages'`,
                    flags: 64
                })
        }
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewChannel)) {
            return await
                interaction.editReply({
                    content: `${interaction.user.username} I need this permissions to do this commands here (check permissions in this channel)\n\nPermissions\n'View Channels'`,
                    flags: 64
                })
        }

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.EmbedLinks)) {
            return await
                interaction.editReply({
                    content: `${interaction.user.username} I need this permissions to do this commands here (check permissions in this channel)\n\nPermissions\n'Embed Links'`,
                    flags: 64
                })
        }


        const embed = new EmbedBuilder()
            .setTitle('Aurora Stats')
            .setDescription(`Guilds Count: ${client.guilds.cache.size} | Shards Count: ${client.count} | This guild is on shard: #${client.id}`)
            //  .setImage(client.image)
            .setColor(client.color)
        return interaction.reply({
            embeds: [embed],
        })

    }
}
