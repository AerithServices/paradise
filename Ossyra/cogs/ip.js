const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

class IpLookupCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'iplookup';
        this.utils = client.cogs.get('utils');
        
        console.log(`loaded iplookup cog`);
    }
    
    getIpText(language) {
        if (language === 'spanish') {
            return {
                invalidOrFailed: 'inválido o falló',
                location: 'ubicación',
                network: 'red',
                geoAndTime: 'geo y tiempo',
                status: 'estado',
                continent: 'continente',
                country: 'país',
                region: 'región',
                city: 'ciudad',
                zip: 'código postal',
                isp: 'isp',
                org: 'org',
                as: 'as',
                latLon: 'lat/lon',
                timezone: 'zona horaria',
                localTime: 'hora local',
                proxyVpn: 'proxy/vpn',
                hosting: 'alojamiento',
                error: '**Error** - 345 \n\n No se pudo buscar la ip',
                footer: 'Ossyra Raiding Inc  -  Confía en nosotros con tu ip. || ty rynzen for embed (lo robé sin consentimiento UwU)'
            };
        } else {
            return {
                invalidOrFailed: 'invalid or failed',
                location: 'location',
                network: 'network',
                geoAndTime: 'geo & time',
                status: 'status',
                continent: 'continent',
                country: 'country',
                region: 'region',
                city: 'city',
                zip: 'zip',
                isp: 'isp',
                org: 'org',
                as: 'as',
                latLon: 'lat/lon',
                timezone: 'timezone',
                localTime: 'local time',
                proxyVpn: 'proxy/vpn',
                hosting: 'hosting',
                error: `**Error** - 345 \n\n Unable to lookup the ip ${this.config.SWEAT_EMOJI}`,
                footer: 'Ossyra Raiding Inc  -  Trust us with your ip. || ty rynzen for embed (i skidded it without consent UwU)'
            };
        }
    }
    
    get commands() {
        return [
            {
                name: 'i-ip',
                description: '(ip) lookup an ip address!1!11',
                options: [
                    {
                        name: 'ip',
                        description: 'what ip',
                        type: 3,
                        required: true
                    }
                ]
            }
        ];
    }
    
    async executeCommand(interaction, command) {
        switch (command.name) {
            case 'i-ip':
                await this.handleIpLookup(interaction);
                break;
        }
    }
    
    async handleIpLookup(interaction) {
        try {
            if (this.utils && this.utils.isBlacklisted(interaction.user.id)) {
                return interaction.reply({ 
                    embeds: [this.utils.getBlacklistEmbed()], 
                    ephemeral: false 
                });
            }
            
            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (err) {
                console.error('[IpLookup] Error getting user language:', err);
            }
            
            const ipText = this.getIpText(userLanguage);
            
            const ip = interaction.options.getString('ip');
            
            await interaction.reply({ 
                content: '. . .',
                flags: MessageFlags.Ephemeral
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const response = await axios.get(`http://ip-api.com/json/${ip}?fields=66846719`);
            const data = response.data;
            
            if (data.status === 'fail') {
                return interaction.followUp({ 
                    content: `${ipText.invalidOrFailed} ${ip}`,
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTitle(`${ip}`)
                .setDescription([
                    '----------------------------------',
                    `> **${ipText.location}**`,
                    `> ${ipText.continent}: ${data.continent || 'Unknown'}`,
                    `> ${ipText.country}: ${data.country || 'Unknown'}`,
                    `> ${ipText.region}: ${data.regionName || 'Unknown'}`,
                    `> ${ipText.city}: ${data.city || 'Unknown'}`,
                    `> ${ipText.zip}: ${data.zip || 'Unknown'}`,
                    '----------------------------------',
                    `> **${ipText.network}**`,
                    `> ${ipText.isp}: ${data.isp || 'Unknown'}`,
                    `> ${ipText.org}: ${data.org || 'Unknown'}`,
                    `> ${ipText.as}: ${data.as || 'Unknown'}`,
                    '----------------------------------',
                    `> **${ipText.geoAndTime}**`,
                    `> ${ipText.latLon}: ${data.lat || 'Unknown'}, ${data.lon || 'Unknown'}`,
                    `> ${ipText.timezone}: ${data.timezone || 'Unknown'}`,
                    `> ${ipText.localTime}: ${new Date().toLocaleString('en-US', { timeZone: data.timezone || 'UTC' })}`,
                    '----------------------------------',
                    `> **${ipText.status}**`,
                    `> ${ipText.proxyVpn}: ${data.proxy || 'false'}`,
                    `> ${ipText.hosting}: ${data.hosting || 'false'}`,
                    '----------------------------------'
                ].join('\n'))
                .setFooter({ text: ipText.footer});
            
            await interaction.followUp({ 
                embeds: [embed], 
                ephemeral: false 
            });
            
        } catch (error) {
            console.error('Error in IP lookup:', error);
            
            // Get user's language for error message
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (err) {
                console.error('[IpLookup] Error getting user language:', err);
            }
            
            const ipText = this.getIpText(userLanguage);
            
            if (!interaction.replied) {
                await interaction.reply({
                    content: ipText.error,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            } else {
                await interaction.followUp({ 
                    content: ipText.error,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    }
    
    async handleButton(interaction) {
        return false;
    }
    
    async handleModal(interaction) {
        return false;
    }
}

module.exports = IpLookupCog;