const { Client, GatewayIntentBits, Collection, MessageFlags, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class ExtendedClient extends Client {
    constructor(options) {
        super(options);
        this.commands = new Collection();
        this.cogs = new Collection();
        this.spamDataStore = new Map();
        this.interactionPanels = new Map();
        this.blacklist = new Set();
        
        this.verificationCache = new Map();
        this.VERIFICATION_CACHE_TTL = 5 * 60 * 1000;
        this.MAX_VERIFICATION_CACHE = 10000;
        
        this.memberCache = new Map();
        this.MEMBER_CACHE_TTL = 10 * 60 * 1000;
        this.MAX_MEMBER_CACHE = 50000;
        
        this.startCacheCleanup();
    }
    
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            
            for (const [key, entry] of this.verificationCache) {
                if (now > entry.expires) {
                    this.verificationCache.delete(key);
                }
            }
            
            for (const [key, entry] of this.memberCache) {
                if (now > entry.expires) {
                    this.memberCache.delete(key);
                }
            }
            
            if (this.verificationCache.size > this.MAX_VERIFICATION_CACHE) {
                const entriesToDelete = this.verificationCache.size - Math.floor(this.MAX_VERIFICATION_CACHE * 0.8);
                let deleted = 0;
                for (const key of this.verificationCache.keys()) {
                    this.verificationCache.delete(key);
                    if (++deleted >= entriesToDelete) break;
                }
            }
            
            if (this.memberCache.size > this.MAX_MEMBER_CACHE) {
                const entriesToDelete = this.memberCache.size - Math.floor(this.MAX_MEMBER_CACHE * 0.8);
                let deleted = 0;
                for (const key of this.memberCache.keys()) {
                    this.memberCache.delete(key);
                    if (++deleted >= entriesToDelete) break;
                }
            }
            
            if (global.gc) global.gc(false);
        }, 30000);
    }
}

const client = new ExtendedClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping
    ]
});

const CONFIG_PATH = path.join(__dirname, 'data', 'config.json');
const DEFAULT_CONFIG = {
    GUILD_ID: 'gid here',
    ADMIN_SERVER_ID: 'gid here',
    VERIFICATION_ROLE_ID: 'verified role id',
    BYPASS_ROLE_ID: 'bypass role id',
    AUTHORIZED_BL_USER_ID: 'authorized bl user id',
    IMAGE_ALERT_ROLE_ID: 'image alert role id',
    RAID_LOG_CHANNEL_ID: 'raid log channel id',
    ALERT_CHANNEL_ID: 'alert channel id',
    ALLOWED_LINK_ROLE_ID: 'allowed link role id',
    LEVEL_3_ROLE_ID: 'level 3 role id',
    ALLOWED_DISCORD_LINK: 'allowed discord link',
    LINK_APPROVAL_CHANNEL_ID: 'link approval channel id',
    LINK_INFO_CHANNEL_ID: 'link info channel id',
    WEBHOOKS: {
        MAIN: 'main webhook that can be used for everything',
        MENU_LOG: 'menu log webhook',
        SUGGESTION: 'suggestion webhook',
        IMAGE_DETECTION: 'image detection webhook',
        CUSTOM_MESSAGE_LOG: 'custom message log webhook',
        BLACKLIST_LOG: 'blacklist log webhook',
        COMMAND_LOG: 'command log webhook',
        GLOBAL_TEMPLATE_LOG: 'global template log webhook'
    },
    DEFAULT_TEAM_ICON: 'https://i.postimg.cc/13kyVR3Y/ossyra.gif',
    OSSYRA_ICON: 'https://i.postimg.cc/Z0zyn59H/ossyra.gif',
    RAID_MESSAGE_THUMBNAIL: 'https://i.postimg.cc/Z0zyn59H/ossyra.gif',
    FOOTER_ICON_URL: 'https://i.postimg.cc/LsD7rkNr/Untitled-design-71-removebg-preview.png',
    DEFAULT_FOOTER_TEXT: 'Ossyra Raiding Inc. • Trust us with your raiding.',
    TOKEN_FILE: 'token.json',
    USER_CONFIG_FILE: 'data/user_config.json',
    BLACKLIST_FILE: 'data/blacklist.json',
    MENU_COUNT_FILE: 'data/menu_count.json'
};

let CONFIG;
try {
    const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf8');
    CONFIG = JSON.parse(rawConfig);
} catch (error) {
    console.warn(`Could not load config from ${CONFIG_PATH}, using defaults.`, error.message);
    CONFIG = {};
}
CONFIG = {
    ...DEFAULT_CONFIG,
    ...CONFIG,
    WEBHOOKS: {
        ...DEFAULT_CONFIG.WEBHOOKS,
        ...(CONFIG.WEBHOOKS || {})
    }
};

const VERIFICATION_MESSAGE = 'Hi, sorry. but our verification was termed- meaning we lost 1.5k pullable members, so we ask u to verify to get the bot usage. This is a 1 time thing, and if u dont reverify then when we are termed we arent able to pull u into the next one, meaning youd lose ossyra bot forever.';

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory');
    
    const dataFiles = [
        { name: 'blacklist.json', content: '[]' },
        { name: 'teams.json', content: '{}' },
        { name: 'menu_count.json', content: '{"count": 0}' },
        { name: 'user_config.json', content: '{}' }
    ];
    
    for (const file of dataFiles) {
        fs.writeFileSync(path.join(dataDir, file.name), file.content);
        console.log(`Created ${file.name}`);
    }
}

function loadBlacklist() {
    try {
        const blacklistPath = path.join(__dirname, CONFIG.BLACKLIST_FILE);
        if (fs.existsSync(blacklistPath)) {
            const data = fs.readFileSync(blacklistPath, 'utf8');
            const blacklist = JSON.parse(data);
            client.blacklist = new Set(blacklist);
            console.log(`\x1b[37mLoaded blacklist with ${blacklist.length} users\x1b[0m`);
            return true;
        } else {
            console.log('\x1b[37mNo blacklist file found, starting with empty blacklist\x1b[0m');
            client.blacklist = new Set();
            return true;
        }
    } catch (error) {
        console.error('Failed to load blacklist:', error);
        client.blacklist = new Set();
        return false;
    }
}

function saveBlacklist() {
    try {
        const blacklistPath = path.join(__dirname, CONFIG.BLACKLIST_FILE);
        const blacklistArray = Array.from(client.blacklist);
        fs.writeFileSync(blacklistPath, JSON.stringify(blacklistArray, null, 2));
        console.log(`\x1b[37mSaved blacklist with ${blacklistArray.length} users\x1b[0m`);
        return true;
    } catch (error) {
        console.error('Failed to save blacklist:', error);
        return false;
    }
}

function isUserBlacklisted(userId) {
    return client.blacklist.has(userId);
}

function addToBlacklist(userId) {
    client.blacklist.add(userId);
    saveBlacklist();
    console.log(`\x1b[37mAdded ${userId} to blacklist\x1b[0m`);
}

function removeFromBlacklist(userId) {
    client.blacklist.delete(userId);
    saveBlacklist();
    console.log(`\x1b[37mRemoved ${userId} from blacklist\x1b[0m`);
}

async function checkVerificationRole(userId, guildId = CONFIG.GUILD_ID) {
    const cacheKey = `${userId}:${guildId}`;
    if (client.verificationCache.has(cacheKey)) {
        const cached = client.verificationCache.get(cacheKey);
        if (Date.now() < cached.expires) {
            return cached.result;
        } else {
            client.verificationCache.delete(cacheKey);
        }
    }
    try {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
            const result = { hasRole: false, reason: 'guild_not_found' };
            client.verificationCache.set(cacheKey, { result, expires: Date.now() + client.VERIFICATION_CACHE_TTL });
            return result;
        }

        const memberCacheKey = `${userId}:${guildId}`;
        let member = null;
        if (client.memberCache.has(memberCacheKey)) {
            const cached = client.memberCache.get(memberCacheKey);
            if (Date.now() < cached.expires) {
                member = cached.member;
            } else {
                client.memberCache.delete(memberCacheKey);
            }
        }

        if (!member) {
            member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
                client.memberCache.set(memberCacheKey, { member, expires: Date.now() + client.MEMBER_CACHE_TTL });
            }
        }

        if (!member) {
            const result = { hasRole: false, reason: 'not_in_guild' };
            client.verificationCache.set(cacheKey, { result, expires: Date.now() + client.VERIFICATION_CACHE_TTL });
            return result;
        }

        const hasRole = member.roles.cache.has(CONFIG.VERIFICATION_ROLE_ID);
        const result = { hasRole, reason: hasRole ? 'verified' : 'missing_role' };
        
        client.verificationCache.set(cacheKey, { result, expires: Date.now() + client.VERIFICATION_CACHE_TTL });
        return result;
    } catch (error) {
        console.error('Error checking verification role:', error);
        return {
            hasRole: false,
            reason: 'error'
        };
    }
}

async function sendVerificationMessage(interaction) {
    try {
        if (interaction.isAutocomplete()) {
            await interaction.respond([]).catch(() => {});
            return;
        }
        const method = (!interaction.replied && !interaction.deferred) ? 'reply' : 'followUp';
        await interaction[method]({
            content: VERIFICATION_MESSAGE,
            flags: MessageFlags.Ephemeral
        }).catch(() => {});
    } catch (error) {
        console.error('Error sending verification message:', error);
    }
}

async function loadCogs() {
    console.log('\x1b[37mLoading cogs...\x1b[0m');
    
    const cogsPath = path.join(__dirname, 'cogs');
    
    if (!fs.existsSync(cogsPath)) {
        fs.mkdirSync(cogsPath, { recursive: true });
        console.log('\x1b[37mCreated cogs directory\x1b[0m');
        return;
    }
    
    const cogFiles = fs.readdirSync(cogsPath).filter(file => file.endsWith('.js'));
    
    const loadOrder = ['utils.js', 'menu.js', 'raid.js', 'fun.js', 'admin.js', 'interaction-raid.js'];
    
    const orderedFiles = [];
    for (const file of loadOrder) {
        if (cogFiles.includes(file)) {
            orderedFiles.push(file);
        }
    }
    
    for (const file of cogFiles) {
        if (!orderedFiles.includes(file)) {
            orderedFiles.push(file);
        }
    }
    
    console.log(`\x1b[37mFound ${orderedFiles.length} cog files\x1b[0m`);
    
    for (const file of orderedFiles) {
        try {
            const cogPath = path.join(cogsPath, file);
            
            console.log(`\x1b[37mLoading cog: ${file}...\x1b[0m`);
            
            const cogModule = require(cogPath);
            const CogClass = cogModule.default || cogModule;
            
            let cog;
            if (typeof CogClass === 'function') {
                cog = new CogClass(client, CONFIG);
            } else {
                cog = CogClass;
            }
            
            if (cog && cog.name) {
                client.cogs.set(cog.name, cog);
                console.log(`\x1b[37mLoaded cog: ${cog.name}\x1b[0m`);
                if (cog.name !== 'utils') {
                    cog.utils = client.cogs.get('utils');
                    if (!cog.utils) {
                        console.warn(`\x1b[90mWarning: ${cog.name} requires utils but it's not loaded yet\x1b[0m`);
                    }
                }
            } else {
                console.warn(`\x1b[90mSkipping cog ${file}: Invalid structure\x1b[0m`);
            }
        } catch (error) {
            console.error(`\x1b[90mFailed to load cog ${file}: ${error.message}\x1b[0m`);
        }
    }
    
    console.log(`\x1b[37mAll cogs loaded. Total: ${client.cogs.size}\x1b[0m`);
}

function loadCommands() {
    console.log('\x1b[37mLoading commands from cogs...\x1b[0m');
    
    for (const [name, cog] of client.cogs) {
        if (cog.commands && Array.isArray(cog.commands)) {
            for (const command of cog.commands) {
                client.commands.set(command.name, {
                    ...command,
                    cog: cog
                });
                console.log(`\x1b[37mLoaded command: ${command.name} (from ${name})\x1b[0m`);
            }
        }
    }
    
    console.log(`\x1b[37mTotal commands loaded: ${client.commands.size}\x1b[0m`);
}

async function checkBlacklist(interaction) {
    const userId = interaction.user.id;
    
    if (isUserBlacklisted(userId)) {
        console.log(`\x1b[37mBlacklisted user ${interaction.user.tag} (${userId}) tried to use: ${interaction.type}\x1b[0m`);
        
        const warnEmoji = CONFIG.WARN_EMOJI;
        const blacklistEmbed = new (require('discord.js').EmbedBuilder)()
            .setDescription(`# ${warnEmoji} You have been blacklisted from usage of Ossyra Raiding Inc.

**reasons u COULD have been blacklisted:**

> - gore usage
> - nsfw usage
> - not complying with mods
> - not follow our tos or tou
> - refusal to follow our rules.`)
            .setColor(0xFF0000);
        
        if (interaction.isCommand()) {
            await interaction.reply({
                embeds: [blacklistEmbed],
                ephemeral: false
            }).catch(() => {});
        } else if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
            await interaction.reply({
                embeds: [blacklistEmbed],
                ephemeral: false
            }).catch(() => {});
        } else if (interaction.isAutocomplete()) {
            await interaction.respond([]).catch(() => {});
        }
        
        return true;
    }
    
    return false;
}

async function handleInteraction(interaction) {
    const isBlacklisted = await checkBlacklist(interaction);
    if (isBlacklisted) {
        return;
    }

    const ALLOWED_USER_ID = '1467343645786112142';
    const isMaintenanceInteraction =
        interaction.isButton() && ['maintenance_notify', 'maintenance_speedup', 'maintenance_unsubscribe'].includes(interaction.customId);
    try {
        const maintenancePath = path.join(__dirname, 'data', 'maintenance.json');
        if (fs.existsSync(maintenancePath)) {
            const maintenanceData = JSON.parse(fs.readFileSync(maintenancePath, 'utf8'));
            if (maintenanceData.enabled && interaction.user.id !== ALLOWED_USER_ID && !isMaintenanceInteraction) {
                const reason = maintenanceData.reason || 'no reason provided';
                const startedAt = maintenanceData.startedAt ? Math.floor(maintenanceData.startedAt / 1000) : null;

                let statsContent = `## ${CONFIG.WARN_EMOJI || '⚠️'} bot is under maintenance\n\n`;
                statsContent += `**reason:** ${reason}\n`;
                if (startedAt) statsContent += `**started:** <t:${startedAt}:R>\n`;
                statsContent += `\n*we'll be back asap. sorry for the inconvenience!*`;

                const container = new ContainerBuilder()
                    .setAccentColor(0xFFA500)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(statsContent))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('maintenance_notify')
                                .setLabel("notify me when it's up")
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('maintenance_speedup')
                                .setLabel('request speedup')
                                .setStyle(ButtonStyle.Secondary)
                        )
                    )
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Ossyra Raiding Inc.'));

                if (interaction.isCommand() || interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
                    await interaction.reply({
                        components: [container],
                        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                    }).catch(() => {});
                }
                return;
            }
        }
    } catch (error) {
        console.error('\x1b[90mError checking maintenance mode:\x1b[0m %O', error);
    }
    if (isMaintenanceInteraction) {
        for (const [name, cog] of client.cogs) {
            if (cog.handleButton && typeof cog.handleButton === 'function') {
                try {
                    const handled = await cog.handleButton(interaction);
                    if (handled) break;
                } catch (error) {
                    console.error(`\x1b[90mError in ${name} maintenance button handler:\x1b[0m %O`, error);
                }
            }
        }
        return;
    }
    try {
        let hasBypassRole = false;
        try {
            const mainGuild = await client.guilds.fetch(CONFIG.GUILD_ID).catch(() => null);
            if (mainGuild) {
                const mainMember = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
                hasBypassRole = mainMember?.roles.cache.has(CONFIG.BYPASS_ROLE_ID) || false;
            }
        } catch {}
        
        if (hasBypassRole) {
            console.log(`\x1b[37mUser ${interaction.user.tag} has bypass role - skipping verification\x1b[0m`);
        } else {
            const verificationCheck = await checkVerificationRole(interaction.user.id, CONFIG.GUILD_ID);
            if (!verificationCheck.hasRole) {
                console.log(`\x1b[37mUser ${interaction.user.tag} (${interaction.user.id}) tried to use ${interaction.isCommand() ? '/' + interaction.commandName : 'an interaction'} without verification role\x1b[0m`);
                
                await sendVerificationMessage(interaction);
                return; 
            }
        }
    } catch (error) {
        console.error('\x1b[90mError in verification check:\x1b[0m %O', error);
    }
    
    if (interaction.isCommand()) {
        const utilsCog = client.cogs.get('utils');
        if (utilsCog && typeof utilsCog.logCommandUsage === 'function') {
            utilsCog.logCommandUsage(interaction.commandName, interaction).catch(err => {
                console.error('\x1b[90mFailed to log command usage:\x1b[0m %O', err);
            });
        }
    }

    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.log(`\x1b[37mUnknown command: ${interaction.commandName}\x1b[0m`);
            return;
        }

        try {
            console.log(`\x1b[37mExecuting command: ${interaction.commandName} by ${interaction.user.tag}\x1b[0m`);
            
            if (command.cog && typeof command.cog.executeCommand === 'function') {
                await command.cog.executeCommand(interaction, command);
            } else if (command.execute && typeof command.execute === 'function') {
                await command.execute(interaction);
            } else {
                console.error(`\x1b[90mNo execute method found for command: ${interaction.commandName}\x1b[0m`);
                await interaction.reply({
                    content: 'This command is not properly configured.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        } catch (error) {
            console.error(`\x1b[90mError executing command ${interaction.commandName}:\x1b[0m %O`, error);
            
            const errorMessage = 'An error occurred while executing this command. Please try again.';
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: errorMessage,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            } else if (interaction.deferred) {
                await interaction.followUp({
                    content: errorMessage,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    } else if (interaction.isButton()) {
        for (const [name, cog] of client.cogs) {
            if (cog.handleButton && typeof cog.handleButton === 'function') {
                try {
                    const handled = await cog.handleButton(interaction);
                    if (handled) break;
                } catch (error) {
                    console.error(`\x1b[90mError in ${name} button handler:\x1b[0m %O`, error);
                }
            }
        }
    } else if (interaction.isModalSubmit()) {
        for (const [name, cog] of client.cogs) {
            if (cog.handleModal && typeof cog.handleModal === 'function') {
                try {
                    const handled = await cog.handleModal(interaction);
                    if (handled) break;
                } catch (error) {
                    console.error(`\x1b[90mError in ${name} modal handler:\x1b[0m %O`, error);
                }
            }
        }
    } else if (interaction.isAutocomplete()) {
        for (const [name, cog] of client.cogs) {
            if (cog.handleAutocomplete && typeof cog.handleAutocomplete === 'function') {
                try {
                    const handled = await cog.handleAutocomplete(interaction);
                    if (handled) break;
                } catch (error) {
                    console.error(`\x1b[90mError in ${name} autocomplete handler:\x1b[0m %O`, error);
                }
            }
        }
    } else if (interaction.isStringSelectMenu()) {
        for (const [name, cog] of client.cogs) {
            if (cog.handleSelectMenu && typeof cog.handleSelectMenu === 'function') {
                try {
                    const handled = await cog.handleSelectMenu(interaction);
                    if (handled) break;
                } catch (error) {
                    console.error(`\x1b[90mError in ${name} select menu handler:\x1b[0m %O`, error);
                }
            }
        }
    }
}

client.on('interactionCreate', handleInteraction);

client.once('ready', async () => {
    const gradientLine1 = `\x1b[30m+-------------------------------------------------------+\x1b[0m`;
    const gradientLine2 = `\x1b[30m .----------------.  \x1b[90m.----------------.  \x1b[37m.----------------.  \x1b[37m.----------------.  \x1b[90m.----------------.  \x1b[30m.----------------. \x1b[0m`;
    const gradientLine3 = `\x1b[30m| .--------------. || \x1b[90m.--------------. || \x1b[37m.--------------. || \x1b[37m.--------------. || \x1b[90m.--------------. || \x1b[30m.--------------. |\x1b[0m`;
    const gradientLine4 = `\x1b[30m| |     ____     | || \x1b[90m|    _______   | || \x1b[37m|    _______   | || \x1b[37m|  ____  ____  | || \x1b[90m|  _______     | || \x1b[30m|      __      | |\x1b[0m`;
    const gradientLine5 = `\x1b[30m| |   .'    \`.   | || \x1b[90m|   /  ___  |  | || \x1b[37m|   /  ___  |  | || \x1b[37m| |_  _||_  _| | || \x1b[90m| |_   __ \\    | || \x1b[30m|     /  \\     | |\x1b[0m`;
    const gradientLine6 = `\x1b[30m| |  /  .--.  \\  | || \x1b[90m|  |  (__ \\_|  | || \x1b[37m|  |  (__ \\_|  | || \x1b[37m|   \\ \\  / /   | || \x1b[90m|   | |__) |   | || \x1b[30m|    / /\\ \\    | |\x1b[0m`;
    const gradientLine7 = `\x1b[30m| |  | |    | |  | || \x1b[90m|   '.___\`-.   | || \x1b[37m|   '.___\`-.   | || \x1b[37m|    \\ \\/ /    | || \x1b[90m|   |  __ /    | || \x1b[30m|   / ____ \\   | |\x1b[0m`;
    const gradientLine8 = `\x1b[30m| |  \\  \`--'  /  | || \x1b[90m|  |\`\\____) |  | || \x1b[37m|  |\`\\____) |  | || \x1b[37m|    _|  |_    | || \x1b[90m|  _| |  \\ \\_  | || \x1b[30m| _/ /    \\ \\_ | |\x1b[0m`;
    const gradientLine9 = `\x1b[30m| |   \`.____.'   | || \x1b[90m|  |_______.'  | || \x1b[37m|  |_______.'  | || \x1b[37m|   |______|   | || \x1b[90m| |____| |___| | || \x1b[30m||____|  |____|| |\x1b[0m`;
    const gradientLine10 = `\x1b[30m| |              | || \x1b[90m|              | || \x1b[37m|              | || \x1b[37m|              | || \x1b[90m|              | || \x1b[30m|              | |\x1b[0m`;
    const gradientLine11 = `\x1b[30m| '--------------' || \x1b[90m'--------------' || \x1b[37m'--------------' || \x1b[37m'--------------' || \x1b[90m'--------------' || \x1b[30m'--------------' |\x1b[0m`;
    const gradientLine12 = `\x1b[30m '----------------'  \x1b[90m'----------------'  \x1b[37m'----------------'  \x1b[37m'----------------'  \x1b[90m'----------------'  \x1b[30m'----------------' \x1b[0m`;
    const gradientLine13 = `\x1b[30m+-------------------------------------------------------+\x1b[0m`;
    const brandLine1 = `\x1b[30m|    OSSYRA RAIDING INC.                                |\x1b[0m`;
    const brandLine2 = `\x1b[30m|         "Trust us, with your raiding."                |\x1b[0m`;
    const gradientLine14 = `\x1b[30m+-------------------------------------------------------+\x1b[0m`;
    
    console.log(`
${gradientLine1}
${gradientLine2}
${gradientLine3}
${gradientLine4}
${gradientLine5}
${gradientLine6}
${gradientLine7}
${gradientLine8}
${gradientLine9}
${gradientLine10}
${gradientLine11}
${gradientLine12}
${gradientLine13}
${brandLine1}
${brandLine2}
${gradientLine14}
    `);
    
    console.log(`\x1b[37mLogged in as ${client.user.tag}\x1b[0m`);
    loadBlacklist();
    try {
        const maintenancePath = path.join(__dirname, 'data', 'maintenance.json');
        const maintenanceData = JSON.parse(fs.readFileSync(maintenancePath, 'utf8'));
        if (maintenanceData.enabled) {
            client.maintenanceMode = true;
            console.log('\x1b[37mMaintenance mode loaded from file: ENABLED\x1b[0m');
        } else {
            client.maintenanceMode = false;
            console.log('\x1b[37mMaintenance mode loaded from file: DISABLED\x1b[0m');
        }
    } catch (e) {
        client.maintenanceMode = false;
        console.log('\x1b[37mNo maintenance file found or error reading it, defaulting to disabled\x1b[0m');
    }
    
    await loadCogs();
    loadCommands();
    try {
        const tokenPath = path.join(__dirname, CONFIG.TOKEN_FILE);
        const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        const token = tokenData.TOKEN;
        
        const { REST, Routes } = require('discord.js');
        const rest = new REST({ version: '10' }).setToken(token);
        
        console.log('\x1b[37mRegistering commands with Discord...\x1b[0m');
        
        const commands = Array.from(client.commands.values()).map(cmd => ({
            name: cmd.name,
            description: cmd.description || 'No description',
            options: cmd.options || [],
            integration_types: cmd.integration_types || [0, 1],
            contexts: cmd.contexts || [0, 1, 2]
        }));
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        
        console.log(`\x1b[37mSuccessfully registered ${commands.length} commands!\x1b[0m`);
        console.log('\x1b[37mOssyra Raiding Inc. - Trust us, with your raiding.\x1b[0m');
        client.user.setActivity('/menu | Raiding servers', { type: 'PLAYING' });
        try {
            const startupChannel = await client.channels.fetch('1469429589137690728');
            if (startupChannel) await startupChannel.send('.');
        } catch (e) {
            console.error('Failed to send startup message:', e.message);
        }
        
    } catch (error) {
        console.error('\x1b[90mFailed to register commands:\x1b[0m %O', error);
    }
});

process.on('uncaughtException', (error) => {
    console.error('\x1b[90mUncaught Exception: %O\x1b[0m', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\x1b[90mUnhandled Rejection at: %O reason: %O\x1b[0m', promise, reason);
});

client.on('error', (error) => {
    console.error('\x1b[90mDiscord Client Error: %O\x1b[0m', error);
});

client.on('warn', (warning) => {
    console.warn('\x1b[90mDiscord Client Warning: %O\x1b[0m', warning);
});

async function startBot() {
    try {
        const tokenPath = path.join(__dirname, CONFIG.TOKEN_FILE);
        const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        const token = tokenData.TOKEN;
        if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
            console.error('\x1b[90mPlease update the token in token.json with your actual bot token.\x1b[0m');
            console.log('\x1b[90mToken file should contain:\x1b[0m');
            console.log('\x1b[90m{ "TOKEN": "YOUR_ACTUAL_BOT_TOKEN" }\x1b[0m');
            process.exit(1);
        }
        
        console.log('\x1b[37mLogging in with bot token...\x1b[0m');
        await client.login(token);
        
    } catch (error) {
        console.error('\x1b[90mFailed to start bot:\x1b[0m %O', error);
        console.log('\x1b[90mMake sure:\x1b[0m');
        console.log('\x1b[90m1. token.json exists and contains a valid bot token\x1b[0m');
        console.log('\x1b[90m2. The bot has been invited to your server with proper permissions\x1b[0m');
        console.log('\x1b[90m3. You have a stable internet connection\x1b[0m');
        process.exit(1);
    }
}

module.exports = { isUserBlacklisted, addToBlacklist, removeFromBlacklist };

startBot();