const { ChannelType, PermissionFlagsBits } = require('discord.js');

const { QuickDB } = require("quick.db");
const ticketsDb = new QuickDB({ filePath: './botData/tickets_json.sqlite' })

var subCommands = {};

const monitorTicketMaster = (message, catagory, guild) => {
    const filter = (interaction) => interaction.componentType == 2;

    const collector = message.createMessageComponentCollector({ filter });

    collector.on('collect', async (i) => {
        try{
            await i.reply({content: "Creating ticket...", ephemeral: true});

            let currentTickets = (await ticketsDb.get(message.channelId)).tickets;
            console.log(currentTickets, i.user.id);
            if (currentTickets[i.user.id]) {
                i.editReply({content: "You already have a ticket opened.", ephemeral: true});
                return
            };

            let channel = await guild.channels.create({name: `${i.user.username}s ticket`, type: ChannelType.GuildText, parent: catagory.id,  permissionOverwrites:[
                {
                    id: i.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: i.user.id,
                    allow: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: i.guild.roles.cache.find(r => r.name === "Moderation Staff"),
                    allow: [PermissionFlagsBits.ViewChannel]
                }
            ]});

            await ticketsDb.set(`${message.channelId}.tickets.${i.user.id}`, channel.id);

            await channel.send(`<@${i.user.id}>, a staff member will be with you soon. Mass-pinging staff will get your ticket removed or put at the end of the queue.`);

            i.editReply({content: `Opened ticket at <#${channel.id}>`, ephemeral: true})
        }catch(err){
            console.log(err)
        }
    });
};  

subCommands["prompt-creation"] = async (interaction, options) => {
    let catagory = (isNaN(options[1].value))?
        interaction.guild.channels.cache.find(c => (c.name).toLowerCase() === (options[1].value).toLowerCase() && c.type == 4):await interaction.guild.channels.cache.get(options[1].value);
    if (catagory==null) return "Failed to create ticket-master: can't find ticket catagory";

    let starterEmbed = {
        "components": [
            {
                "type": 1,
                "components": [
                    {
                        "style": 1,
                        "label": `🎟️`,
                        "custom_id": `ticket_${options[0].value}`,
                        "disabled": false,
                        "type": 2
                    }
                ]
            }
        ],
        "embeds": [
            {
                "type": "rich",
                "title": options[0].value,
                "description": `Press the 🎟️ button to create a ticket.`,
                "color": 0xa90000,
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

    let message = await interaction.channel.send(starterEmbed);
    // Object for ticket channels 
    await ticketsDb.set(message.channelId, {guild: message.guild.id, message: message.id, catagory: catagory.id, tickets: {}});

    monitorTicketMaster(message, catagory, interaction.guild);

    return "Created ticket-master for this channel (any old ticket-master was overwritten)"
};

subCommands["edit-title"] = async (interaction, options) => {
    let message = await interaction.channel.messages.fetch(
        (await ticketsDb.get(interaction.channel.id)).message
    );
    if (message==null) return "Saved message has either been deleted or doesn't exit, please use 'prompt-create' to make a new ticket-master.";

    let editedEmbed = Object.assign({}, message.embeds[0].data);
    editedEmbed.title=options[0].value;

    message.edit({"embeds":[editedEmbed]});

    return "Edited title."
};

subCommands["close-ticket"] = async (interaction, options) => {
    await interaction.reply({content: "Checking channel.", ephemeral: true});

    let isTicket = await (async () => {
        let array = await ticketsDb.all();
        for (ticketMaster of array) {
            let matches = Object.values(ticketMaster.value.tickets)
                .indexOf((interaction.channelId).toString());

            if (matches>=0) return ticketMaster.id;
        }
    })();

    if (isTicket==null) return "This channel isn't a ticket...";

    let channel = interaction.guild.channels.cache.get(ticketMaster.id);
    await interaction.user.send(`Your ticket, made from ${channel.name}, was closed for:\n\n${(options.length>0)?options[0].value:"no reason"}`);

    setTimeout(()=>{
        interaction.channel.delete();
    }, 15000)

    await ticketsDb.delete(`${isTicket}.tickets.${interaction.user.id}`);

    return "Deleting channel in 15 seconds."
};

subCommands["edit-description"] = async (interaction) => {
    let message = await interaction.channel.messages.fetch(
        (await ticketsDb.get(interaction.channel.id)).message
    );
    if (message==null) return "Saved message has either been deleted or doesn't exit, please use 'prompt-create' to make a new ticket-master.";

    let editedEmbed = Object.assign({}, message.embeds[0].data);

    interaction.reply({content: "Found message, please input the description. Type 'cancel' to stop the edit.", ephemeral: true});

    const filter = (m) => {
        return m.author.id === interaction.user.id
    };

    let responsePromise = await new Promise((resolve)=>{
        interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
            .then(answers => {
                if (answers.first().content === "cancel") resolve(false);
                editedEmbed.description=answers.first().content;

                message.edit({"embeds":[editedEmbed]});

                answers.first().delete();

                resolve(true)
            })
            .catch(() => resolve(false));
    });

    if (responsePromise==false) return "Description edit canceled midway.";
    return "Edited description."
};

subCommands["edit-fields"] = async (interaction, options) => {
    let message = await interaction.channel.messages.fetch(
        (await ticketsDb.get(interaction.channel.id)).message
    );
    if (message==null) return "Saved message has either been deleted or doesn't exit, please use 'prompt-create' to make a new ticket-master.";

    let editedEmbed = Object.assign({}, message.embeds[0].data);

    const filter = (m) => {
        return m.author.id === interaction.user.id
    };

    switch (options[0].name) {
        case "add":
            let newField = {name: options[0].options[0].value};

            interaction.reply({content: "Found message, please input the description for the new field. Type 'cancel' to stop the edit.", ephemeral: true});

            let addPromise = await new Promise((resolve)=>{
                interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
                    .then(answers => {
                        if (answers.first().content === "cancel") resolve(false);
                        newField.value=answers.first().content;

                        if (editedEmbed["fields"]==null) editedEmbed.fields=[];
                        editedEmbed.fields.push(newField);

                        message.edit({"embeds":[editedEmbed]});
        
                        answers.first().delete();
        
                        resolve(true)
                    })
                    .catch(() => resolve(false));
            });

            if (addPromise==false) return "Field addition canceled midway.";
            return "Added field to embed.";
        case "remove":
            // options[0].options[0].value is the position option, why
            if (editedEmbed["fields"]==null || editedEmbed.fields[options[0].options[0].value]==null) 
                return "The field you selected doesn't exist, when selecting a field be sure to start from 0 when selecting a field.";

            editedEmbed.fields.splice(options[0].options[0].value, 1);
            message.edit({"embeds":[editedEmbed]});

            return "Removed Field from embed.";
        case "edit":
            if (editedEmbed["fields"]==null || editedEmbed.fields[options[0].options[0].value]==null) 
                return "The field you selected doesn't exist, when selecting a field be sure to start from 0 when selecting a field.";

            // options[0].options[1].value is the title option, again why
            if (options[0].options[1]!=null && options[0].options[1].value.length>0)
                editedEmbed.fields[options[0].options[0].value].title = options[0].options[1].value;
            
            interaction.reply({content: "Found message, please input the description for the field. Type 'cancel' to stop the edit.", ephemeral: true});

            let editPromise = await new Promise((resolve)=>{
                interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
                    .then(answers => {
                        if (answers.first().content === "cancel") resolve(false);

                        editedEmbed.fields[options[0].options[0].value].value=answers.first().content;
                        message.edit({"embeds":[editedEmbed]});

                        answers.first().delete();
        
                        resolve(true)
                    })
                    .catch(() => resolve(false));
            });   

            if (editPromise==false) return "Field edit canceled midway.";
            return `Edited field ${options[0].options[0].value}.`;
    }
};

const response = async (interaction, options) => {
    let subcommandResponse = await subCommands[(Object.keys(options)[0])](interaction, options[Object.keys(options)[0]]) || `Command failed to respond`;

    interaction.reply({content: subcommandResponse + "\n**This response will be deleted in 30 seconds.**", ephemeral: true})
        .catch(err => {
            // incase I reply in an interaction function already
            interaction.editReply({content: subcommandResponse + "\n**This response will be deleted in 30 seconds.**", ephemeral: true})
                .catch(err2 => console.log(err, err2));
        });

    setTimeout(()=>{
        interaction.deleteReply()
            .catch(err => console.log(err));
    }, 30000)
};

// loads all current ticket-masters
ticketsDb.all().then(async (array) => {
    for (ticketMaster of array){
        try{

            let guild = await global.discordClient.guilds.cache.get(ticketMaster.value.guild);

            let message = await guild.channels.cache.get(ticketMaster.id)
                .messages.fetch(ticketMaster.value.message);

            let catagory = await guild.channels.cache.get(ticketMaster.value.catagory);

            monitorTicketMaster(message, catagory, guild)
        }catch(err) {console.log(err)};
    }
});

module.exports = {
    name: "ticket-master",
    description: "Manager for Codi's ticketing system, interact with the command to view its subcommands!",
    options: [
        {
            "name": "prompt-creation",
            "description": "Creates a base embed editable through other commands, input a title.",
            "type": 1,
            "options": [
                {
                    "name": "title",
                    "description": "The ticket-master's title.",
                    "type": 3,
                    "required": true
                },
                {
                    "name": "category",
                    "description": "Where the ticket-master will open tickets.",
                    "type": 3,
                    "required": true
                }
            ]
        },
        {
            "name": "edit-title",
            "description": "Edits the current channel's ticket-master's title.",
            "type": 1,
            "options": [
                {
                    "name": "title",
                    "description": "The new title.",
                    "type": 3,
                    "required": true
                }
            ]
        },
        {
            "name": "close-ticket",
            "description": "Closes and deleted the ticket channel this command is ran in.",
            "type": 1,
            "options": [
                {
                    "name": "reason",
                    "description": "Reason for closing the ticket (you don't need one).",
                    "type": 3,
                    "required": false
                }
            ]
        },
        {
            "name": "edit-description",
            "description": "Edits the current channel's ticket-master's description.",
            "type": 1
        },
        {
            "name": "edit-fields",
            "description": "Edits the current channel's ticket-master's fields.",
            "type": 2,
            "options": [
                {
                    "name": "add",
                    "description": "Adds a field to the ticket-master.",
                    "type": 1,
                    "options": [
                        {
                            "name": "title",
                            "description": "Title of the field you'd like to create.",
                            "type": 3,
                            "required": true
                        }
                    ]
                },
                {
                    "name": "remove",
                    "description": "Removes a field from the embed.",
                    "type": 1,
                    "options": [
                        {
                            "name": "position",
                            "description": "Field you'd like to select (starts from 0).",
                            "type": 4,
                            "required": true
                        }
                    ]
                },
                {
                    "name": "edit",
                    "description": "Edits a field from the embed.",
                    "type": 1,
                    "options": [
                        {
                            "name": "position",
                            "description": "Field you'd like to select (starts from 0).",
                            "type": 4,
                            "required": true
                        },
                        {
                            "name": "title",
                            "description": "New title, leave empty to keep it the same.",
                            "type": 3,
                            "required": false
                        }
                    ]
                }
            ]
        }
    ],
    permissions: ["Owner", "Cali Fan🤞", "Moderation Staff"],
    reaction: response
}