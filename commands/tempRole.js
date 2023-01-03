const { QuickDB } = require("quick.db");
const tempRolesDb = new QuickDB({ filePath: './botData/tempRoles_json.sqlite' });
const stringSimilarity = require("string-similarity");

const delay = ms => new Promise(res => setTimeout(res, ms));

var subCommands = {};

const fixTime = (difference) => {
    const timer = {
        months: Math.floor(difference / (1000 * 60 * 60 * 24 * 30)),
        days: Math.floor(difference / (1000 * 60 * 60 * 24) % 30),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
    };

    return (difference<0)?"expired":`${timer.months}m:${timer.days}d:${timer.hours}h:${timer.minutes}m:${timer.seconds}s`
};

const text2num = text => {
    let letter = text.replace(/\d+/, "").toLowerCase();
    let number = parseInt(text.replace(/^\D+/g));

    var milliseconds;
    
    switch (letter) {
        case "d":
            milliseconds = 86400000;
            break;

        case "w":
            milliseconds = 604800000;
            break;

        case "m":
            milliseconds = 2.629746e+9;
            break;

        case "y":
            milliseconds = 33.1556952e+10;
            break;
    
        case "h":
            milliseconds = 3600000;
            break;
        
        default:
            // assume it's minutes
            if (isNaN(number)) milliseconds = 60000; 
            return null;
    };

    return (milliseconds*number)
};

const similaristRole = (guild, selectedRole) => {
    let distanceMap = new Map();

    for (role of guild.roles.cache){
        let distance = stringSimilarity.compareTwoStrings((role[1].name).toLowerCase(), selectedRole.toLowerCase());

        distanceMap.set(
            role[1].id,
            distance
        )
    };

    let sortedMap = [...distanceMap.entries()].sort((a, b) => b[1]-a[1]);
    let closest = sortedMap.entries().next().value[1];

    if (closest[1]>0.2) return closest[0];
    return null
};

const createQuestion = async (interaction, question) => {
    const message = {
        content: `${question}\n*Action automatically cancels in 60 seconds*`,
        components: [
            {
                "type": 1,
                "components": [
                {
                    "style": 1,
                    "label": `✅`,
                    "custom_id": `accept`,
                    "disabled": false,
                    "type": 2
                },
                {
                    "style": 1,
                    "label": `❌`,
                    "custom_id": `decline`,
                    "disabled": false,
                    "type": 2
                }
                ]
            }
        ],
        ephemeral: true,
        fetchReply: true
    };

    let botQuestion; botQuestion = await interaction.reply(message)
        .catch(async () => {
            botQuestion = await interaction.editReply(message)
        });

    return await new Promise(async (resolve) => {
        const filter = (i) => i.componentType == 2;

        (botQuestion || await interaction.fetchReply()).awaitMessageComponent({filter, time: 60_000, errors: ['time']})
            .then(i => {
                i.deferUpdate();

                if (i.customId==="accept") resolve(true); else
                    resolve(false);
            })
            .catch(() => resolve(false));
    })
};

subCommands["edit-time"] = async (interaction, options) => {
    let guild = await global.discordClient.guilds.cache.get(interaction.guildId);

    let selectedUser = await guild.members.fetch((options[0].value).replace(/[^0-9.]/g,""));
    if (selectedUser==null) return "Failed to find selected user";

    let userQuestionResponse = await createQuestion(interaction, `Is '${selectedUser.user.username} (${selectedUser.id})' the user you selected?`);
    if (!userQuestionResponse) return "Action canceled.";

    let clostestToName = similaristRole(guild, options[1].value);
    if (clostestToName==null) return "Failed to find selected role";

    let selectedRole = await guild.roles
        .fetch(clostestToName)

    let roleQuestionResponse = await createQuestion(interaction, `Is "${selectedRole.name}" the role you selected?`);
    if (!roleQuestionResponse) return "Action canceled";

    let tempRole = await tempRolesDb.get(`${selectedUser.id}.${selectedRole.id}`);
    if (tempRole==null) "Selected user doesn't have selected temp-role.";

    let selectedTime = text2num((options[2].value).replace(/[-+]/g,""));
    if (selectedTime==null) return "Invalid time format. The correct format is d/w/m/y/h(amount of selected), don't add a type if you want to use minutes.";

    let operator = (options[2].value).replace(/[^-+]/g,"");
    let solution = (operator==="+")?tempRole[1]+selectedTime:tempRole[1]-selectedTime;

    await tempRolesDb.set(`${selectedUser.id}.${selectedRole.id}`, [tempRole[0], (solution<0)?0:solution]);

    tempRole = await tempRolesDb.get(`${selectedUser.id}.${selectedRole.id}`);
    return `${selectedUser.user.username} now has a remaining time of ${fixTime(tempRole[1] - (Date.now() - tempRole[0]))}`
};

subCommands["time-left"] = async (interaction, options) => {
    await interaction.reply({content: "Grabbing list of temp-roles."});

    let guild = await global.discordClient.guilds.cache.get(interaction.guildId);

    // No idea how to not make this an eyesore
    let selectedUser = (options[0]!=null)?
        await guild.members.fetch(
            (options[0].value).replace(/[^0-9.]/g,"")
        )
    :
        interaction.user;

    if (selectedUser==null) return "Failed to get selected user";

    let userData = await tempRolesDb.get(selectedUser.id);
    if (userData==null) return "User doesn't have any saved temp-roles";

    let message = {
        "embeds": [
            {
                "type": "rich",
                "title": `Temp-roles`,
                "description": `Current list of temp-roles for ${selectedUser.username || selectedUser.user.username}`,
                "color": 0xa90000,
                "fields": [],
                "timestamp": new Date(),
                "author": {
                "name": `Codi`,
                "url": `https://github.com/BasicVariable/Codi`,
                "icon_url": `https://cdn.discordapp.com/attachments/1049422920092495924/1049423749134430258/IMG_0930.png`
                },
                "footer": {
                "text": `discord.gg/callie • Basic#2142`,
                "icon_url": `https://cdn.discordapp.com/attachments/616460506231865357/1050421211752058910/Untitled_Artwork.png`
                }
            }
        ]
    };

    if ((Object.keys(userData)).length <= 0) return "Selected user has no temp-roles";

    for (role of Object.keys(userData)){
        let roleName = (await guild.roles.fetch(role)).name;

        message.embeds[0].fields.push(
            {
                "name": `• ${roleName}`,
                "value": `*Time left:* ${fixTime(userData[role][1] - (Date.now() - userData[role][0]))}`
            }
        )
    };

    try{
        await interaction.channel.send(message);
    }catch(err){
        console.log(err);
        return "Failed to send list, try again?"
    };

    return "Sent list of temp-roles"
};

subCommands["add-role"] = async (interaction, options) => {
    let guild = await global.discordClient.guilds.cache.get(interaction.guildId);

    let selectedUser = await guild.members.fetch((options[0].value).replace(/[^0-9.]/g,""));
    if (selectedUser==null) return "Failed to find selected user";

    let userQuestionResponse = await createQuestion(interaction, `Is '${selectedUser.user.username} (${selectedUser.id})' the user you selected?`);
    if (!userQuestionResponse) return "Action canceled.";

    let clostestToName = similaristRole(guild, options[1].value);
    if (clostestToName==null) return "Failed to find selected role";

    let selectedRole = await guild.roles
        .fetch(clostestToName)

    let roleQuestionResponse = await createQuestion(interaction, `Is "${selectedRole.name}" the role you selected?`);
    if (!roleQuestionResponse) return "Action canceled";

    let userData = await tempRolesDb.get(selectedUser.id);
    if (userData==null) await tempRolesDb.set(selectedUser.id, {});

    let selectedTime = text2num(options[2].value);
    if (selectedTime==null) return "Invalid time format. The correct format is d/w/m/y/h(amount of selected), don't add a type if you want to use minutes.";

    await tempRolesDb.set(`${selectedUser.id}.${selectedRole.id}`, [Date.now(), selectedTime]);

    let hasRole = selectedUser.roles.cache.find(role => role.id == selectedRole.id);
    if (hasRole) return "User already had role, overwrote temprole data for role on user's data. Use edit-role for something similar 🙄";

    try{
        await selectedUser.roles.add(selectedRole.id)
    }catch{
        return "Failed to add role to user"
    };

    return "User received role."
};

const response = async (interaction, options) => {
    let subcommandResponse = await subCommands[(Object.keys(options)[0])](interaction, options[Object.keys(options)[0]]) || `Command failed to respond`;

    interaction.reply({content: subcommandResponse + "\n**This response will be deleted in 10 seconds.**", components:[{}], ephemeral: true})
        .catch(err => {
            // incase I reply in an interaction function already
            interaction.editReply({content: subcommandResponse + "\n**This response will be deleted in 10 seconds.**", ephemeral: true})
                .catch(err2 => console.log(err, err2));
        });

    setTimeout(()=>{
        interaction.deleteReply()
            .catch(err => console.log(err));
    }, 10000)
};

new Promise(async () => {
    while(true){
        let savedUsers = await tempRolesDb.all();

        for (user of savedUsers)try{
            for (role of Object.keys(user.value)){
                let roleData = user.value[role];

                if (roleData[1] - (Date.now() - roleData[0]) < 0){
                    let selectedUser, selectedRole;

                    for (guild of global.discordClient.guilds.cache){
                        selectedRole = guild[1].roles.cache.find(gRole => gRole.id === role);

                        if (selectedRole!=null) 
                            selectedUser = await guild[1].members.fetch(user.id);
                    };

                    if (selectedUser!=null)
                        await selectedUser.roles.remove(selectedRole);
                    
                    tempRolesDb.delete(`${user.id}.${role}`);
                }
                    
            };
        }catch(err){console.log(err)};
            
        await delay(60000)
    }
})

module.exports = {
    name: "temp-role",
    description: "Temprole manager.",
    options: [
        {
            "name": "add-role",
            "description": "Temporarily adds a role to a user.",
            "type": 1,
            "options": [
                {
                    "name": "user",
                    "description": "The use to add a role to.",
                    "type": 3,
                    "required": true
                },
                {
                    "name": "role",
                    "description": "The role you'd like to give.",
                    "type": 3,
                    "required": true
                },
                {
                    "name": "time",
                    "description": "The time the user will have the role.",
                    "type": 3,
                    "required": true
                }
            ],
            permissions: ["Owner"]
        },
        {
            "name": "time-left",
            "description": "Gets all the roles and how much time they'll last from a user.",
            "type": 1,
            "options": [
                {
                    "name": "user",
                    "description": "The user you'd like to see remaining temp-roles.",
                    "type": 3,
                    "required": false
                }
            ],
            permissions: []
        },
        {
            "name": "edit-time",
            "description": "Edits the remaining time a user will have a role for.",
            "type": 1,
            "options": [
                {
                    "name": "user",
                    "description": "The use to add a role to.",
                    "type": 3,
                    "required": true
                },
                {
                    "name": "role",
                    "description": "The role you'd like to give.",
                    "type": 3,
                    "required": true
                },
                {
                    "name": "time",
                    "description": "The amount of time you'd like to add or subtract (+/-time).",
                    "type": 3,
                    "required": true
                }
            ],
            permissions: ["Owner"]
        }
    ],
    permissions: ["Owner"],
    reaction: response
}