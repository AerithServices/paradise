const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType, 
    MessageFlags, 
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');

class GhostPingCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'ghostping';
        this.utils = null;
        this.FARM_BUTTONS_PER_ROW = 4;
        this.MAX_PINGS_PER_TOKEN = 8;
        this.FARM_DURATION = 600_000;
        this.BUTTON_TIMEOUT = 60_000;
        this.UPDATE_DELAY = 300;
        this.BLACKLISTED_GUILD = config.BLACKLISTED_GUILD_ID || config.GUILD_ID;
    }
    
    setUtils(utils) {
        this.utils = utils;
    }
    
    get commands() {
        const command = new SlashCommandBuilder()
            .setName('a-ghostping')
            .setDescription('(r4iding) ghost ping a faggot, role, or @everyone')
            .addUserOption(option =>
                option.setName('target')
                    .setDescription('the faggot to gp')
                    .setRequired(false))
            .addRoleOption(option =>
                option.setName('role')
                    .setDescription('the role to ghost ping')
                    .setRequired(false))
            .addBooleanOption(option =>
                option.setName('everyone')
                    .setDescription('ping @everyone instead of a user')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('text')
                    .setDescription('custom text to send with the ping')
                    .setRequired(false)
                    .setMaxLength(500))
            .addBooleanOption(option =>
                option.setName('farm')
                    .setDescription('farm buttons to fuck the fag up the ass')
                    .setRequired(false))
            .addBooleanOption(option =>
                option.setName('button')
                    .setDescription('button')
                    .setRequired(false))
            .addIntegerOption(option =>
                option.setName('pings')
                    .setDescription('how many times to ping (1-5)')
                    .setMinValue(1)
                    .setMaxValue(5)
                    .setRequired(false))
            .setIntegrationTypes(0, 1)
            .setContexts(0, 1, 2);

        return [command];
    }
    
    async executeCommand(interaction, command) {
        if (command.name === 'a-ghostping') {
            await this.handleGhostPing(interaction);
        }
    }
    
    isBlacklisted(interaction) {
        if (interaction.guild && interaction.guild.id === this.BLACKLISTED_GUILD) {
            return true;
        }
        return false;
    }
    
    async executeGhostPing(interactionContext, target, count, customText = null) {
        try {
            let content;
            let allowedMentions;

            if (target === '@everyone') {
                content = customText ? `@everyone ${customText}` : '@everyone';
                allowedMentions = { parse: ['everyone'] };
            } else if (target.mentionable !== undefined) {
                const mention = target.toString();
                content = customText ? `${mention} ${customText}` : mention;
                allowedMentions = { roles: [target.id] };
            } else {
                const mention = target.toString();
                content = customText ? `${mention} ${customText}` : mention;
                allowedMentions = { users: [target.id] };
            }

            const appId = interactionContext.applicationId;
            const webhookBase = `https://discord.com/api/v10/webhooks/${appId}/${interactionContext.token}`;
            const body = JSON.stringify({ content, allowed_mentions: allowedMentions });

            await Promise.allSettled(Array.from({ length: count }, () =>
                fetch(`${webhookBase}?wait=true`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body
                }).then(r => r.json()).then(msg => {
                    if (msg?.id) fetch(`${webhookBase}/messages/${msg.id}`, { method: 'DELETE' }).catch(() => {});
                }).catch(() => {})
            ));
            return true;
        } catch (error) {
            console.error('Ghost ping execution error:', error);
            return false;
        }
    }
    
    generateFarmPanel(state, target, pingCountPerToken, expires, customText = null) {
        const isAttackDisabled = state.tokens.length === 0 || state.attackStarted;
        const totalPings = state.tokens.length * pingCountPerToken;
        
        let targetDisplay = '';
        if (target === '@everyone') {
            targetDisplay = '@everyone';
        } else if (target.mentionable !== undefined) {
            targetDisplay = target.toString();
        } else {
            targetDisplay = target.toString();
        }
        
        let statsContent = '';
        if (state.msg) statsContent += `${state.msg}\n\n`;
        statsContent += `**target:** ${targetDisplay}\n`;
        statsContent += `**pings per token:** ${pingCountPerToken}\n`;
        statsContent += `**tokens added:** ${state.tokens.length}\n`;
        statsContent += `**total pings:** ${totalPings}\n`;
        statsContent += `expires: <t:${expires}:R>`;
        
        if (customText) {
            const truncated = customText.length > 40 ? customText.substring(0, 40) + '...' : customText;
            statsContent = `**message:** \`${truncated}\`\n\n` + statsContent;
        }
        
        if (state.attackStarted) {
            statsContent += `\n\n**ATTACKING...**`;
        }
        
        const container = new ContainerBuilder()
            .setAccentColor(state.attackStarted ? 0xFF4444 : 0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('## ghost ping panel'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(statsContent))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('gp_farm_1').setLabel('farm').setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted),
                    new ButtonBuilder().setCustomId('gp_farm_2').setLabel('farm').setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted),
                    new ButtonBuilder().setCustomId('gp_farm_3').setLabel('farm').setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted),
                    new ButtonBuilder().setCustomId('gp_farm_4').setLabel('farm').setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted)
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('gp_attack').setLabel('ATTACK').setStyle(ButtonStyle.Danger).setDisabled(isAttackDisabled)
                )
            )
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Ossyra Raiding Inc.'));
        
        return [container];
    }
    
    async handleFarmMode(interaction, target, customText = null) {
        const state = { 
            tokens: [], 
            attackStarted: false, 
            msg: null 
        };
        
        const expires = Math.floor((Date.now() + this.FARM_DURATION) / 1000);
        const pingCountPerToken = this.MAX_PINGS_PER_TOKEN;
        let pendingUpdate = false;
        let updateScheduled = false;
        let dirtyPanel = false;
        const scheduleUpdate = () => {
            if (updateScheduled || pendingUpdate) return;
            updateScheduled = true;
            setImmediate(() => {
                updateScheduled = false;
                if (pendingUpdate) return;
                pendingUpdate = true;
                dirtyPanel = false;
                interaction.editReply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: this.generateFarmPanel(state, target, pingCountPerToken, expires, customText)
                }).catch(() => {}).finally(() => {
                    pendingUpdate = false;
                    if (dirtyPanel) scheduleUpdate();
                });
            });
        };
        const fastUpdatePanel = () => { dirtyPanel = true; scheduleUpdate(); };

        const msg = await interaction.reply({ 
            components: this.generateFarmPanel(state, target, pingCountPerToken, expires, customText), 
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral], 
            fetchReply: true 
        });
        
        const collector = msg.createMessageComponentCollector({ 
            time: this.FARM_DURATION 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ 
                    content: 'not your panel.', 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
            
            state.msg = null;
            
            if (state.attackStarted) {
                return i.deferUpdate();
            }
            
            if (i.customId.startsWith('gp_farm')) {
                i.deferUpdate().catch(() => {});
                state.tokens.push(i);
                fastUpdatePanel();
            } else if (i.customId === 'gp_attack') {
                state.attackStarted = true;
                i.deferUpdate().catch(() => {});
                fastUpdatePanel();
                
                const promises = state.tokens.map(tokenInteraction => 
                    this.executeGhostPing(tokenInteraction, target, pingCountPerToken, customText)
                );
                
                await Promise.allSettled(promises);
                
                state.tokens = [];
                state.attackStarted = false;
                state.msg = 'attack complete, farm again if u want';
                fastUpdatePanel();
            }
        });

        collector.on('end', async () => {
            
            try { 
                const expiredContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('**Panel Expired**'))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('gp_expired')
                                .setLabel('EXPIRED')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        )
                    );
                
                await interaction.editReply({ 
                    flags: [MessageFlags.IsComponentsV2],
                    components: [expiredContainer] 
                }); 
            } catch {} 
        });
    }
    
    async handleButtonMode(interaction, target, customText = null) {
        const row = new ActionRowBuilder();
        
        for (let i = 1; i <= 5; i++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ghostping_${i}`)
                    .setLabel(`${i} × PING`)
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        let targetDisplay = '';
        if (target === '@everyone') {
            targetDisplay = '@everyone';
        } else if (target.mentionable !== undefined) {
            targetDisplay = target.toString();
        } else {
            targetDisplay = target.toString();
        }
        
        const content = customText 
            ? `**Ghost Ping Target:** ${targetDisplay}\n**Text:** ${customText}\nSelect the number of pings below:`
            : `**Ghost Ping Target:** ${targetDisplay}\nSelect the number of pings below:`;
        
        const response = await interaction.reply({ 
            content: content, 
            components: [row], 
            flags: [MessageFlags.Ephemeral] 
        });
        
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: this.BUTTON_TIMEOUT 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ 
                    content: `HOW DID U EVEN CLICK THESE WHAT`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
            
            await i.reply({ 
                content: '**ghost pinging the fag...**\n-# Command by rynzen', 
                flags: [MessageFlags.Ephemeral] 
            });
            
            const pings = parseInt(i.customId.split('_')[1], 10);
            const success = await this.executeGhostPing(i, target, pings, customText);
            
            if (success) {
                await i.editReply({ 
                    content: `**ghost pinged ${targetDisplay} ${pings} times**\n-# Command by rynzen` 
                });
            } else {
                await i.editReply({ 
                    content: '**couldnt del pings**\n-# Command by rynzen' 
                }).catch(() => {});
            }
            
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const disabledRow = new ActionRowBuilder();
                
                for (let i = 1; i <= 5; i++) {
                    disabledRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ghostping_expired_${i}`)
                            .setLabel(`${i} × PING`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                }
                
                await interaction.editReply({ 
                    content: `Buttons Expired, Rerun Cmd.`, 
                    components: [disabledRow] 
                }).catch(() => {});
            }
        });
    }
    
    async handleDirectMode(interaction, target, pingCount, customText = null) {
        await interaction.reply({ 
            content: '**ghost pinging the fag...**\n-# Command by rynzen', 
            flags: [MessageFlags.Ephemeral] 
        });
        
        const success = await this.executeGhostPing(interaction, target, pingCount, customText);
        
        if (success) {
            let targetDisplay = target === '@everyone' ? '@everyone' : target.toString();
            await interaction.editReply({ 
                content: `**ghost pinged ${targetDisplay} ${pingCount} times**\n-# Command by rynzen` 
            });
        } else {
            await interaction.editReply({ 
                content: '**couldnt del pings UwU**\n-# Command by rynzen' 
            }).catch(() => {});
        }
    }
    
    async handleGhostPing(interaction) {
        if (this.isBlacklisted(interaction)) {
            return interaction.reply({ 
                content: 'This command is disabled in this server.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const targetUser = interaction.options.getUser('target');
        const targetRole = interaction.options.getRole('role');
        const pingEveryone = interaction.options.getBoolean('everyone') || false;
        const customText = interaction.options.getString('text');
        const useFarm = interaction.options.getBoolean('farm') || false;
        const useButtons = interaction.options.getBoolean('button') || false;
        const pingCount = interaction.options.getInteger('pings') || 1;

        const targetOptions = [targetUser, targetRole, pingEveryone].filter(Boolean).length;

        if (targetOptions === 0) {
            return interaction.reply({ 
                content: 'You must specify either a target user, a role, or use @everyone.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (targetOptions > 1) {
            return interaction.reply({ 
                content: 'You cannot target multiple types. Choose ONE: user, role, or @everyone.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (targetRole) {
            const botMember = interaction.guild?.members.cache.get(this.client.user.id);
            if (botMember && !targetRole.mentionable && !botMember.permissions.has(PermissionFlagsBits.MentionEveryone)) {
                return interaction.reply({ 
                    content: `i dont have the perms to ping that role ${this.config.EXHAUSTED_EMOJI}`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }

        let optionCount = 0;
        if (interaction.options.getBoolean('farm') !== null) optionCount++;
        if (interaction.options.getBoolean('button') !== null) optionCount++;
        if (interaction.options.getInteger('pings') !== null) optionCount++;

        if (optionCount > 1) {
            return interaction.reply({ 
                content: 'ONE OPTION AT A TIME.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        let target;
        if (pingEveryone) {
            target = '@everyone';
        } else if (targetRole) {
            target = targetRole;
        } else {
            target = targetUser;
        }

        if (useFarm) {
            await this.handleFarmMode(interaction, target, customText);
        } else if (useButtons) {
            await this.handleButtonMode(interaction, target, customText);
        } else {
            await this.handleDirectMode(interaction, target, pingCount, customText);
        }
    }
    
    async handleAutocomplete(interaction) {
        return false;
    }
    
    async handleButton(interaction) {
        return false;
    }
}

module.exports = GhostPingCog;