// FIX: Export structure ko standard object mein badla gaya hai, 'TypeError: Button is not a constructor' fix karne ke liye.

const { Interaction, Client } = require('discord.js');

module.exports = {
    data: {
        customId: 'help_previous',
    },
    
    /**
     * 'help_previous' button click hone par chalta hai.
     * Main logic (page change) /help command ke Interaction Collector mein hai.
     * @param {Interaction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        // Collector is interaction ko intercept aur handle karega.
        // Yahaan koi custom logic nahi chahiye.
    },
};
