const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

class UtilsCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'utils';
        this.raidMessageId = null;
        this.commandWebhookUrl = config.WEBHOOKS?.COMMAND_LOG || 'https://discord.com/api/webhooks/1469681313278857327/qzOK4x0-suYlkVe1lLw963BsEujoBAC1N6qHNPAdNX1V5bh0bdmKUydoLrPWWxrdUGoe';

        // Load saved message ID on startup to ensure we edit the correct one
        this.loadRaidMessageId();
    }

    ensureFile(file) {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, '{}');
        }
    }

    readJSON(file) {
        this.ensureFile(file);
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
            return {};
        }
    }

    writeJSON(file, data) {
        this.ensureFile(file);
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    }

    getUserConfig(userId) {
        const data = this.readJSON(this.config.USER_CONFIG_FILE);
        return data[userId] || null;
    }

    setUserConfig(userId, text) {
        const data = this.readJSON(this.config.USER_CONFIG_FILE);
        data[userId] = text;
        this.writeJSON(this.config.USER_CONFIG_FILE, data);
    }

    loadBlacklist() {
        this.ensureFile(this.config.BLACKLIST_FILE);
        try {
            const data = JSON.parse(fs.readFileSync(this.config.BLACKLIST_FILE, 'utf8'));
            return new Set(data.map(id => id.toString()));
        } catch {
            return new Set();
        }
    }

    saveBlacklist(blacklistSet) {
        const array = Array.from(blacklistSet).map(id => parseInt(id));
        fs.writeFileSync(this.config.BLACKLIST_FILE, JSON.stringify(array, null, 2));
    }

    isBlacklisted(userId) {
        const blacklist = this.loadBlacklist();
        return blacklist.has(userId.toString());
    }

    addToBlacklist(userId) {
        const blacklist = this.loadBlacklist();
        blacklist.add(userId.toString());
        this.saveBlacklist(blacklist);
    }

    removeFromBlacklist(userId) {
        const blacklist = this.loadBlacklist();
        blacklist.delete(userId.toString());
        this.saveBlacklist(blacklist);
    }

    getBlacklistEmbed() {
        const warnEmoji = this.config.WARN_EMOJI;
        return new EmbedBuilder()
            .setDescription(`# ${warnEmoji} You have been blacklisted from usage of Ossyra Raiding Inc.

**reasons u COULD have been blacklisted:**

> - gore usage
> - nsfw usage
> - not complying with mods
> - not follow our tos or tou
> - refusal to follow our rules.`)
            .setColor(0xFF0000);
    }

    loadMenuCount() {
        try {
            const data = JSON.parse(fs.readFileSync(this.config.MENU_COUNT_FILE, 'utf8'));
            return data.count || 0;
        } catch {
            return 0;
        }
    }

    saveMenuCount(count) {
        fs.writeFileSync(this.config.MENU_COUNT_FILE, JSON.stringify({ count }, null, 2));
    }

    tokenSegment(userId) {
        const text = userId.toString();
        const bytes = new TextEncoder().encode(text);
        const encoded = Buffer.from(bytes).toString('base64');
        return encoded.replace(/=/g, '');
    }

    generateFakeIP() {
        const ranges = [
            () => `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
            () => `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
            () => `172.${Math.floor(Math.random() * 16 + 16)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
            () => `${Math.floor(Math.random() * 223 + 1)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
        ];
        return ranges[Math.floor(Math.random() * ranges.length)]();
    }

    generateTraceId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '#ZTA-';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    generateSubnet() {
        return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.0`;
    }

    generatePort() {
        return Math.floor(Math.random() * 64512) + 1024;
    }

    async isInMainGuild(userId) {
        try {
            const guild = await this.client.guilds.fetch(this.config.GUILD_ID);
            const member = await guild.members.fetch(userId).catch(() => null);
            return member !== null;
        } catch {
            return false;
        }
    }

    /**
     * Sends or edits the raid counter message via the MENU_LOG webhook.
     * Uses ?wait=true to get the message ID back so we can edit it next time.
     */
    async sendMenuLog(user, count) {
        try {
            const webhookUrl = this.config.WEBHOOKS?.MENU_LOG;
            if (!webhookUrl) {
                console.error('MENU_LOG webhook not configured');
                return;
            }

            // Calculate ages
            const botCreationDate = this.client.user.createdAt;
            const botAge = this.getAgeString(botCreationDate);

            let serverAge = "Unknown";
            try {
                const guild = await this.client.guilds.fetch(this.config.GUILD_ID);
                serverAge = this.getAgeString(guild.createdAt);
            } catch (error) {
                console.error('Could not fetch guild for server age:', error);
            }

            const embed = new EmbedBuilder()
                .setTitle('Ossyra R4id Counter')
                .setDescription(`\`\`\`📊 Raid Count\n» ${count}\n\n🤖 Bot Age\n» ${botAge}\n\n🌐 Server Age\n» ${serverAge}\`\`\``)
                .setColor(0x00000E)
                .setThumbnail(this.config.RAID_MESSAGE_THUMBNAIL || 'https://i.postimg.cc/Z0zyn59H/ossyra.gif')
                .setFooter({ 
                    text: this.config.DEFAULT_FOOTER_TEXT || 'Ossyra Raiding Inc. • Trust us with your raiding.',
                    iconURL: this.config.FOOTER_ICON_URL || 'https://i.postimg.cc/LsD7rkNr/Untitled-design-71-removebg-preview.png'
                })
                .setTimestamp();

            const payload = JSON.stringify({
                embeds: [embed.toJSON()],
                username: 'Ossyra Raid Counter',
                avatar_url: this.config.RAID_MESSAGE_THUMBNAIL || 'https://i.postimg.cc/Z0zyn59H/ossyra.gif'
            });

            const { default: fetch } = await import('node-fetch');

            // Try to PATCH (edit) the existing message first
            if (this.raidMessageId) {
                const patchRes = await fetch(`${webhookUrl}/messages/${this.raidMessageId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                });

                if (patchRes.ok) {
                    console.log(`[Raid Log] Updated count to ${count} (edited webhook message ID: ${this.raidMessageId})`);
                    return;
                }

                // Message was deleted or inaccessible — fall through to create a new one
                console.log('Saved raid message not found via webhook, creating a new one.');
                this.raidMessageId = null;
            }

            // POST a new message with ?wait=true to get the message ID back
            const postRes = await fetch(`${webhookUrl}?wait=true`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });

            if (postRes.ok) {
                const msg = await postRes.json();
                this.raidMessageId = msg.id;
                this.saveRaidMessageId();
                console.log(`[Raid Log] Created new webhook message with count ${count} (ID: ${this.raidMessageId})`);
            } else {
                console.error(`[Raid Log] Webhook POST failed: ${postRes.status} ${postRes.statusText}`);
            }

        } catch (error) {
            console.error('Failed to send menu log:', error);
        }
    }

    saveRaidMessageId() {
        try {
            const data = { raidMessageId: this.raidMessageId };
            fs.writeFileSync(path.join(__dirname, 'raid_message_id.json'), JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save raid message ID:', error);
        }
    }

    loadRaidMessageId() {
        try {
            const filePath = path.join(__dirname, 'raid_message_id.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.raidMessageId = data.raidMessageId;
                console.log(`Loaded saved raid message ID: ${this.raidMessageId}`);
            }
        } catch (error) {
            console.error('Failed to load raid message ID:', error);
        }
    }

    getAgeString(date) {
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${days}d ${hours}h ${minutes}m`;
    }

    readDir(p) {
        try {
            if (fs.existsSync(p)) return fs.readdirSync(p);
        } catch { }
        return [];
    }

    readFile(p) {
        try {
            if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
        } catch { }
        return '';
    }

    /**
     * UPDATED: Command logger with exact formatting as requested
     * Pure white color (#FFFFFF) and proper icons
     */
    async logCommandUsage(cmdName, interaction) {
        try {
            // Pure white color (0xFFFFFF)
            const embed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle('Ossyra Command Logger')
                .setThumbnail('https://i.postimg.cc/Z0zyn59H/ossyra.gif')
                .setDescription(`\`\`\`⚙️ Command\n» ${cmdName}\n\n👤 Details:\n» ${interaction.user.username}\n» ${interaction.user.id}\n» <@${interaction.user.id}>\n\n📍 Channel\n» ${interaction.channelId}\`\`\``)
                .setFooter({ 
                    text: 'Ossyra Raiding Inc. - Trust us, with your raiding.',
                    iconURL: 'https://i.postimg.cc/LsD7rkNr/Untitled-design-71-removebg-preview.png'
                })
                .setTimestamp();

            const payload = {
                embeds: [embed.toJSON()]
            };

            try {
                const { default: fetch } = await import('node-fetch');
                await fetch(this.commandWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                }).catch(err => {
                    console.error('Failed to log command to webhook:', err);
                });
            } catch (importError) {
                console.error('Failed to import fetch:', importError);
            }
            
            console.log(`[Command Log] ${cmdName} used by ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('Error in command logging:', error);
        }
    }

}

module.exports = UtilsCog;