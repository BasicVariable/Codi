const response = async (interaction) => {
    await interaction.reply(`pong.`)
};

module.exports = {
    name: "ping",
    description: "responds with 'pong'",
    reaction: response
}