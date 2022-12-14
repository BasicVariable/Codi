const response = async (interaction, options) => {
    var currentPage = 0;
    let helpEmbed = {
        "components": [
            {
                "type": 1,
                "components": [
                {
                    "style": 1,
                    "label": `◀`,
                    "custom_id": `backPage`,
                    "disabled": false,
                    "type": 2
                },
                {
                    "style": 1,
                    "label": `▶`,
                    "custom_id": `frontPage`,
                    "disabled": false,
                    "type": 2
                }
                ]
            }
        ],
        "embeds": [
            {
                "type": "rich",
                "title": `Command List (Page: 0)`,
                "description": `Current list of commands that can be given to Codi. The ♻️ emoji means anyone can use a command while the 👑 emoji means only the guild owner can use the command.`,
                "color": 0xa90000,
                "fields": [
                {
                    "name": `• AAAA`,
                    "value": `AAAAAAAAAAAAAAAAAAAAA`
                }
                ],
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
        ],
        fetchReply: true
    };
    let pages = [];

    for (command of global.discordCommands.entries()){
        let name = command[0], properties = command[1];

        // creates new page if there are no pages or if there are 5 commands on the current page
        if (pages.length<=0) pages[0]=[];
        if (pages[pages.length-1].length >= 5) pages[pages.length]=[];

        pages[pages.length-1].push({
            "name": `• ${name} ${(properties.permissions.length<=0)?"♻️":"👑"}`,
            "value": `${properties.description}`
        })
    };

    helpEmbed.embeds[0].fields=pages[
        (()=>{
            if ("page" in options && isNaN(options.page) && options.page<=pages.length) {
                helpEmbed.embeds[0].title=helpEmbed.embeds[0].title.slice(0, helpEmbed.embeds[0].title.indexOf("Page: ")+6)+`${options.page})`;
                return options.page
            };

            if ("page" in options) helpEmbed.content=`Your page number was invalid, please make sure it is within the current number of pages (starting from zero).`;
            return 0
        })()
    ];

    let message = await interaction.reply(helpEmbed);

    const filter = (interaction) => interaction.componentType == 2;

    message.createMessageComponentCollector({ filter, time: 120_000 }).on('collect', i =>  {
        if (i.user.id != interaction.user.id) i.reply({content:`You aren't allowed to interact with this embed.`, ephemeral: true});

        i.deferUpdate()
            .catch(err => console.log(`Interaction failed.`, err));

        let currentPage = parseInt(helpEmbed.embeds[0].title.slice(helpEmbed.embeds[0].title.indexOf("Page: ")+6, helpEmbed.embeds[0].title.length-1));

        if (i.customId==="frontPage" && currentPage+1<=pages.length-1) {
            currentPage=currentPage+1;
            helpEmbed.embeds[0].fields=pages[currentPage]
        };
        if (i.customId==="backPage" && currentPage-1>=0) {
            currentPage=currentPage-1;
            helpEmbed.embeds[0].fields=pages[currentPage]
        };

        helpEmbed.embeds[0].title=helpEmbed.embeds[0].title.slice(0, helpEmbed.embeds[0].title.indexOf("Page: ")+6)+`${currentPage})`;
        helpEmbed.components[0].components[1].disabled=(currentPage>=pages.length-1)?true:false;
        helpEmbed.components[0].components[0].disabled=(currentPage<=0)?true:false;

        interaction.editReply(helpEmbed)
            .catch(err=>console.log(err));
    })
};

module.exports = {
    name: "help",
    description: "Lists every command.",
    options: [
        {
            "name": "page",
            "description": "Skips to a specific page, pages start at 0.",
            "type": 4,
            "required": false
        }
    ],
    permissions: [],
    reaction: response
}