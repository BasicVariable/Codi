const fs = require("node:fs");
const { Client, Events, Collection, Routes, GatewayIntentBits } = require('discord.js');

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
var commands = new Collection();

const setupCommands = async () => {

  if (!fs.readdirSync("./").includes("commandCache.json")) {
    await fs.promises.writeFile("./commandCache.json", "[]")
  };

  for (file of fs.readdirSync("./commands")){
    if (!file.endsWith(".js")) continue;

    const command = require(`../commands/${file}`);
    if ("name" in command && "reaction" in command){
      // They don't really need descriptions but, I'd like to know
      if (!"description" in command) console.log(`${file} is missing a description`);

      commands.set(command.name, command)
    }else{
      console.log(`${file} is missing a name or reaction`)
    }
  };

  // This entire section is for caching updated slash commands, change to name/description or a new command = update
  const commandCache = JSON.parse(await fs.promises.readFile("./commandCache.json"));
  let cacheKeys=Object.keys(commandCache),cacheValues=Object.values(commandCache);
  let differences = [...commands.entries()].filter(command => cacheKeys.indexOf(command[0])==-1 || cacheValues.indexOf(command[1].description)==-1);

  if (differences.length>0){
    let formatedCommands = [];
    let cacheFormat = {};

    for ([key, value] of commands.entries()){
      formatedCommands.push({"name":key, "description": value.description});
      cacheFormat[key]=value.description
    };

    client.rest.put(
      Routes.applicationCommands(client.application.id),
      {body: formatedCommands}
    );

    console.log(`Updated ${differences.length} commands`);
   
    fs.writeFileSync("./commandCache.json", JSON.stringify(cacheFormat))
  }
};

const start = () => {
  const botPrefix = serverConfig.discordBot.prefix;

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    let command = commands.get(interaction.commandName);
    if (!command) {
      console.log(`command (${interaction.commandName}) is invalid`);
      return
    };

    try{
      await command.reaction(interaction)
    }catch(err){
      console.log(err);
      interaction.reply({content:`${interaction.commandName} failed to respond`, ephemeral: true})
    }
  });

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

  client.once(Events.ClientReady, () => setupCommands());

  client.login(serverConfig.discordBot.token)
};

module.exports = {start}