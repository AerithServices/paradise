const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

class FunCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'fun';
        this.utils = client.cogs?.get('utils');

        this.adPath = path.join(__dirname, 'ad.txt');
        
        this.restrictedUsers = new Set([
            '1467343645786112142',
            '1339362764371656767', 
            '1453726557230076057'
        ]);

        // Webhook URLs
        this.imageDetectionWebhook = config.WEBHOOKS?.IMAGE_DETECTION || 'https://discord.com/api/webhooks/1483484930012090451/mkgy_2w597wYG-pynRCWXQurTkPKo8ci9Jis2TXHR4MrEQO5cl5RaMEfY0DHmC_QJawZ';
        this.customMessageLogWebhook = config.WEBHOOKS?.CUSTOM_MESSAGE_LOG || 'https://discord.com/api/webhooks/1469769348989194334/HRVdbwluwhKKzxwmYfoom237spccDeQ3DAaTCKA0YDClAMwnhaKiNyT26_y3Y96S_HTz';
    }
    
    get commands() {
        return [
            {
                name: 'f-ip',
                description: '(fun) generate a >>fake<< IP to scare some1',
                options: [
                    {
                        name: 'user',
                        description: 'User to target',
                        type: 6,
                        required: false
                    }
                ]
            },
            {
                name: 'f-hijack',
                description: '(fun) fake session hijack effect',
                options: [
                    {
                        name: 'user',
                        description: 'User to target',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'f-femboyify',
                description: '(fun) transform a user into a femboy.',
                options: [
                    {
                        name: 'user',
                        description: 'User to transform',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'f-furryify',
                description: '(fun) transform a user into a furry.',
                options: [
                    {
                        name: 'user',
                        description: 'User to transform',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'f-ban',
                description: '(fun) FAKE ban someone',
                options: [
                    {
                        name: 'user',
                        description: 'User to ban',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'f-kick',
                description: '(fun) FAKE kick someone',
                options: [
                    {
                        name: 'user',
                        description: 'User to kick',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'f-rep',
                description: '(fun) rep a user',
                options: [
                    {
                        name: 'user',
                        description: 'User to rep',
                        type: 6,
                        required: true
                    }
                ]
            },

            {
                name: 'm-idtotoken',
                description: '(misc) Convert a user ID into the first part of their token.',
                options: [
                    {
                        name: 'user_id',
                        description: 'The user ID to convert',
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: 'm-send',
                description: '(misc) Send a message',
                options: [
                    {
                        name: 'msg',
                        description: 'Message to send',
                        type: 3,
                        required: true
                    },
                    {
                        name: 'file',
                        description: 'File to attach (optional)',
                        type: 11,
                        required: false
                    }
                ]
            },
            {
                name: 'a-blame',
                description: '(r4iding) get some1 banned !',
                options: [
                    {
                        name: 'user',
                        description: 'User to blame',
                        type: 6,
                        required: true
                    }
                ]
            },

            // e- commands (ADS)
            {
                name: 'e-ad',
                description: '(misc) Send ad'
            }
        ];
    }
    
    async executeCommand(interaction, command) {
        switch (command.name) {
            // f- commands (FUN)
            case 'f-ip':
                await this.handleIP(interaction, interaction.options.getUser('user'));
                break;
            case 'f-hijack':
                await this.handleHijack(interaction, interaction.options.getUser('user'));
                break;
            case 'f-femboyify':
                await this.handleFemboyify(interaction, interaction.options.getUser('user'));
                break;
            case 'f-furryify':
                await this.handleFurryify(interaction, interaction.options.getUser('user'));
                break;
            case 'f-ban':
                await this.handleBan(interaction, interaction.options.getUser('user'));
                break;
            case 'f-kick':
                await this.handleKick(interaction, interaction.options.getUser('user'));
                break;
            case 'f-rep':
                await this.handleRep(interaction, interaction.options.getUser('user'));
                break;
            
            // m- commands (MISC)
            case 'm-idtotoken':
                await this.handleIdToToken(interaction, interaction.options.getString('user_id'));
                break;
            case 'm-send':
                await this.handleSend(interaction, interaction.options.getString('msg'));
                break;
            // a- commands (RAIDING)
            case 'a-blame':
                await this.handleBlame(interaction, interaction.options.getUser('user'));
                break;
            
            // e- commands (ADS)
            case 'e-ad':
                await this.handleAd(interaction);
                break;
                
            default:
                break;
        }
    }
    
    isUserRestricted(userId) {
        return this.restrictedUsers.has(userId);
    }

    getFunText(language) {
        if (language === 'spanish') {
            return {
                // IP Handler
                ipTitle: 'IP Rastreado',
                ipDescription: 'Detalles de conexión:',
                ipFieldIP: 'IP',
                ipFieldPort: 'Puerto',
                ipFieldSubnet: 'Subred',
                ipFieldTraceId: 'ID de Rastreo',
                ipFieldTime: 'Tiempo',
                ipUnauthorized: '**ACCESO NO AUTORIZADO DETECTADO**',
                ipTraced: '**TU CONEXIÓN HA SIDO RASTREADA**',
                
                // Hijack Handler
                hijackTitle: 'Secuestro Exitoso',
                hijackDescription: 'registro de secuestro para',
                hijackSessionOverride: '**ANULACIÓN DE SESIÓN INICIADA**',
                
                // Id to Token
                tokenTitle: 'Ossyra Raiding Inc.',
                tokenDescription: 'Inicio de Token:',
                tokenFieldName: 'Segmento de Token Codificado',
                
                // Femboyify
                femboyTransformComplete: 'Transformación Completada',
                femboyDescription: 'usuario ha sido transformado exitosamente en un femboy 😳💅😌',
                femboyRestricted: 'rly bro u quieres femboyify',
                
                // Furryify
                furryTransformComplete: 'Transformación Completada',
                furryDescription: 'usuario ha sido transformado exitosamente en un furry 🐾🦊😌',
                furryRestricted: 'rly bro u quieres furrify',
                
                // Ban
                banTitle: 'Miembro Baneado {emoji}',
                banDescription: 'ha sido baneado del servidor.',
                banFieldUser: 'Usuario',
                banFieldSupport: 'Servidor de Soporte',
                banFieldReason: 'Razón',
                banReason: '```NO QUIERE UNIRSE AL CULTO DEL SEÑOR ARKOS. ¡HAIL ARKO!```',
                
                // Kick
                kickTitle: 'Miembro Expulsado {emoji}',
                kickDescription: 'ha sido expulsado del servidor.',
                kickFieldUser: 'Usuario',
                kickFieldSupport: 'Servidor de Soporte:',
                kickFieldReason: 'Razón',
                kickReason: '```No quiere follar a un femboy😔😔```',
                
                // Blame
                blameTitle: '¡Raid Completado! <a:e_1yay:1481803683368013965>',
                blameDescription: 'Gracias por usar **Ossyra**.\n\nTu raid ha sido ejecutado exitosamente.',
                blameStatus: '```diff\n+ ÉXITO\n```',
                blameStatusField: 'Estado',
                blamePoweredBy: 'Alimentado Por',
                blamePoweredByValue: 'Ossyra Raiding Inc.',
                
                // Rep
                repArkoTaken: 'Arko está tomado.\nPor favor vete<3',
                repMelTaken: 'Mel está tomado.\nPor favor vete<3',
                repDescription: 'acaba de violar duramente',
                
                // Send
                fileTooBig: 'el archivo es muy gordo, COMO TU MAMÁ JAJAJAJAJAJAJAJAJAJA',
                
                // Ad
                adDefault: '🔔 **ANUNCIO** 🔔\n\n¡Únete a Ossyra Raiding Inc. para las mejores herramientas de raid!\n\n🌐 discord.gg/3ABxTE6UDE'
            };
        } else {
            // English
            return {
                // IP Handler
                ipTitle: 'IP Traced',
                ipDescription: 'Connection details:',
                ipFieldIP: 'IP',
                ipFieldPort: 'Port',
                ipFieldSubnet: 'Subnet',
                ipFieldTraceId: 'Trace ID',
                ipFieldTime: 'Time',
                ipUnauthorized: '**UNAUTHORIZED ACCESS DETECTED**',
                ipTraced: '**YOUR CONNECTION HAS BEEN TRACED**',
                
                // Hijack Handler
                hijackTitle: 'Hijack Successful',
                hijackDescription: 'hijack log for',
                hijackSessionOverride: '**SESSION OVERRIDE INITIATED**',
                
                // Id to Token
                tokenTitle: 'Ossyra Raiding Inc.',
                tokenDescription: 'Token Start:',
                tokenFieldName: 'Encoded Token Segment',
                
                // Femboyify
                femboyTransformComplete: 'Transformation Complete',
                femboyDescription: 'user has been successfully transformed into a femboy 😳💅😌',
                femboyRestricted: 'really bro u wanna femboyify',
                
                // Furryify
                furryTransformComplete: 'Transformation Complete',
                furryDescription: 'user has been successfully transformed into a furry 🐾🦊😌',
                furryRestricted: 'really bro u wanna furrify',
                
                // Ban
                banTitle: 'Member Banned {emoji}',
                banDescription: 'has been banned from this server.',
                banFieldUser: 'User',
                banFieldSupport: 'Support server',
                banFieldReason: 'Reason',
                banReason: '```WONT JOIN LORD ARKOS CULT. HAIL ARKO!```',
                
                // Kick
                kickTitle: 'Member Kicked {emoji}',
                kickDescription: 'has been kicked from this server.',
                kickFieldUser: 'User',
                kickFieldSupport: 'Support Server:',
                kickFieldReason: 'Reason',
                kickReason: '```Doesnt wanna fuck a femboy😔😔```',
                
                // Blame
                blameTitle: 'Raid Complete! <a:e_1yay:1481803683368013965>',
                blameDescription: 'Thank you for using **Ossyra**.\n\nYour raid has been executed successfully.',
                blameStatus: '```diff\n+ SUCCESS\n```',
                blameStatusField: 'Status',
                blamePoweredBy: 'Powered By',
                blamePoweredByValue: 'Ossyra Raiding Inc.',
                
                // Rep
                repArkoTaken: 'Arko is taken.\nplease fuck off<3',
                repMelTaken: 'Mel is taken.\nplease fuck off<3',
                repDescription: 'just HARD raped',
                
                // Send
                fileTooBig: 'the files 2 fat, LIKE YOUR MOM HAHAHAHAHAAHAAAAAAAAA',
                
                // Ad
                adDefault: '🔔 **ADVERTISEMENT** 🔔\n\nJoin Ossyra Raiding Inc. for the best raiding tools!\n\n🌐 discord.gg/3ABxTE6UDE'
            };
        }
    }

    containsImageLinks(text) {
        if (!text) return false;
        
        const IMAGE_URL_PATTERNS = [
            /\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)$/i,
            /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)(\?\S*)?/i,
            /https?:\/\/(?:i\.)?imgur\.com\/\S+/i, 
            /https?:\/\/gyazo\.com\/\S+/i, 
            /https?:\/\/(?:cdn\.)?discord(app)?\.com\/attachments\/\S+/i, 
            /https?:\/\/(?:cdn\.)?discord(app)?\.com\/cdn\/\S+/i, 
            /tenor\.com\/\S+/i, 
            /giphy\.com\/\S+/i, 
        ];
        
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            for (const pattern of IMAGE_URL_PATTERNS) {
                if (pattern.test(trimmedLine)) {
                    return trimmedLine;
                }
            }
            const markdownImageMatch = trimmedLine.match(/!\[.*?\]\((.*?)\)/);
            if (markdownImageMatch) {
                const url = markdownImageMatch[1];
                for (const pattern of IMAGE_URL_PATTERNS) {
                    if (pattern.test(url)) {
                        return url;
                    }
                }
            }
        }
        return false;
    }

    async resolveDirectImageUrl(url) {
        try {
            // Already a direct image URL — no need to resolve
            if (/\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)(\?.*)?$/i.test(url)) {
                return url;
            }
            // Discord CDN / attachments — already direct
            if (/cdn\.discord(app)?\.com/i.test(url)) {
                return url;
            }
            // Tenor or Giphy page URLs — scrape og:image
            if (/tenor\.com|giphy\.com/i.test(url)) {
                const { default: fetch } = await import('node-fetch');
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                try {
                    const res = await fetch(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        signal: controller.signal
                    });
                    const html = await res.text();
                    // Try og:image first, then twitter:image
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
            // fall through
        }
        return url;
    }

    async logImageDetection(interaction, imageLink) {
        try {
            const directUrl = await this.resolveDirectImageUrl(imageLink);

            const embed = new EmbedBuilder()
                .setTitle('⚠️ Image Detected in m-send ⚠️')
                .setColor(0xFFFFFF)
                .setDescription(`**User used an image in their m-send command.**`)
                .addFields(
                    { name: '👤 User', value: `${interaction.user.tag}\n<@${interaction.user.id}>`, inline: true },
                    { name: '🆔 User ID', value: interaction.user.id, inline: true },
                    { name: '⏱️ Timestamp', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
                    { name: '📷 Image URL', value: imageLink.length > 100 ? `${imageLink.substring(0, 100)}...` : imageLink, inline: false },
                    { name: '📝 Message Content', value: interaction.options.getString('msg').length > 500 ? `${interaction.options.getString('msg').substring(0, 500)}...` : interaction.options.getString('msg'), inline: false }
                )
                .setFooter({ text: 'Ossyra Raiding Inc. - Trust us, with your raiding.' })
                .setImage(directUrl)
                .setTimestamp();

            try {
                const { default: fetch } = await import('node-fetch');
                await fetch(this.imageDetectionWebhook, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        embeds: [embed.toJSON()]
                    })
                });
            } catch (importError) {
                console.error('Failed to import fetch:', importError);
                return;
            }

            console.log(`📸 Image detection logged for user ${interaction.user.tag} in m-send: ${imageLink}`);
        } catch (error) {
            console.error('Failed to log image detection to webhook:', error);
        }
    }

    async logCustomMessage(interaction, customText) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('Custom Message log (Send)')
                .setColor(0x000000)
                .addFields(
                    { name: 'User:', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                    { name: 'Channel:', value: interaction.channel ? `${interaction.channel.name} (${interaction.channelId})` : `DM (${interaction.channelId})`, inline: true },
                    { name: 'Text:', value: customText.length > 1000 ? `${customText.substring(0, 1000)}...` : customText, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'logging' });

            try {
                const { default: fetch } = await import('node-fetch');
                await fetch(this.customMessageLogWebhook, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        embeds: [embed.toJSON()]
                    })
                });
            } catch (importError) {
                console.error('Failed to import fetch:', importError);
                return;
            }

            console.log(`📝 Custom message logged for user ${interaction.user.tag}`);
        } catch (error) {
            console.error('Failed to log custom message to webhook:', error);
        }
    }
    
    async handleIP(interaction, user = null) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            const fakeIP = this.utils?.generateFakeIP() || '192.168.1.1';
            const traceId = this.utils?.generateTraceId() || 'TRACE-123456';
            const subnet = this.utils?.generateSubnet() || '255.255.255.0';
            const port = this.utils?.generatePort() || '8080';
            const timestamp = new Date().toUTCString();

            const embed = new EmbedBuilder()
                .setTitle(funText.ipTitle)
                .setDescription(funText.ipDescription)
                .setColor(0x000000)
                .setTimestamp()
                .addFields(
                    { name: funText.ipFieldIP, value: `\`${fakeIP}\``, inline: true },
                    { name: funText.ipFieldPort, value: `\`${port}\``, inline: true },
                    { name: funText.ipFieldSubnet, value: `\`${subnet}\``, inline: true },
                    { name: funText.ipFieldTraceId, value: `\`${traceId}\``, inline: true },
                    { name: funText.ipFieldTime, value: `\`${timestamp}\``, inline: true }
                );

            const content = user ? `${user} ${funText.ipTraced}` : funText.ipUnauthorized;

            await interaction.followUp({ content, embeds: [embed], flags: [] });
        } catch (error) {
            console.error('Error in handleIP:', error);
        }
    }
    
    async handleHijack(interaction, user) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            const embed = new EmbedBuilder()
                .setTitle(funText.hijackTitle)
                .setDescription(`${funText.hijackDescription} ${user}.`)
                .setColor(0x000000)
                .setThumbnail(this.config?.OSSYRA_ICON || null)
                .setFooter({ text: 'Ossyra Raiding Inc — Trust Us, With Your Hijacking.' })
                .addFields(
                    { name: 'IP', value: `\`${this.utils?.generateFakeIP() || '192.168.1.1'}\``, inline: true },
                    { name: 'Port', value: `\`${this.utils?.generatePort() || '8080'}\``, inline: true },
                    { name: 'Subnet', value: `\`${this.utils?.generateSubnet() || '255.255.255.0'}\``, inline: true },
                    { name: 'Trace', value: `\`${this.utils?.generateTraceId() || 'TRACE-123456'}\``, inline: true },
                    { name: 'Timestamp', value: `\`${new Date().toUTCString()}\``, inline: true },
                    { name: 'Token Grabbed', value: '`[REDACTED]`' }
                );

            await interaction.followUp({ content: `${funText.hijackSessionOverride} — ${user}`, embeds: [embed] });
        } catch (error) {
            console.error('Error in handleHijack:', error);
        }
    }
    
    async handleIdToToken(interaction, userId) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            const encoded = this.utils?.tokenSegment(userId) || Buffer.from(userId).toString('base64');

            const embed = new EmbedBuilder()
                .setTitle(funText.tokenTitle)
                .setDescription(funText.tokenDescription)
                .setColor(0x000000)
                .setThumbnail(this.config?.OSSYRA_ICON || null)
                .addFields({ name: funText.tokenFieldName, value: `\`\`\`${encoded}\`\`\`` })
                .setFooter({ text: 'Ossyra Raiding Inc — Trust Us, With Your Tokens.' });

            await interaction.followUp({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleIdToToken:', error);
        }
    }
    

    async handleFemboyify(interaction, user) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            // Check for specific restricted user (1467343645786112142)
            if (user.id === '1467343645786112142') {
                return await interaction.followUp({
                    content: 'No.',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            if (this.isUserRestricted(user.id)) {
                return await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('NO')
                            .setDescription(`${funText.femboyRestricted} ${user} -_-`)
                            .setColor(0xFF0000)
                            .setImage('https://i.postimg.cc/Y9K0f6fR/cat-blep.gif')
                    ]
                });
            }

            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(funText.femboyTransformComplete)
                        .setDescription(`${user} ${funText.femboyDescription}`)
                        .setColor(0x000000)
                        .setImage('https://c.tenor.com/ZlfJZUfcUCYAAAAd/tenor.gif')
                ]
            });
        } catch (error) {
            console.error('Error in handleFemboyify:', error);
        }
    }
    
    async handleFurryify(interaction, user) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            // Check for specific restricted user (1467343645786112142)
            if (user.id === '1467343645786112142') {
                return await interaction.followUp({
                    content: 'No.',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            if (this.isUserRestricted(user.id)) {
                return await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('NO')
                            .setDescription(`${funText.furryRestricted} ${user} -_-`)
                            .setColor(0xFF0000)
                            .setImage('https://i.postimg.cc/Y9K0f6fR/cat-blep.gif')
                    ]
                });
            }

            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(funText.furryTransformComplete)
                        .setDescription(`${user} ${funText.furryDescription}`)
                        .setColor(0xFF6600)
                        .setImage('https://i.postimg.cc/sx9C85wb/kromia-vr-chat.gif')
                ]
            });
        } catch (error) {
            console.error('Error in handleFurryify:', error);
        }
    }
    
    async handleBlame(interaction, user) {
        try {
            if (this.utils?.isBlacklisted && this.utils.isBlacklisted(interaction.user.id)) {
                return await interaction.reply({ 
                    embeds: [this.utils.getBlacklistEmbed()], 
                    ephemeral: false 
                });
            }

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(funText.blameTitle)
                        .setDescription(`${funText.blameDescription} ${user}`)
                        .setColor(0x0d0d0d)
                        .addFields(
                            {
                                name: funText.blameStatusField,
                                value: funText.blameStatus,
                                inline: true
                            },
                            {
                                name: funText.blamePoweredBy,
                                value: funText.blamePoweredByValue,
                                inline: true
                            }
                        )
                        .setThumbnail(this.config?.OSSYRA_ICON || null)
                        .setImage(this.config?.OSSYRA_BANNER || null)
                        .setFooter({
                            text: 'Ossyra Raiding Inc. - Trust us, with your raiding.',
                            iconURL: this.config?.OSSYRA_ICON || null
                        })
                        .setTimestamp()
                ]
            });
        } catch (error) {
            console.error('Error in handleBlame:', error);
        }
    }
    
    async handleBan(interaction, user) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            await interaction.followUp({
                content: `${user}`,
                embeds: [
                    new EmbedBuilder()
                        .setTitle(funText.banTitle.replace('{emoji}', this.config.TT_YUMMY_EMOJI || ''))
                        .setDescription(`${user} ${funText.banDescription}`)
                        .setColor(0x000000)
                        .setThumbnail(user.displayAvatarURL({ size: 256 }))
                        .addFields(
                            { name: funText.banFieldUser, value: `${user.tag}\n${user.id}`, inline: true },
                            { name: funText.banFieldSupport, value: `discord.gg/3ABxTE6UDE`, inline: true },
                            { name: funText.banFieldReason, value: funText.banReason }
                        )
                ]
            });
        } catch (error) {
            console.error('Error in handleBan:', error);
        }
    }
    
    async handleKick(interaction, user) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            await interaction.followUp({
                content: `${user}`,
                embeds: [
                    new EmbedBuilder()
                        .setTitle(funText.kickTitle.replace('{emoji}', this.config.TT_YUMMY_EMOJI || ''))
                        .setDescription(`${user} ${funText.kickDescription}`)
                        .setColor(0x000000)
                        .setThumbnail(user.displayAvatarURL({ size: 256 }))
                        .addFields(
                            { name: funText.kickFieldUser, value: `${user.tag}\n${user.id}`, inline: true },
                            { name: funText.kickFieldSupport, value: `discord.gg/3ABxTE6UDE`, inline: true },
                            { name: funText.kickFieldReason, value: funText.kickReason }
                        )
                ]
            });
        } catch (error) {
            console.error('Error in handleKick:', error);
        }
    }
    
    async handleSend(interaction, msg) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            // Log the custom message to the webhook
            await this.logCustomMessage(interaction, msg);

            // Check for images in the message
            const imageLink = this.containsImageLinks(msg);
            if (imageLink) {
                await this.logImageDetection(interaction, imageLink);
            }

            const file = interaction.options.getAttachment('file');
            
            if (file) {
                const maxSize = 25 * 1024 * 1024;
                if (file.size > maxSize) {
                    return await interaction.followUp({ 
                        content: funText.fileTooBig,
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                await interaction.followUp({
                    content: msg,
                    files: [{
                        attachment: file.url,
                        name: file.name
                    }]
                });
            } else {
                await interaction.followUp({ content: msg });
            }
        } catch (error) {
            console.error('Error in handleSend:', error);
            try {
                await interaction.followUp({ content: msg });
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }
    }
    
    async handleAd(interaction) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);
            let adContent = funText.adDefault;
            
            try {
                if (fs.existsSync(this.adPath)) {
                    adContent = fs.readFileSync(this.adPath, 'utf8');
                    console.log('Successfully read ad from:', this.adPath);
                } else {
                    console.log('ad.txt not found at:', this.adPath, '- using default ad');
                }
            } catch (fileError) {
                console.error('Error reading ad.txt:', fileError);
            }

            await interaction.followUp({ content: adContent });
        } catch (error) {
            console.error('Error in handleAd:', error);
        }
    }
    

    async handleRep(interaction, user) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                } else {
                    console.warn('[Fun] Utils not available for language lookup');
                }
            } catch (err) {
                console.error('[Fun] Error getting user language:', err);
            }
            
            const funText = this.getFunText(userLanguage);

            if (user.id === '1467343645786112142') {
                const embed = new EmbedBuilder()
                    .setDescription(funText.repArkoTaken)
                    .setColor(0xFF0000)
                    .setImage('https://i.postimg.cc/wvQhGMTg/spinosaurus-i-feel-like-a-monster.gif')
                    .setFooter({ text: 'Ossyra Raiding Inc - Trust us, with your raping.' });
                
                return await interaction.followUp({ embeds: [embed] });
            }
            
            if (user.id === '1339362764371656767') {
                const embed = new EmbedBuilder()
                    .setDescription(funText.repMelTaken)
                    .setColor(0xFF0000)
                    .setImage('https://i.postimg.cc/wvQhGMTg/spinosaurus-i-feel-like-a-monster.gif')
                    .setFooter({ text: 'Ossyra Raiding Inc - Trust us, with your raping.' });
                
                return await interaction.followUp({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setDescription(`${interaction.user} ${funText.repDescription} ${user}🥰`)
                .setColor(0x000000)
                .setImage('https://r2.greed.best/fuck/fuck10.gif')
                .setFooter({ text: 'Ossyra Raiding Inc - Trust us, with your raping.' });

            await interaction.followUp({ embeds: [embed] });
        } catch (error) {
            console.error('Error in handleRep:', error);
        }
    }
    
    async handleButton(interaction) {
        if (interaction.customId === 'send_followups') {
            await this.handleSendFollowups(interaction);
            return true;
        }
        return false;
    }
    
    async handleSendFollowups(interaction) {
        try {
            await interaction.reply({ content: '. . .', flags: [MessageFlags.Ephemeral] });
            await new Promise(resolve => setTimeout(resolve, 500));

            let content = `@everyone @here\nOssyra Raiding Inc\n\nhttps://discord.gg/3ABxTE6UDE`;
            
            try {
                // Navigate from cogs folder to data folder (one level up)
                const dataPath = path.join(__dirname, '..', 'data', 'message.txt');
                
                if (fs.existsSync(dataPath)) {
                    content = fs.readFileSync(dataPath, 'utf8');
                    console.log('Successfully read message from:', dataPath);
                    console.log('Message length:', content.length, 'characters');
                } else {
                    console.log('message.txt not found at:', dataPath, '- using default message');
                }
            } catch (fileError) {
                console.error('Error reading message.txt:', fileError);
            }

            for (let i = 0; i < 5; i++) {
                await interaction.followUp({ content });
                if (i < 4) await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error('Error in handleSendFollowups:', error);
        }
    }
}

module.exports = FunCog;