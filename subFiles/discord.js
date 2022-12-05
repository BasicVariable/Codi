const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// ----
let recuringResponses = require("./recuringResponses.js");
// ----

const start = () => {
    const botPrefix = serverConfig.discordBot.prefix;

    client.on("messageCreate", message => {
        if (message.author.bot) return;

        if (message.content.substring(0, botPrefix.length)  === botPrefix){
            // Command handler soon^tm
        }else{
            let reply = recuringResponses(message.content);

            if (reply) message.reply(reply)
                .catch(console.error);
        }

    });

    client.login(serverConfig.discordBot.token)
};

module.exports = {start}