const { SlashCommandBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');

class FunnyCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'funny';
        this.utils = client.cogs.get('utils');
        this.sewerJewGif = 'https://i.postimg.cc/Qx8FGCtz/sewer-jew-sewer.gif';
    }
    
    getFunnyText(language) {
        if (language === 'spanish') {
            return {
                // Bitches
                bitchesCounter: 'contador de putas',
                bitchesNone: 'tiene : jajajajajajajajajajajaja sin putas lmaoooo',
                bitchesCount: 'tiene:',
                arkoWife: 'tiene: 1 hermosa esposa <3 \n\n te amo mel {{blushEmoji}}',
                melHusband: 'tiene: ¡¡1 puta de un esposo!!',
                oneEnough: '(1 es suficiente)',
                nice69: 'jajajajajajajajajaja 69',
                fire50: '50 es fuego',
                goated20: '20 es legendario',
                requested: 'solicitado por',
                errorCheckingBitches: 'error al verificar putas',
                // Femboy Meter
                femboyMeter: 'medidor de femboy',
                notFemboy: 'nu arko dice que un tipo no un femboy >:^',
                femboyPercent: 'es: **{percent}%** un femboy',
                notAFemboy: 'no es un femboy',
                aLittleGirly: 'solo un poco femenino',
                maybeOne: 'quizás uno',
                omgFemboy: 'omg un femboy hii :3',
                omgSoHigh: 'omg es tan alto',
                errorCheckingFemboy: 'error al verificar medidor de femboy',
                // Furry Meter
                furryMeter: 'medidor de furry',
                notFurry: 'arko no es un furry 🥀',
                furryPercent: 'es: **{percent}%** un furry',
                notAFurry: 'no es un furry',
                aLittleFurry: 'solo un poco peludo',
                maybeOneF: 'quizás uno',
                omgFurry: 'omg un furry >:3',
                omgSoHighF: 'omg es tan alto',
                yayaFurries: 'yayayayay me encantan los furries :3',
                errorCheckingFurry: 'error al verificar medidor de furry',
                // Jewify
                jewified: 'judificación',
                jewifyTitle: 'judificación de usuario',
                goyDetected: '(1%) apenas un judío - Goy detectado',
                halfBaked: '(2-25%) solo un poco judío - Medio cocido',
                kosherEnough: '(26-50%) llegando allá - Kosher suficiente',
                shalom: '(51-75%) ¡ay vey! - Shalom',
                newWorldOrder: '(76-100%) ahora controlan los bancos - Nuevo orden mundial',
                errorCheckingJewify: 'error al judificar usuario'
            };
        } else {
            return {
                // Bitches
                bitchesCounter: 'bitches counter',
                bitchesNone: 'has : hahhahahahahaha no bitches lmaoooo',
                bitchesCount: 'has:',
                arkoWife: 'has: 1 lovely wife <3 \n\n ilysm mel {{blushEmoji}}',
                melHusband: 'has: 1 bitch of a husband!!',
                oneEnough: '(1 is enough)',
                nice69: 'hahahahahha 69',
                fire50: '50 is fire',
                goated20: '20 is goated',
                requested: 'requested by',
                errorCheckingBitches: 'error checking bitches',
                // Femboy Meter
                femboyMeter: 'femboy meter',
                notFemboy: 'nu arko says a guy not a femboy >:^',
                femboyPercent: 'is: **{percent}%** a femboy',
                notAFemboy: 'not a femboy',
                aLittleGirly: 'just a bit girly',
                maybeOne: 'maybe one',
                omgFemboy: 'omg a femboy hii :3',
                omgSoHigh: 'omg its so high',
                errorCheckingFemboy: 'error checking femboy meter',
                // Furry Meter
                furryMeter: 'furry meter',
                notFurry: 'arko is not a furry 🥀',
                furryPercent: 'is: **{percent}%** a furry',
                notAFurry: 'not a furry',
                aLittleFurry: 'just a bit furry',
                maybeOneF: 'maybe one',
                omgFurry: 'omg a furry >:3',
                omgSoHighF: 'omg its so high',
                yayaFurries: 'yayayayay i love furries :3',
                errorCheckingFurry: 'error checking furry meter',
                // Jewify
                jewified: 'jewification',
                jewifyTitle: 'user jewification',
                goyDetected: '(1%) barely a jew - Goy detected',
                halfBaked: '(2-25%) just a little jewish - Half baked',
                kosherEnough: '(26-50%) getting there - Kosher enough',
                shalom: '(51-75%) oy vey - Shalom',
                newWorldOrder: '(76-100%) they control the banks now - New world order',
                errorCheckingJewify: 'error jewifying user'
            };
        }
    }
    
    get commands() {
        return [
            {
                name: 'f-bitches',
                description: '(fun) check how many bitches someone has',
                options: [
                    {
                        name: 'user',
                        description: 'user to check',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'f-femboy-meter',
                description: '(fun) check how femboy someone is',
                options: [
                    {
                        name: 'user',
                        description: 'user to check',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'f-furry-meter',
                description: '(fun) check how furry someone is',
                options: [
                    {
                        name: 'user',
                        description: 'user to check',
                        type: 6,
                        required: true
                    }
                ]
            },
            {
                name: 'f-jewify',
                description: '(fun) turn someone into a jew',
                options: [
                    {
                        name: 'user',
                        description: 'user to jewify',
                        type: 6,
                        required: true
                    }
                ]
            }
        ];
    }
    
    async executeCommand(interaction, command) {
        switch (command.name) {
            case 'f-bitches':
                await this.handleBitches(interaction, interaction.options.getUser('user'));
                break;
            case 'f-femboy-meter':
                await this.handleFemboyMeter(interaction, interaction.options.getUser('user'));
                break;
            case 'f-furry-meter':
                await this.handleFurryMeter(interaction, interaction.options.getUser('user'));
                break;
            case 'f-jewify':
                await this.handleJewify(interaction, interaction.options.getUser('user'));
                break;
        }
    }
    
    async handleBitches(interaction, user) {
        try {
            await interaction.reply({ 
                content: '. . .',
                flags: MessageFlags.Ephemeral
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const userId = user.id;
            
            // Get user language
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = await this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (e) {
                // fallback to english
            }
            
            const funnyText = this.getFunnyText(userLanguage);
            
            if (userId === '1467343645786112142') {
                const message = funnyText.arkoWife.replace('{{blushEmoji}}', this.config.BLUSH_EMOJI);
                await interaction.followUp({ 
                    content: `<@${userId}> ${message}`,
                    ephemeral: false
                });
                return;
            }
            
            if (userId === '1339362764371656767') {
                await interaction.followUp({ 
                    content: `<@${userId}> ${funnyText.melHusband}`,
                    ephemeral: false
                });
                return;
            }
            
            let bitchesCount;
            const rand = Math.random();
            
            if (rand < 0.4) {
                bitchesCount = 0;
            } else if (rand < 0.7) {
                bitchesCount = Math.floor(Math.random() * 3) + 1;
            } else if (rand < 0.9) {
                bitchesCount = Math.floor(Math.random() * 7) + 4;
            } else {
                bitchesCount = Math.floor(Math.random() * 74) + 11;
                if (bitchesCount > 84) bitchesCount = 84;
            }
            
            let response;
            
            if (bitchesCount === 0) {
                response = `<@${userId}> ${funnyText.bitchesNone}`;
            } else {
                response = `<@${userId}> ${funnyText.bitchesCount} ${bitchesCount} bitches`;
                
                if (bitchesCount === 1) {
                    response += ` ${funnyText.oneEnough}`;
                } else if (bitchesCount === 69) {
                    response += ` ${funnyText.nice69}`;
                    
                } else if (bitchesCount >= 50) {
                    response += ` ${funnyText.fire50}`;
                } else if (bitchesCount >= 20) {
                    response += ` ${funnyText.goated20}`;
                }
                
            }
            
            const container = new ContainerBuilder()
                .setAccentColor(0x000000)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## ${funnyText.bitchesCounter}\n${response}`)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 256 }))
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# discord.gg/3ABxTE6UDE • ${funnyText.requested} ${interaction.user.username}`)
                );
            
            await interaction.followUp({ 
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                ephemeral: false
            });
            
        } catch (error) {
            console.error('error in handlebitches:', error);
            try {
                // Get user's language preference
                let userLanguage = 'english';
                try {
                    if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                        userLanguage = this.utils.getUserLanguage(interaction.user.id);
                    }
                } catch (err) {
                    // fallback to english
                }
                
                const funnyText = this.getFunnyText(userLanguage);
                
                if (!interaction.replied) {
                    await interaction.reply({
                        content: funnyText.errorCheckingBitches,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (e) {
                console.error('failed to send error message:', e);
            }
        }
    }
    
    async handleFemboyMeter(interaction, user) {
        try {
            await interaction.reply({ 
                content: '. . .',
                flags: MessageFlags.Ephemeral
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (err) {
                console.error('[Funny] Error getting user language:', err);
            }
            
            const funnyText = this.getFunnyText(userLanguage);
            const userId = user.id;
            
            if (userId === '1467343645786112142') {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`## ${funnyText.notFemboy}\n-# ${funnyText.requested} ${interaction.user.username}`)
                            )
                            .setButtonAccessory(
                                new ButtonBuilder()
                                    .setLabel('view gif')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL('https://tenor.com/view/vox-hazbin-hotel-kys-meme-gif-3243885136536603201.gif')
                            )
                    );
                
                await interaction.followUp({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [container],
                    ephemeral: false
                });
                return;
            }
            
            const femboyRate = Math.floor(Math.random() * 100) + 1;
            let message = '';
            
            if (femboyRate === 1) {
                message = funnyText.notAFemboy;
            } else if (femboyRate <= 25) {
                message = funnyText.aLittleGirly;
            } else if (femboyRate <= 50) {
                message = funnyText.maybeOne;
            } else if (femboyRate <= 75) {
                message = funnyText.omgFemboy;
            } else {
                message = funnyText.omgSoHigh;
            }
            
            const container = new ContainerBuilder()
                .setAccentColor(0xff66ff)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${user.username}'s ${funnyText.femboyMeter} ${this.config.EYES_EMOJI}\n${funnyText.femboyPercent.replace('{percent}', femboyRate)}\n${message}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 256 }))
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${funnyText.requested} ${interaction.user.username}`)
                );
            
            await interaction.followUp({ 
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                ephemeral: false
            });
            
        } catch (error) {
            console.error('error in handlefemboymeter:', error);
            try {
                // Get user's language preference
                let userLanguage = 'english';
                try {
                    if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                        userLanguage = this.utils.getUserLanguage(interaction.user.id);
                    }
                } catch (err) {
                    // fallback to english
                }
                
                const funnyText = this.getFunnyText(userLanguage);
                
                if (!interaction.replied) {
                    await interaction.reply({
                        content: funnyText.errorCheckingFemboy,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (e) {
                console.error('failed to send error message:', e);
            }
        }
    }
    
    async handleFurryMeter(interaction, user) {
        try {
            await interaction.reply({ 
                content: '. . .',
                flags: MessageFlags.Ephemeral
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (err) {
                console.error('[Funny] Error getting user language:', err);
            }
            
            const funnyText = this.getFunnyText(userLanguage);
            const userId = user.id;
            
            if (userId === '1467343645786112142') {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`## ${funnyText.notFurry}\n-# ${funnyText.requested} ${interaction.user.username}`)
                            )
                            .setButtonAccessory(
                                new ButtonBuilder()
                                    .setLabel('view gif')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL('https://tenor.com/view/vox-hazbin-hotel-kys-meme-gif-3243885136536603201.gif')
                            )
                    );
                
                await interaction.followUp({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [container],
                    ephemeral: false
                });
                return;
            }
            
            const furryRate = Math.floor(Math.random() * 100) + 1;
            let message = '';
            
            if (furryRate === 1) {
                message = funnyText.notAFurry;
            } else if (furryRate <= 25) {
                message = funnyText.aLittleFurry;
            } else if (furryRate <= 50) {
                message = funnyText.maybeOneF;
            } else if (furryRate <= 75) {
                message = funnyText.omgFurry;
            } else {
                message = funnyText.yayaFurries;
            }
            
            const container = new ContainerBuilder()
                .setAccentColor(0xff9966)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${user.username}'s ${funnyText.furryMeter} ${this.config.EYES_EMOJI}\n${funnyText.furryPercent.replace('{percent}', furryRate)}\n${message}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 256 }))
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${funnyText.requested} ${interaction.user.username}`)
                );
            
            await interaction.followUp({ 
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                ephemeral: false
            });
            
        } catch (error) {
            console.error('error in handlefurymeter:', error);
            try {
                // Get user's language preference
                let userLanguage = 'english';
                try {
                    if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                        userLanguage = this.utils.getUserLanguage(interaction.user.id);
                    }
                } catch (err) {
                    // fallback to english
                }
                
                const funnyText = this.getFunnyText(userLanguage);
                
                if (!interaction.replied) {
                    await interaction.reply({
                        content: funnyText.errorCheckingFurry,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (e) {
                console.error('failed to send error message:', e);
            }
        }
    }
    
    async handleJewify(interaction, user) {
        try {
            await interaction.reply({ 
                content: '. . .',
                flags: MessageFlags.Ephemeral
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (err) {
                console.error('[Funny] Error getting user language:', err);
            }
            
            const funnyText = this.getFunnyText(userLanguage);
            const userId = user.id;
            
            if (userId === '1467343645786112142') {
                const container = new ContainerBuilder()
                    .setAccentColor(0xffd700)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`## arko ${userLanguage === 'spanish' ? 'no es un maldito judío.' : "isn't a fucking jew."}\n-# ${funnyText.requested} ${interaction.user.username}`)
                            )
                            .setButtonAccessory(
                                new ButtonBuilder()
                                    .setLabel('view gif')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL('https://tenor.com/view/vox-hazbin-hotel-kys-meme-gif-3243885136536603201.gif')
                            )
                    );
                
                await interaction.followUp({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [container],
                    ephemeral: false
                });
                return;
            }
            
            const jewRate = Math.floor(Math.random() * 100) + 1;
            let message = '';
            
            if (jewRate === 1) {
                message = funnyText.goyDetected;
            } else if (jewRate <= 25) {
                message = funnyText.halfBaked;
            } else if (jewRate <= 50) {
                message = funnyText.kosherEnough;
            } else if (jewRate <= 75) {
                message = funnyText.shalom;
            } else {
                message = funnyText.newWorldOrder;
            }
            
            const container = new ContainerBuilder()
                .setAccentColor(0xffd700)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${user.username}'s ${funnyText.jewifyTitle}\nuser is: **${jewRate}%** ${userLanguage === 'spanish' ? 'judío' : 'jewish'}\n${message}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 256 }))
                        )
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(this.sewerJewGif)
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Ossyra Raiding Inc. - ${userLanguage === 'spanish' ? 'Confía en nosotros, con tu judificación.' : 'Trust us, with your jewishify.'}`)
                );
            
            await interaction.followUp({ 
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                ephemeral: false
            });
            
        } catch (error) {
            console.error('error in handlejewify:', error);
            try {
                // Get user's language preference
                let userLanguage = 'english';
                try {
                    if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                        userLanguage = this.utils.getUserLanguage(interaction.user.id);
                    }
                } catch (err) {
                    // fallback to english
                }
                
                const funnyText = this.getFunnyText(userLanguage);
                
                if (!interaction.replied) {
                    await interaction.reply({
                        content: funnyText.errorCheckingJewify,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (e) {
                console.error('failed to send error message:', e);
            }
        }
    }
    
    async handleButton(interaction) {
        return false;
    }
}

module.exports = FunnyCog;