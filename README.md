# About
Codi is a jack-of-all-trades discord bot made to assist users in discord.gg/callie. 
This bot is made completely in my free time, any pull requests to improve my code or syntax is highly appreciated as I'm very willing to learn better practices.
Just to clarifiy **whitelists and premium services** included in the server's bot will not be included.

# To Do
- [x] Add paginated help command
- [x] Ticket bot
- [ ] Add Social update notifier (twitter/reddit/instagram/youtube/twitch)
- [ ] Rewrite old commands from Cali bot

# Documentation
This section will mostly deal with the settings folder, most of the time I'll leave comments in my code to elaborate on why I did something. 
If you have trouble understanding something and it isn't commented/documented, make an issue and I'll try to get to it. 

**customResponses.json**

A json file of premade statements/questions with responses, if you're having issues/errors with the file put it into jsonlint (check your formatting of the file).  
`
{
  "statement":"response",
  "statement":"response"
}
`

**> config.json > discordBot > token**

Your Discord bot's token, you can make a Discord bot on Discord's developer portal.

**> config.json > discordBot > ownerId**

This isn't used yet, behavior will be updated later

**> config.json > discordBot > prefix**

A symbol, letter, number, or series of the formers that start a command. 
