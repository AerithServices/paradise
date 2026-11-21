const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');

class RaidCheckCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'raid';
        this.utils = null;
    }
    
    getRaidCheckText(language) {
        if (language === 'spanish') {
            return {
                niceTryNerd: 'qué intento nerd',
                testing: '`probando...`',
                serverRaidable: 'servidor raideable',
                failedMsg: 'fallido porque arko es un retardo.',
                customTemplate: '```/a-interaction-r4id use-custom:no template:[es] cebo para provocar ira```'
            };
        } else {
            return {
                niceTryNerd: 'nice try nerd',
                testing: '`testing...`',
                serverRaidable: 'Server r4idable',
                failedMsg: 'failed bc arko is a retard.',
                customTemplate: '```/a-interaction-r4id use-custom:no template:[en] quick raid```'
            };
        }
    }
    
    setUtils(utils) {
        this.utils = utils;
    }
    
    get commands() {
        return [
            {
                name: 'a-r4id-check',
                description: 'test if the server is raidable',
                integration_types: [0, 1],
                contexts: [0, 1, 2]
            }
        ];
    }
    
    async executeCommand(interaction, command) {
        if (command.name === 'a-r4id-check') {
            await this.handleRaidCheck(interaction);
        }
    }
    
    async handleRaidCheck(interaction) {
        try {
            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (err) {
                console.error('[RaidCheck] Error getting user language:', err);
            }
            
            const raidText = this.getRaidCheckText(userLanguage);
            
            if (interaction.guild?.id === this.config.GUILD_ID) {
                await interaction.reply({
                    content: raidText.niceTryNerd,
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            // Send initial reply
            await interaction.reply({
                content: raidText.testing,
                flags: [MessageFlags.Ephemeral]
            });

            // Test sending invite link
            let isRaidable = false;
            try {
                const testMsg = await interaction.followUp({
                    content: 'haii discord.gg/3ABxTE6UDE',
                    ephemeral: false,
                    fetchReply: true
                });
                
                // Check if message was actually sent (not ephemeral/blocked)
                isRaidable = !testMsg.flags?.has(MessageFlags.Ephemeral);
                
                // Delete test message
                await interaction.webhook.deleteMessage(testMsg.id).catch(() => {});
            } catch (error) {
                console.error('Test error:', error.message);
                isRaidable = false;
            }

            const thumbnailUrl = 'https://cdn.discordapp.com/banners/1469429583857062028/6ab5e3351e13287b90c4ce73cb76c79e.webp?size=480';

            // Create embed
            const resultEmbed = new EmbedBuilder()
                .setTitle(isRaidable ? raidText.serverRaidable : 'srv NOT r4idable')
                .setColor(isRaidable ? 0x57f287 : 0xed4245)
                .setImage(thumbnailUrl)
                .setDescription(raidText.customTemplate)
                .setFooter({ text: 'Ossyra Raiding Inc. — Trust us, with your raiding.' });

            // Send result with embed
            await interaction.followUp({
                embeds: [resultEmbed],
                flags: MessageFlags.Ephemeral
            });

            // Delete the testing message
            await interaction.deleteReply();

        } catch (error) {
            console.error('Error in handleRaidCheck:', error);
            
            // Get user's language for error message
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (err) {
                console.error('[RaidCheck] Error getting user language:', err);
            }
            
            const raidText = this.getRaidCheckText(userLanguage);
            
            try {
                if (!interaction.replied) {
                    await interaction.reply({
                        content: raidText.failedMsg,
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } catch {}
        }
    }
    
    async handleAutocomplete(interaction) {
        return false;
    }
}

module.exports = RaidCheckCog;