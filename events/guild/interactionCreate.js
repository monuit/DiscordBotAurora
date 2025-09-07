const { PermissionsBitField, WebhookClient, EmbedBuilder } = require("discord.js");
const chalk = require('chalk');
const Premium = require("../../settings/models/Premium")
const AllowedChannels = require("../../settings/models/AllowedChannels");
const globalCooldown = require("../../utils/globalCommandCooldown");
const antiSpamSystem = require("../../utils/antiSpamSystem");
const logger = require("../../utils/jsonLogger");

module.exports = async (client, interaction) => {
  // Track interaction timing for latency measurement
  const interactionStart = Date.now();
  
  // Store timing information on the interaction object for commands to access
  interaction._botProcessingStart = interactionStart;

  // Check if interaction is too old (Discord interactions expire after 3 seconds)
  const interactionAge = Date.now() - interaction.createdTimestamp;
  if (interactionAge > 2000) { // More strict: 2 seconds instead of 2.5
    console.log(chalk.yellow(`[TIMING] Interaction for ${interaction.commandName || 'unknown'} is too old (${interactionAge}ms), skipping`));
    return;
  }

  // Handle button and select menu interactions first (they should be handled by collectors)
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    // These interactions are handled by their respective command collectors
    // No action needed here as the collectors handle the interactions
    return;
  }

  // Handle slash commands and other command interactions
  if (interaction.isCommand() || interaction.isContextMenuCommand() || interaction.isModalSubmit() || interaction.isChatInputCommand()) {
    if (!interaction.guild) return;

    try {
      // Check channel restrictions first (before any processing)
      // Exceptions: Always allow critical management commands for administrators
      const isManageChannelsCommand = interaction.commandName === 'manage' && 
                                     interaction.options?.getSubcommand?.() === 'channels';
      const isRemoveAutopostCommand = interaction.commandName === 'remove' && 
                                     interaction.options?.getSubcommand?.() === 'autopost';
      const isHelpCommand = interaction.commandName === 'help';
      const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
      const hasManageChannels = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
      
      const isCriticalCommand = (isManageChannelsCommand && isAdmin) || 
                               (isRemoveAutopostCommand && hasManageChannels) ||
                               isHelpCommand;
      
      if (!isCriticalCommand) {
        const isChannelAllowed = await checkChannelPermissions(interaction);
        if (!isChannelAllowed) {
          // Send ephemeral error message that doesn't get auto-deleted
          return interaction.reply({
            content: `🚫 **Commands not allowed in this channel**\n\nBot commands are restricted to specific channels in this server.\nContact an administrator to add this channel to the allowed list.\n\nUse \`/manage channels\` (Administrator only) to configure channel permissions.`,
            ephemeral: true
          });
        }
      }
      // Defer database operations to after command execution to improve response time
      const databaseOperations = Promise.all([
        client.createDatabase(interaction).catch(err => console.error('Database creation error:', err)),
        client.createPremium(interaction, interaction.client.premiums.get(interaction.user.id)).catch(err => console.error('Premium creation error:', err)),
        client.CreateGuildPremium(interaction, interaction.client.premiums.get(interaction.guild.id)).catch(err => console.error('Guild premium creation error:', err))
      ]).catch(err => console.error('Database operations failed:', err));

      // Don't await database operations to improve response time
      // They will run in the background

      let subCommandName = "";
      try {
        subCommandName = interaction.options.getSubcommand();
      } catch { };
      let subCommandGroupName = "";
      try {
        subCommandGroupName = interaction.options.getSubcommandGroup();
      } catch { };

      const command = client.slash.find(command => {
        switch (command.name.length) {
          case 1: return command.name[0] == interaction.commandName;
          case 2: return command.name[0] == interaction.commandName && command.name[1] == subCommandName;
          case 3: return command.name[0] == interaction.commandName && command.name[1] == subCommandGroupName && command.name[2] == subCommandName;
        }
      });

      if (!command) {
        return;
      }

      // Final check to ensure interaction is still valid before command execution
      if (!interaction.isRepliable()) {
        console.log(chalk.yellow(`[TIMING] Interaction for ${interaction.commandName} is no longer repliable before execution, skipping`));
        return;
      }

      const msg_cmd = [
        `${command.name[0]}`,
        `${command.name[1] || ""}`,
        `${command.name[2] || ""}`,
      ].filter(Boolean).join(" ");

      // JSON logging
      logger.command(msg_cmd, interaction.user.id, interaction.guild.id, {
        username: interaction.user.tag,
        guildName: interaction.guild.name,
        channelId: interaction.channel.id,
        channelName: interaction.channel.name
      });

      // Also keep console logging for immediate visibility
      console.log(chalk.bgRed(`[COMMAND] ${msg_cmd} used by ${interaction.user.tag} from ${interaction.guild.name} (${interaction.guild.id})`));

      // Optimized permission checks - check all at once
      const botPermissions = interaction.guild.members.me.permissions;
      const requiredPermissions = [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.UseExternalEmojis
      ];

      const missingPermissions = requiredPermissions.filter(perm => !botPermissions.has(perm));
      
      if (missingPermissions.length > 0) {
        const permNames = {
          [PermissionsBitField.Flags.SendMessages]: 'Send Messages',
          [PermissionsBitField.Flags.ViewChannel]: 'View Channels',
          [PermissionsBitField.Flags.EmbedLinks]: 'Embed Links',
          [PermissionsBitField.Flags.UseExternalEmojis]: 'Use External Emojis'
        };
        
        const missingNames = missingPermissions.map(perm => permNames[perm]).join(', ');
        return interaction.reply({
          content: `❌ I need these permissions: **${missingNames}**`,
          ephemeral: true
        });
      }

      // Check anti-spam system first
      const spamCheck = await antiSpamSystem.checkCommand(interaction.user.id, interaction.commandName, interaction);
      
      if (!spamCheck.allowed) {
        if (spamCheck.reason === 'muted') {
          return interaction.reply({
            content: `🔇 **You are temporarily muted!**\n\nYou've been detected spamming commands and are temporarily restricted.\n\n⏰ Time remaining: **${spamCheck.muteTime}s**\n\n*Please wait and try again later.*`,
            ephemeral: true
          });
        } else if (spamCheck.reason === 'spam_detected') {
          return interaction.reply({
            content: `🚫 **Spam detected!**\n\nYou have been temporarily muted for **${Math.ceil(spamCheck.muteTime/60)} minutes** due to:\n📊 ${spamCheck.spamReason}\n\n*Please use commands responsibly.*`,
            ephemeral: true
          });
        }
      }

      // Check global command cooldown - only one instance of each command type allowed
      // Skip cooldown for testmedia commands (testing purposes)
      if (interaction.commandName !== 'testmedia') {
        const canStart = globalCooldown.startCommand(
          interaction.commandName, 
          interaction.user.id, 
          interaction.guild.id
        );

        if (!canStart) {
          const activeCommand = globalCooldown.getActiveCommand(interaction.commandName);
          const waitingTime = activeCommand ? Math.ceil((30000 - (Date.now() - activeCommand.timestamp)) / 1000) : 30;
          
          return interaction.reply({
            content: `⏳ **Command in use!**\n\nSomeone is already using the \`/${interaction.commandName}\` command on this server.\n\n⏰ Please wait **${waitingTime}s** and try again.`,
            ephemeral: true
          });
        }
      }

      // Execute command directly with cooldown management
      try {
        await command.run(interaction, client, interaction.user, 'en');
      } catch (error) {
        // Log the error but don't let it break the cooldown system
        console.error(`[${interaction.commandName.toUpperCase()}] Command error:`, error);
      } finally {
        // Always mark command as complete, even if it failed (skip for testmedia)
        if (interaction.commandName !== 'testmedia') {
          globalCooldown.completeCommand(interaction.commandName, interaction.user.id);
        }
      }

      // Auto-delete only bot configuration/error responses after 30 seconds
      // Content commands (porn, reddit, etc.) should NOT be auto-deleted
      const isContentCommand = ['anal', 'asian', 'blowjob', 'boobs', 'cuckold', 'dildo', 'eboy', 'feet', 
                               'homemade', 'lesbian', 'milf', 'onlyfans', 'porn', 'search', 'tiktok',
                               'reddit', 'amateur', 'ass', 'bdsm', 'celebrity', 'cum', 'gonewild', 
                               'hentai', 'public', 'pussy', 'rule34', 'teens', 'thick',
                               'neko', '4k', 'paizuri', 'yaoi'].includes(interaction.commandName);

      if (!isContentCommand) {
        // Only auto-delete configuration and administrative responses
        setTimeout(async () => {
          try {
            if (interaction.replied || interaction.deferred) {
              // Give a small buffer for any ongoing editReply operations
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Get the bot's response message
              const responseMessage = await interaction.fetchReply().catch(() => null);
              if (responseMessage && responseMessage.deletable) {
                await responseMessage.delete().catch((error) => {
                  // Only log if it's not a common "Unknown Message" error
                  if (error.code !== 10008) { // 10008 = Unknown Message
                    console.log('[Cleanup] Could not delete message:', error.message);
                  }
                });
              }
            }
          } catch (error) {
            // Only log if it's not a common "Unknown Message" error
            if (error.code !== 10008) {
              console.log('[Cleanup] Could not delete message:', error.message);
            }
          }
        }, 30000);
      }

      // Log execution time
      const executionTime = Date.now() - interactionStart;
      if (executionTime > 3000) {
        console.log(chalk.yellow(`[SLOW] Command took ${executionTime}ms to execute`));
      }

    } catch (error) {
      // Don't log "Unknown interaction" errors as they're usually timing-related and not actual issues
      if (error.code === 10062 || error.message.includes('Unknown interaction')) {
        console.log(chalk.yellow(`[TIMING] Unknown interaction error for ${interaction.commandName} - interaction may have expired`));
        return; // Don't send webhook or user error for timing issues
      }
      
      console.error('Interaction execution error:', error);
      
      // Handle timeout specifically
      if (error.message === 'Command timeout') {
        console.log(chalk.red(`[TIMEOUT] Command ${interaction.commandName} timed out after 10 seconds`));
        
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "⏰ Command timed out. The bot may be experiencing high load. Please try again.",
              ephemeral: true
            });
          } else if (interaction.deferred) {
            await interaction.editReply({
              content: "⏰ Command timed out. The bot may be experiencing high load. Please try again.",
            });
          }
        } catch (replyError) {
          // Don't log if it's just an unknown interaction error
          if (replyError.code !== 10062) {
            console.error('Failed to send timeout message:', replyError);
          }
        }
        return;
      }

      // Send error webhook if configured (but skip timing-related errors)
      if (client.er_webhook && error.code !== 10062 && !error.message.includes('Unknown interaction')) {
        try {
          const web = new WebhookClient({ url: client.er_webhook });
          await web.send({
            content: `Interaction Error\n\nCommand: ${interaction.commandName}\nUser: ${interaction.user.tag}\nGuild: ${interaction.guild.name}\nError: ${error.message}`
          });
        } catch (webhookError) {
          console.error('Failed to send error webhook:', webhookError);
        }
      }

      // Send error response to user
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: `❌ Something went wrong while executing this command. Please try again later.`, 
            ephemeral: true 
          });
        } else if (interaction.deferred) {
          await interaction.editReply({ 
            content: `❌ Something went wrong while executing this command. Please try again later.`
          });
        }
      } catch (replyError) {
        // Don't log "Unknown interaction" errors as they're timing-related
        if (replyError.code !== 10062 && !replyError.message.includes('Unknown interaction')) {
          console.error('Failed to send error message to user:', replyError);
        }
      }
    }
  }
}

// Helper function to check if commands are allowed in the current channel
async function checkChannelPermissions(interaction) {
  try {
    // Check if there are any channel restrictions for this guild
    const allowedChannels = await AllowedChannels.find({
      guildId: interaction.guild.id,
      isActive: true
    });

    // If no restrictions are set, allow commands in all channels
    if (allowedChannels.length === 0) {
      return true;
    }

    // Check if current channel is in the allowed list
    const isAllowed = allowedChannels.some(
      allowedChannel => allowedChannel.channelId === interaction.channel.id
    );

    return isAllowed;
  } catch (error) {
    console.error('Error checking channel permissions:', error);
    // On error, allow the command to prevent blocking functionality
    return true;
  }
}