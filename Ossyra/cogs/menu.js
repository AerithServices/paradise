const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ContainerBuilder, TextDisplayBuilder, SectionBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } = require('discord.js');

const BANNER_URL = 'https://cdn.discordapp.com/banners/1469429583857062028/6ab5e3351e13287b90c4ce73cb76c79e.webp?size=480';

class MenuCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'menu';
        
        this.utils = null;
        this.userInteractions = new Map();
    }
    
    setUtils(utils) {
        this.utils = utils;
    }

    /**
     * Get language-specific menu text and presets
     */
    getMenuText(language = 'english') {
        const texts = {
            english: {
                menuTitle: '## =-=-=-= Menu =-=-=-=',
                menuDescription: 'Choose what you want to do.\nButtons below control silly things',
                r4idButton: 'R4id',
                sendEmbedButton: 'Send Embed',
                completed: 'completed',
                cmdDisabledMsg: 'nice try bro...',
                presets: {
                    BODY: '# **NEWER, BIGGER, BRIGHTER**',
                    INVITE: '## Want bots like this? Get them for FREE!: discord.gg/3ABxTE6UDE',
                    VIDEO: '# TRUST US.',
                    GIF: '[whatev](https://i.postimg.cc/Z0zyn59H/ossyra.gif)'
                },
                embed: {
                    title: 'RAIDED LMAOOOOO',
                    description: '>>> **You\'ve been raided by ossyra**',
                    field1Name: 'GET FUCKING',
                    field1Value: 'OWNED',
                    field2Name: 'Date',
                    field3Name: 'want this bot bro?',
                    field3Value: '[Join Our Server](discord.gg/3ABxTE6UDE)'
                }
            },
            spanish: {
                menuTitle: '## =-=-=-= Menú =-=-=-=',
                menuDescription: 'Elige lo que quieres hacer.\nLos botones de abajo controlan cosas tontas',
                r4idButton: 'R4id',
                sendEmbedButton: 'Enviar Embed',
                completed: 'completado',
                cmdDisabledMsg: 'Buen intento hermano..',
                presets: {
                    BODY: '# **MÁS NUEVO, MÁS GRANDE, MÁS BRILLANTE**',
                    INVITE: '## ¿Quieres bots como este? ¡Consíguelos GRATIS!: discord.gg/3ABxTE6UDE',
                    VIDEO: '# CONFÍA EN NOSOTROS.',
                    GIF: '[whatev](https://i.postimg.cc/Z0zyn59H/ossyra.gif)'
                },
                embed: {
                    title: '¡RAIDEADO JAJAJAJAJA!',
                    description: '>>> **¡Has sido raideado por ossyra!**',
                    field1Name: 'FUISTE',
                    field1Value: 'DESTRUIDO',
                    field2Name: 'Fecha',
                    field3Name: '¿quieres este bot?',
                    field3Value: '[Únete a Nuestro Servidor](discord.gg/3ABxTE6UDE)'
                }
            }
        };
        return texts[language] || texts['english'];
    }
    
    get commands() {
        return [
            {
                name: 'a-menu',
                description: '(r4iding) UwU r4id'
            }
        ];
    }
    
    async executeCommand(interaction, command) {
        if (command.name === 'a-menu') {
            await this.handleMenu(interaction);
        }
    }
    
    async handleMenu(interaction) {
        try {
            this.userInteractions.set(interaction.user.id, interaction);
            setTimeout(() => this.userInteractions.delete(interaction.user.id), 900000);
            
            const menuText = this.getMenuText('english');
            
            const inMainGuild = await this.utils.isInMainGuild(interaction.user.id);
            if (!inMainGuild) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Access Denied')
                        .setDescription('You are **BLACKLISTED**.\nYou left **discord.gg/3ABxTE6UDE**.\n\n➡️ Rejoin to regain access.\n— arko')
                        .setColor(0xFF0000)],
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.guildId && interaction.guildId === this.config.GUILD_ID) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('Command Disabled')
                        .setDescription(menuText.cmdDisabledMsg)
                        .setColor(0xFF0000)],
                    flags: MessageFlags.Ephemeral
                });
            }

            if (this.utils.isBlacklisted(interaction.user.id)) {
                return interaction.reply({
                    embeds: [this.utils.getBlacklistEmbed()],
                    ephemeral: false
                });
            }

            let menuCount = this.utils.loadMenuCount();
            menuCount++;
            this.utils.saveMenuCount(menuCount);
            this.utils.sendMenuLog(interaction.user, menuCount).catch(console.error);

            const container = new ContainerBuilder()
                .setAccentColor(0x000000)
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(BANNER_URL)
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('spam')
                            .setLabel(menuText.r4idButton)
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('embed')
                            .setLabel(menuText.sendEmbedButton)
                            .setStyle(ButtonStyle.Primary)
                    )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Ossyra Raiding Inc. - Trust us, with your raiding.')
                );

            await interaction.reply({
                components: [container],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
        } catch (error) {
            console.error('Error in handleMenu:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while opening the menu.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    }
    
    async handleButton(interaction) {
        const customId = interaction.customId;
        
        if (['spam', 'embed'].includes(customId)) {
            await this.handleMenuButton(interaction, customId);
            return true;
        }
        
        return false;
    }
    
    async handleMenuButton(interaction, customId) {
        try {
            if (this.utils.isBlacklisted(interaction.user.id)) {
                return interaction.reply({ 
                    embeds: [this.utils.getBlacklistEmbed()],
                    ephemeral: false 
                });
            }

            const menuText = this.getMenuText('english');

            // Don't defer reply - we want to send non-ephemeral messages
            await interaction.deferUpdate();

            if (customId === 'spam') {
                const userText = this.utils.getUserConfig(interaction.user.id) || menuText.presets.BODY;
                const finalMessage = `${userText}\n\n${menuText.presets.INVITE}\n${menuText.presets.VIDEO}\n${menuText.presets.GIF}`;
                
                const appId = this.client.application?.id || this.client.user.id;
                const headers = { 'Content-Type': 'application/json' };
                const body = JSON.stringify({ content: finalMessage, allowed_mentions: { parse: ['everyone'] } });
                const promises = [];
                const originalInteraction = this.userInteractions.get(interaction.user.id);
                
                if (originalInteraction) {
                    const url = `https://discord.com/api/v10/webhooks/${appId}/${originalInteraction.token}`;
                    for (let i = 0; i < 5; i++) {
                        promises.push(fetch(url, { method: 'POST', headers, body }).catch(() => {}));
                    }
                }

                const btnUrl = `https://discord.com/api/v10/webhooks/${appId}/${interaction.token}`;
                for (let i = 0; i < 5; i++) {
                    promises.push(fetch(btnUrl, { method: 'POST', headers, body }).catch(() => {}));
                }

                Promise.allSettled(promises);
            } 
            else if (customId === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(menuText.embed.title)
                    .setDescription(menuText.embed.description)
                    .setColor(0x2B2D31)
                    .addFields(
                        { name: menuText.embed.field1Name, value: menuText.embed.field1Value, inline: true },
                        { name: menuText.embed.field2Name, value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), inline: true },
                        { name: menuText.embed.field3Name, value: menuText.embed.field3Value, inline: false }
                    )
                    .setThumbnail(this.config.OSSYRA_ICON);
                
                const appId = this.client.application?.id || this.client.user.id;
                const embedBody = JSON.stringify({ embeds: [embed.toJSON()] });
                const headers = { 'Content-Type': 'application/json' };
                const promises = [];
                const originalInteraction = this.userInteractions.get(interaction.user.id);
                
                if (originalInteraction) {
                    const url = `https://discord.com/api/v10/webhooks/${appId}/${originalInteraction.token}`;
                    for (let i = 0; i < 5; i++) {
                        promises.push(fetch(url, { method: 'POST', headers, body: embedBody }).catch(() => {}));
                    }
                }
                
                const btnUrl = `https://discord.com/api/v10/webhooks/${appId}/${interaction.token}`;
                for (let i = 0; i < 5; i++) {
                    promises.push(fetch(btnUrl, { method: 'POST', headers, body: embedBody }).catch(() => {}));
                }
                
                Promise.allSettled(promises);
            }
        } catch (error) {
            console.error('Error in menu button handler:', error);
        }
    }
}

module.exports = MenuCog;