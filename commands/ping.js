const response = async (interaction, options) => {
    if (options.ephemeral==true) await interaction.reply({content:`pong.`, ephemeral: true}); else{
        await interaction.reply(`pong.`)
    }
};

module.exports = {
    name: "ping",
    description: "responds with 'pong'",
    options: [
        {
            "name": "ephemeral",
            "description": "Sets the command to only be visible to you ",
            "type": 5,
            "required": false
        }
    ],
    permissions: [],
    reaction: response
}