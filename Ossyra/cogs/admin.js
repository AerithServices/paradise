const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

class AdminCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'admin';
        this.utils = client.cogs.get('utils');
        this.pendingSuggestions = new Map();
        this.ADMIN_SERVER_ID = config.ADMIN_SERVER_ID || config.GUILD_ID;
        this.speedupRequests = new Set();
        
        console.log(`loaded admin cog`);
    }
    
    get commands() {
        return [
            {
                name: 'h-bl',
                description: '(admin) bl some1',
                options: [
                    {
                        name: 'user',
                        description: 'who',
                        type: 6,
                        required: true
                    },
                    {
                        name: 'reason',
                        description: 'why ok',
                        type: 3,
                        required: false
                    }
                ]
            },
            {
                name: 'h-unbl',
                description: '(admin) unbl some1',
                options: [
                    {
                        name: 'user',
                        description: 'who',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'h-downtime',
                description: '(admin) downtime mode',
                options: [
                    {
                        name: 'enabled',
                        description: 'on or off',
                        type: 5,
                        required: true
                    },
                    {
                        name: 'reason',
                        description: 'ok',
                        type: 3,
                        required: false
                    }
                ]
            }
        ];
    }
    
    async executeCommand(interaction, command) {
        switch (command.name) {
            case 'h-bl':
                await this.handleBL(interaction, 
                    interaction.options.getUser('user'),
                    interaction.options.getString('reason')
                );
                break;
            case 'h-unbl':
                await this.handleUnBL(interaction, interaction.options.getUser('user'));
                break;
            case 'h-downtime':
                await this.handleDowntime(interaction, interaction.options.getBoolean('enabled'), interaction.options.getString('reason'));
                break;
        }
    }
    
    async isAdminInMainServer(userId) {
        try {
            const guild = await this.client.guilds.fetch(this.ADMIN_SERVER_ID);
            const member = await guild.members.fetch(userId);

            return member.permissions.has('Administrator');
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }
    
    async handleButton(interaction) {
        if (!interaction.isButton()) return false;
        
        console.log(`Button clicked: ${interaction.customId} by ${interaction.user.tag}`);
        
        const customId = interaction.customId;
        const [action, ...args] = customId.split('_');
        

        if (action === 'respond' && this.pendingSuggestions.has(args[0])) {
            await this.handleSuggestionResponse(interaction, args[0]);
            return true;
        }
        
        if (customId === 'maintenance_notify') {
            await this.handleMaintenanceNotify(interaction);
            return true;
        }
        
        if (customId === 'maintenance_unsubscribe') {
            await this.handleMaintenanceUnsubscribe(interaction);
            return true;
        }
        
        if (customId === 'maintenance_speedup') {
            await this.handleMaintenanceSpeedup(interaction);
            return true;
        }
        
        return false;
    }
    
    async handleModal(interaction) {
        if (!interaction.isModalSubmit()) return false;
        
        console.log(`Modal submitted: ${interaction.customId} by ${interaction.user.tag}`);
        
        const [action, ...args] = interaction.customId.split('_');

        if (action === 'responseModal' && this.pendingSuggestions.has(args[0])) {
            await this.handleSuggestionModalResponse(interaction, args[0]);
            return true;
        }
        
        return false;
    }
    
    async handleBL(interaction, user, reason) {
        try {
            const isAdmin = await this.isAdminInMainServer(interaction.user.id);
            if (!isAdmin) {
                return interaction.reply({ 
                    content: '**ACCESS DENIED** | You must be an administrator in the main server to blacklist users.', 
                    flags: MessageFlags.Ephemeral
                });
            }

            if (this.utils.isBlacklisted(user.id)) {
                return interaction.reply({ content: `${user} is already blacklisted.`, flags: MessageFlags.Ephemeral });
            }

            const safeReason = reason || 'No reason provided';
            
            this.utils.addToBlacklist(user.id);
            
            await interaction.reply({ 
                content: `**${user.tag}** has been blacklisted.\nReason: ${safeReason}`,
                flags: MessageFlags.Ephemeral
            });
            
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('You have been blacklisted')
                    .setDescription(`You have been blacklisted from using the bot.`)
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'Reason', value: safeReason, inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Appeal', value: 'Contact server staff if you believe this is a mistake.', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Ossyra Raiding Inc. - Trust us, with your raiding.' });
                
                await user.send({ embeds: [dmEmbed] }).catch(() => {
                    console.log(`Could not DM user ${user.tag} about blacklist`);
                });
            } catch (dmError) {
                console.error('Failed to send blacklist DM:', dmError);
            }
            
        } catch (error) {
            console.error('Error in handleBL:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An error occurred with blacklist command.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    }
    
    async handleUnBL(interaction, user) {
        try {
            const isAdmin = await this.isAdminInMainServer(interaction.user.id);
            if (!isAdmin) {
                return interaction.reply({ 
                    content: '**ACCESS DENIED** | You must be an administrator in the main server to unblacklist users.', 
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!this.utils.isBlacklisted(user.id)) {
                return interaction.reply({ content: `${user} is not blacklisted..?`, flags: MessageFlags.Ephemeral });
            }

            await interaction.reply({ 
                content: '. . .',
                flags: MessageFlags.Ephemeral
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));

            this.utils.removeFromBlacklist(user.id);
            
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('Blacklist Removed')
                    .setDescription(`Your blacklist has been removed. You can now use the bot again.`)
                    .setColor(0x00FF00)
                    .addFields(
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Note', value: 'Please follow the server rules to avoid future blacklists.', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Ossyra Raiding Inc. - Blacklist System' });
                
                await user.send({ embeds: [dmEmbed] }).catch(() => {
                    console.log(`Could not DM user ${user.tag} about unblacklist`);
                });
            } catch (dmError) {
                console.error('Failed to send unblacklist DM:', dmError);
            }


            
        } catch (error) {
            console.error('Error in handleUnBL:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An error occurred with unblacklist command.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    }
    async handleDowntime(interaction, enabled, reason = null) {
        try {
            const isAdmin = await this.isAdminInMainServer(interaction.user.id);
            if (!isAdmin) {
                return interaction.reply({
                    content: '**ACCESS DENIED** | You must be an administrator in the main server to manage downtime.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const fs = require('fs/promises');
            const path = require('path');
            const configPath = path.join(process.cwd(), 'data', 'maintenance.json');
            const notifyPath = path.join(process.cwd(), 'data', 'e.json');

            if (enabled) {
                const downtimeReason = reason || 'no reason provided';
                await fs.writeFile(configPath, JSON.stringify({
                    enabled: true,
                    startedAt: Date.now(),
                    startedBy: interaction.user.id,
                    reason: downtimeReason
                }, null, 2));

                this.client.maintenanceMode = true;
                this.speedupRequests.clear();

                await interaction.reply({
                    content: `Downtime mode **ENABLED**.\n**Reason:** ${downtimeReason}`,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                let oldData = {};
                try {
                    const existing = await fs.readFile(configPath, 'utf-8');
                    oldData = JSON.parse(existing);
                } catch {}

                await fs.writeFile(configPath, JSON.stringify({ enabled: false }, null, 2));
                this.client.maintenanceMode = false;
                this.speedupRequests.clear();

                try {
                    const notifyData = await fs.readFile(notifyPath, 'utf-8');
                    const notifyUsers = JSON.parse(notifyData);

                    const downtimeMinutes = oldData.startedAt
                        ? Math.floor((Date.now() - oldData.startedAt) / 60000)
                        : null;

                    const notifyEmbed = new EmbedBuilder()
                        .setTitle('✅ Ossyra is back online!')
                        .setDescription(`the bot is back online! thanks for your patience ${this.config.TT_YUMMY_EMOJI || ''}`)
                        .setColor(0x00FF00)
                        .addFields(
                            { name: 'downtime reason', value: oldData.reason || 'no reason provided', inline: false },
                            ...(downtimeMinutes !== null ? [{ name: 'was down for', value: `~${downtimeMinutes} min`, inline: true }] : [])
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Ossyra Raiding Inc.' });

                    let notifiedCount = 0;
                    let failedCount = 0;

                    for (const userId of notifyUsers) {
                        try {
                            const user = await this.client.users.fetch(userId);
                            await user.send({ embeds: [notifyEmbed] });
                            notifiedCount++;
                        } catch {
                            failedCount++;
                        }
                    }

                    await fs.writeFile(notifyPath, JSON.stringify([]));

                    await interaction.reply({
                        content: `Downtime mode **DISABLED**.\nNotified **${notifiedCount}** users (${failedCount} failed).`,
                        flags: MessageFlags.Ephemeral
                    });
                } catch {
                    await interaction.reply({
                        content: 'Downtime mode **DISABLED**.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } catch (error) {
            console.error('Error in handleDowntime:', error);
            await interaction.reply({
                content: 'an error occurred while managing downtime mode.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleMaintenanceNotify(interaction) {
        try {
            const fs = require('fs/promises');
            const path = require('path');
            const notifyPath = path.join(process.cwd(), 'data', 'e.json');

            let notifyUsers = [];
            try {
                const data = await fs.readFile(notifyPath, 'utf-8');
                notifyUsers = JSON.parse(data);
            } catch {
                notifyUsers = [];
            }

            const unsubBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('maintenance_unsubscribe')
                    .setLabel('unsubscribe')
                    .setStyle(ButtonStyle.Danger)
            );

            if (notifyUsers.includes(interaction.user.id)) {
                return interaction.reply({
                    content: `ur already subbed twin, we'll dm u when its up <:tt_yummy:1499929422705459240>`,
                    components: [unsubBtn],
                    flags: MessageFlags.Ephemeral
                });
            }

            notifyUsers.push(interaction.user.id);
            await fs.writeFile(notifyPath, JSON.stringify(notifyUsers, null, 2));

            await interaction.reply({
                content: `alr we'll dm u when its up <:tt_yummy:1499929422705459240>`,
                components: [unsubBtn],
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error in handleMaintenanceNotify:', error);
            await interaction.reply({
                content: 'errors 48 - subscribe failed. please try again later.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleMaintenanceUnsubscribe(interaction) {
        try {
            const fs = require('fs/promises');
            const path = require('path');
            const notifyPath = path.join(process.cwd(), 'data', 'e.json');

            let notifyUsers = [];
            try {
                const data = await fs.readFile(notifyPath, 'utf-8');
                notifyUsers = JSON.parse(data);
            } catch {
                notifyUsers = [];
            }

            if (!notifyUsers.includes(interaction.user.id)) {
                return interaction.reply({
                    content: "ur not subbed twin",
                    flags: MessageFlags.Ephemeral
                });
            }

            notifyUsers = notifyUsers.filter(id => id !== interaction.user.id);
            await fs.writeFile(notifyPath, JSON.stringify(notifyUsers, null, 2));

            await interaction.reply({
                content: `alr we wont dm u when its up <:tt_yummy:1499929422705459240>`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error in handleMaintenanceUnsubscribe:', error);
            await interaction.reply({
                content: 'errors 49 - unsubscribe failed. please try again later.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleMaintenanceSpeedup(interaction) {
        try {
            const ADMIN_ID = '1453833865893249116';

            if (this.speedupRequests.has(interaction.user.id)) {
                return interaction.reply({
                    content: `twin u already sent this 🥹`,
                    flags: MessageFlags.Ephemeral
                });
            }

            this.speedupRequests.add(interaction.user.id);

            try {
                const admin = await this.client.users.fetch(ADMIN_ID);
                await admin.send({
                    content: `**${interaction.user.tag} wants u to speed up, Empress Arko.**`
                });
            } catch {}

            await interaction.reply({
                content: `alr done twin we'll get it up soon 🥹✌🏻`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error in handleMaintenanceSpeedup:', error);
            await interaction.reply({
                content: 'failed to send speedup request. please try again later.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    }
}

module.exports = AdminCog;