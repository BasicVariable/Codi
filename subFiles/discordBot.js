const fs = require("node:fs");
const { Client, Events, Collection, Routes, GatewayIntentBits } = require('discord.js');

global.discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// ----
let recuringResponses = require("./recuringResponses.js");
// ----
global.discordCommands = new Collection();

const setupCommands = async () => {

  if (!fs.readdirSync("./").includes("commandCache.json")) {
    await fs.promises.writeFile("./commandCache.json", "[]")
  };

  for (file of fs.readdirSync("./commands")){
    if (!file.endsWith(".js")) continue;

    const command = require(`../commands/${file}`);
    if ("name" in command && "reaction" in command && "permissions" in command){
      // They don't really need descriptions but, I'd like to know
      if (!"description" in command) console.log(`${file} is missing a description`);

      discordCommands.set(command.name, command)
    }else{
      console.log(`${file} is missing its name, permissions, or reaction`)
    }
  };

  // This entire section is for caching updated slash commands, change to name/description or a new command = update
  const commandCache = JSON.parse(await fs.promises.readFile("./commandCache.json"));
  let cacheKeys=Object.keys(commandCache),cacheValues=Object.values(commandCache);
  let differences = [...discordCommands.entries()].filter(command => cacheKeys.indexOf(command[0])==-1 || cacheValues.indexOf(command[1].description)==-1);

  if (differences.length>0){
    let formatedCommands = [];
    let cacheFormat = {};

    for ([key, value] of discordCommands.entries()){
      formatedCommands.push({"name":key, "description": value.description, "options": value.options});
      cacheFormat[key]=value.description
    };

    discordClient.rest.put(
      Routes.applicationCommands(discordClient.application.id),
      {body: formatedCommands}
    );

    console.log(`Updated ${differences.length} commands`);
   
    fs.writeFileSync("./commandCache.json", JSON.stringify(cacheFormat))
  }
};

discordClient.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  let command = discordCommands.get(interaction.commandName);
  if (!command) {
    console.log(`command (${interaction.commandName}) is invalid`);
    return
  };

  let user = interaction.guild.members.cache.get(interaction.user.id);
  if (user==null) return;

  // permissions is an array of roles allowed to use a command, if it's empty anyone can use it
  if (command.permissions.length>0 && !user.roles.cache.some(role => command.permissions.includes(role.name))) {
    interaction.reply({content:`You aren't allowed to use ${interaction.commandName}`, ephemeral: true})
      .catch(err => console.log(err));
    return
  };

  try{
    /*
      I just wanted the options to be formatted like:
      {
        optionName: value
      }
    */
    // remove this later, I wanted it now I dont
    let fixedOptions = await interaction.options.data.reduce(
      (options, option) => Object.assign(options, {
        [option.name]: option.value || option.options
      }), {}
    );

    await command.reaction(interaction, fixedOptions)
  }catch(err){
    console.log(err);
    interaction.reply({content:`${interaction.commandName} failed to respond`, ephemeral: true})
      .catch(error => console.log(error));
  }
});

discordClient.on("messageCreate", message => {
  const botPrefix = serverConfig.discordBot.prefix;

  if (message.author.bot) return;

  if (message.content.substring(0, botPrefix.length)  === botPrefix){
      // text command handler soon^tm
  }else{
    let reply = recuringResponses(message.content);

    if (reply) message.reply(reply)
      .catch(console.error);
  }
});

const start = () => {
  discordClient.once(Events.ClientReady, () => {
    setupCommands();
    console.log("Discord bot started")
  });

  discordClient.login(serverConfig.discordBot.token)
};

module.exports = {start}