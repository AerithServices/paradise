const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');

const BANNER_URL = 'https://cdn.discordapp.com/banners/1491123766137323643/9aea17950bb7a1ca4ed8c19f53d1e51b.webp?size=1024';

class InfoCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'info';
        this.utils = null;
    }
    
    getInfoText(language) {
        if (language === 'spanish') {
            return {
                title: 'Ossyra Raider - Información del Bot',
                subtitle: '**Traído a ti por Ossyra Raiding Inc**',
                tagline: '*Confía en nosotros, con tus raids.*',
                creators: '**Creadores:** Arko, Mazen',
                styling: '**Estilo:** Arko',
                totalCommands: '**Comandos Totales:**',
                quote: '> "Hola, hice este bot debido a que la mayoría de bots de raid ponen paywall su contenido o simplemente no tienen buenos comandos. No tengo ningún daño ni odio hacia nadie que haya tenido este bot usado contra ellos. Tampoco reclamo ninguna responsabilidad por ninguna acción causada por usar este bot. Reviso regularmente los registros y pongo en lista negra a los usuarios que violan nuestros términos, así que por favor no te unas a ossyra para venir a hostigarme sobre este hobby mío." - Arko',
                categories: {
                    'Raiding': 'Raids',
                    'Templates & Teams': 'Plantillas Y Equipos',
                    'Games': 'Juegos',
                    'Animals': 'Animales',
                    'Fun': 'Diversión',
                    'Utilities': 'Utilidades',
                    'RP': 'RP',
                    'Family': 'Familia',
                    'Admin': 'Admin',
                    'Other': 'Otros'
                },
                officialDiscord: 'Discord Oficial',
                supportUs: 'Apóyanos',
                terms: 'Términos'
            };
        } else {
            return {
                title: 'Ossyra Raider - Bot Information',
                subtitle: '**Brought to you by Ossyra Raiding Inc**',
                tagline: '*Trust us, with your raiding.*',
                creators: '**Creators:** Arko, Mazen',
                styling: '**Styling:** Arko',
                totalCommands: '**Total Commands:**',
                quote: '> "Hi, i made this bot due to the fact that most raid bots paywall their stuff or just dont really have good commands. I harbor no harm nor hate towards anyone who had this bot used on them. i also dont claim any reponsibility for any actions caused by using this bot. I regularly check logs and blacklist users who violate our terms, so please dont join ossyra to come and harass me over this hobby of mine." - Arko',
                categories: {
                    'Raiding': 'Raiding',
                    'Templates & Teams': 'Templates & Teams',
                    'Games': 'Games',
                    'Animals': 'Animals',
                    'Fun': 'Fun',
                    'Utilities': 'Utilities',
                    'RP': 'RP',
                    'Family': 'Family',
                    'Admin': 'Admin',
                    'Other': 'Other'
                },
                officialDiscord: 'Official Discord',
                supportUs: 'Support Us',
                terms: 'Terms'
            };
        }
    }
    
    setUtils(utils) {
        this.utils = utils;
    }
    
    get commands() {
        return [
            {
                name: 'i-info',
                description: '(important) shows information about the bot and its commands',
                integration_types: [0, 1],
                contexts: [0, 1, 2]
            }
        ];
    }
    
    async executeCommand(interaction, command) {
        if (command.name === 'i-info') {
            await this.handleInfo(interaction);
        }
    }
    
    async handleInfo(interaction) {
        try {
            // Collect all commands from all cogs
            const allCommands = [];
            for (const [cogName, cog] of this.client.cogs) {
                if (cog.commands && Array.isArray(cog.commands)) {
                    allCommands.push(...cog.commands);
                }
            }

            // Define categories with their associated prefixes
            const categoryGroups = {
                'Raiding': ['a-', 'v-'],
                'Templates & Teams': ['t-'],
                'Games': ['g-'],
                'Animals': ['c-'],
                'Fun': ['f-'],
                'Utilities': ['m-', 'i-', 'x-'],
                'RP': ['r-'],
                'Family': ['e-'],
                'Admin': ['z-'],
                'Other': []
            };

            // Group commands by category
            const commandsByCategory = {};
            for (const cmd of allCommands) {
                const parts = cmd.name.split('-');
                const prefix = parts.length > 1 ? parts[0] + '-' : '';
                
                let category = 'Other';
                for (const [cat, prefixes] of Object.entries(categoryGroups)) {
                    if (prefixes.includes(prefix)) {
                        category = cat;
                        break;
                    }
                }
                
                if (!commandsByCategory[category]) {
                    commandsByCategory[category] = [];
                }
                
                commandsByCategory[category].push(`\`/${cmd.name}\` - ${cmd.description}`);
            }

            // Build info panel using MediaGalleryBuilder for banner (like interaction-raid)
            const mainContainer = new ContainerBuilder()
                .setAccentColor(0xffffff)
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(BANNER_URL)
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## Ossyra Raider - Bot Information\n\n**Brought to you by Ossyra Raiding Inc**\n*Trust us, with your raiding.*\n\n**Creators:** Arko, Mazen\n**Styling:** Arko\n\n**Total Commands:** ${allCommands.length}`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> "Hi, i made this bot due to the fact that most raid bots paywall their stuff or just dont really have good commands. I harbor no harm nor hate towards anyone who had this bot used on them. i also dont claim any reponsibility for any actions caused by using this bot. I regularly check logs and blacklist users who violate our terms, so please dont join ossyra to come and harass me over this hobby of mine." - Arko`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

            const colors = [0x57f287, 0xfaa61a, 0xed4245, 0x00b0f4, 0x9c27b0, 0x1abc9c, 0xe74c3c, 0xf39c12, 0x16a085, 0x8e44ad];
            let colorIndex = 0;

            for (const [category, cmds] of Object.entries(commandsByCategory)) {
                const value = cmds.join('\n');
                // Handle command lists
                if (value.length <= 2000) {
                    mainContainer.setAccentColor(colors[colorIndex % colors.length]);
                    mainContainer.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${category}\n${value}`)
                    );
                    mainContainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
                    colorIndex++;
                } else {
                    // Split into multiple sections if too long
                    const chunks = [];
                    let currentChunk = '';
                    for (const cmd of cmds) {
                        if ((currentChunk + '\n' + cmd).length > 2000) {
                            if (currentChunk) {
                                chunks.push(currentChunk);
                                currentChunk = cmd;
                            } else {
                                chunks.push(cmd.substring(0, 1997) + '...');
                                currentChunk = '';
                            }
                        } else {
                            currentChunk = currentChunk ? currentChunk + '\n' + cmd : cmd;
                        }
                    }
                    
                    if (currentChunk) {
                        chunks.push(currentChunk);
                    }
                    
                    for (let i = 0; i < chunks.length; i++) {
                        const categoryName = i === 0 ? category : `${category} (cont.)`;
                        mainContainer.setAccentColor(colors[colorIndex % colors.length]);
                        mainContainer.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`### ${categoryName}\n${chunks[i]}`)
                        );
                        mainContainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
                        colorIndex++;
                    }
                }
            }

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Official Discord')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/3ABxTE6UDE'),
                new ButtonBuilder()
                    .setLabel('Support Us')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://ko-fi.com/arkoorsmth/tip'),
                new ButtonBuilder()
                    .setLabel('Terms')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://ossyra.jsx.pm/tos')
            );

            // First, reply with ephemeral '. . .'
            await interaction.reply({
                content: '. . .',
                flags: MessageFlags.Ephemeral
            });

            // Then, follow up with the info panel and buttons (not ephemeral)
            await interaction.followUp({
                components: [mainContainer, buttons],
                flags: [MessageFlags.IsComponentsV2]
            });
            
        } catch (error) {
            console.error('Error in info command:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An error occurred while displaying the info. Please try again.'
                });
            }
        }
    }
    
    async handleAutocomplete(interaction) {
        return false;
    }
    
    async handleButton(interaction) {
        return false;
    }
}

module.exports = InfoCog;