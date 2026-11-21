const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

class MathCog {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = 'math';
        this.utils = client.cogs.get('utils');
    }
    
    getCalculatorText(language) {
        if (language === 'spanish') {
            return {
                title: 'Calculadora',
                notYourCalc: 'no es tu calculadora, usa `/calculator` para la tuya.',
                errorOccurred: 'Un error ocurrió con el comando calculadora.',
                calcError: 'Error de calculadora.',
                footer: 'Confía en nosotros, con tus matemáticas.'
            };
        } else {
            return {
                title: 'Calculator',
                notYourCalc: 'ts aint yo calculator yo use `/calculator` for your own.',
                errorOccurred: 'An error occurred with calculator command.',
                calcError: 'Calculator error occurred.',
                footer: 'Trust us, with your math.'
            };
        }
    }
    
    get commands() {
        return [
            {
                name: 'm-calculator',
                description: '(misc) FREE MATH FRFRFR'
            }
        ];
    }
    
    async executeCommand(interaction, command) {
        switch (command.name) {
            case 'm-calculator':
                await this.handleCalculator(interaction);
                break;
        }
    }
    


    async handleCalculator(interaction) {
        try {
            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (err) {
                console.error('[Math] Error getting user language:', err);
            }
            
            const calcText = this.getCalculatorText(userLanguage);
            
            await interaction.reply({ 
                content: '. . .',
                flags: MessageFlags.Ephemeral
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const userId = interaction.user.id;
            const view = new CalculatorView(userId);
            const embed = new EmbedBuilder()
                .setTitle(calcText.title)
                .setDescription('```\n0\n```')
                .setColor(0x000000)
                .setFooter({ text: calcText.footer });
            

            await interaction.followUp({ 
                embeds: [embed],
                components: [view.components[0], view.components[1], view.components[2], view.components[3]],
                ephemeral: false
            });
            
            const calculatorId = `${interaction.id}_calculator`;
            this.client.calculators = this.client.calculators || {};
            this.client.calculators[calculatorId] = {
                expression: '',
                message: null,
                userId: userId
            };
            
        } catch (error) {
            console.error('Error in handleCalculator:', error);
            try {
                // Get user's language for error message
                let userLanguage = 'english';
                try {
                    if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                        userLanguage = this.utils.getUserLanguage(interaction.user.id);
                    }
                } catch (err) {
                    console.error('[Math] Error getting user language:', err);
                }
                
                const calcText = this.getCalculatorText(userLanguage);
                
                if (!interaction.replied) {
                    await interaction.reply({
                        content: calcText.errorOccurred,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (e) {
                console.error('Failed to send error message:', e);
            }
        }
    }
    
    async handleButton(interaction) {
        const customId = interaction.customId;
        
        if (customId.includes('_calc_')) { 
            await this.handleCalculatorButton(interaction, customId);
            return true;
        }
        
        return false;
    }
    
    async handleCalculatorButton(interaction, customId) {
        try {
            // Get user's language preference
            let userLanguage = 'english';
            try {
                if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                    userLanguage = this.utils.getUserLanguage(interaction.user.id);
                }
            } catch (err) {
                console.error('[Math] Error getting user language:', err);
            }
            
            const calcText = this.getCalculatorText(userLanguage);
            
            const parts = customId.split('_');
            const userId = parts[0]; 
            const buttonId = parts.slice(2).join('_'); 
            
            if (interaction.user.id !== userId) {
                await interaction.reply({
                    content: calcText.notYourCalc,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            
            const calculatorId = `${interaction.message.id}_calculator`;
            this.client.calculators = this.client.calculators || {};
            
            if (!this.client.calculators[calculatorId]) {
                this.client.calculators[calculatorId] = {
                    expression: '',
                    message: interaction.message,
                    userId: userId
                };
            }
            
            const calc = this.client.calculators[calculatorId];

            if (buttonId === 'clear') {
                calc.expression = '';
            } else if (buttonId === 'equals') {
                try {
                    if (calc.expression.trim() === '') {
                        calc.expression = '0';
                    } else {
                        let expr = calc.expression
                            .replace(/÷/g, '/')
                            .replace(/×/g, '*')
                            .replace(/−/g, '-');
                        
                        const safeExpr = expr.match(/^[\d+\-*/.()\s]+$/);
                        if (!safeExpr) {
                            calc.expression = 'Error';
                        } else {
                            const result = new Function('return ' + expr)();
                            calc.expression = result.toString();
                        }
                    }
                } catch (error) {
                    calc.expression = 'Error';
                }
            } else {
                calc.expression += buttonId;
            }
            
            const embed = new EmbedBuilder()
                .setTitle(calcText.title)
                .setDescription(`\`\`\`\n${calc.expression || '0'}\n\`\`\``)
                .setColor(0x000000)
                .setFooter({ text: calcText.footer });
            
            await interaction.update({ 
                embeds: [embed],
                components: interaction.message.components
            });
            
        } catch (error) {
            console.error('Error in handleCalculatorButton:', error);
            try {
                // Get user's language for error message
                let userLanguage = 'english';
                try {
                    if (this.utils && typeof this.utils.getUserLanguage === 'function') {
                        userLanguage = this.utils.getUserLanguage(interaction.user.id);
                    }
                } catch (err) {
                    console.error('[Math] Error getting user language:', err);
                }
                
                const calcText = this.getCalculatorText(userLanguage);
                
                await interaction.reply({
                    content: calcText.calcError,
                    flags: MessageFlags.Ephemeral
                });
            } catch (e) {
                console.error('Failed to send error message:', e);
            }
        }
    }
}

class CalculatorView {
    constructor(userId) {
        this.userId = userId;
        this.components = this.buildCalculatorButtons();
    }
    
    buildCalculatorButtons() {
        const createButton = (label, buttonId, style) => {
            return new ButtonBuilder()
                .setCustomId(`${this.userId}_calc_${buttonId}`)
                .setLabel(label)
                .setStyle(style);
        };
        
        const row0 = new ActionRowBuilder()
            .addComponents(
                createButton('7', '7', ButtonStyle.Secondary),
                createButton('8', '8', ButtonStyle.Secondary),
                createButton('9', '9', ButtonStyle.Secondary),
                createButton('÷', '÷', ButtonStyle.Primary)
            );
        
        const row1 = new ActionRowBuilder()
            .addComponents(
                createButton('4', '4', ButtonStyle.Secondary),
                createButton('5', '5', ButtonStyle.Secondary),
                createButton('6', '6', ButtonStyle.Secondary),
                createButton('×', '×', ButtonStyle.Primary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                createButton('1', '1', ButtonStyle.Secondary),
                createButton('2', '2', ButtonStyle.Secondary),
                createButton('3', '3', ButtonStyle.Secondary),
                createButton('−', '−', ButtonStyle.Primary)
            );
        
        const row3 = new ActionRowBuilder()
            .addComponents(
                createButton('0', '0', ButtonStyle.Secondary),
                createButton('C', 'clear', ButtonStyle.Danger),
                createButton('=', 'equals', ButtonStyle.Success),
                createButton('+', '+', ButtonStyle.Primary)
            );
        
        return [row0, row1, row2, row3];
    }
}

module.exports = MathCog;