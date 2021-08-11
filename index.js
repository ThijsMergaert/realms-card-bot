const { Client, Intents, MessageEmbed, MessageSelectMenu, MessageSelectOptionData, MessageActionRow } = require('discord.js');
const { Gallery } = require('./lib/gallery');

// Local Configuration (comment out for heroku)
//const dotenv = require('dotenv');
//dotenv.config();

// create a new Discord client
const client = new Client({ intents: [ Intents.FLAGS.GUILDS,  Intents.FLAGS.GUILD_MESSAGES ] });
const regex = /\[\[([^\[][^\]]*)\]\]/g;
const MAX_RESULTS = 25;
const MAX_RESPONSES = 3;

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', async () => {
    this.gallery = new Gallery();
    await this.gallery.parseGallery(process.env.HR_SOURCE_DATA_FILE);
    console.log('Ready to Serve Hero Realms Cards and Data!  Beep boop, beep boop!');
});

// run this code when a message is received
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const matches = message.content.matchAll(regex);

    if (matches) {
        try {
            var matchCount = 0;
            for(const match of matches) {
                //Limit the amount of SPAM to the channel
                matchCount++;
                if (matchCount > MAX_RESPONSES){
                    message.reply(`You added too many searches to your message.  Please limit the number of card search requests for each message to ${MAX_RESPONSES}`);
                    return; //This will break out of the loop and function, might not be the best approach, but it's the one we can take here.
                }
                const commandInput = match[1];
                //console.log(`Command Input: "${commandInput}"`);
                //Perform a better regex check here for data sanitization on searchTerm
                //  - a-zA-Z (),|-!' - (space is included)

                //Perform split on : if possible?

                //[[card]] should show the default view
                //[[t:card]] should show the text, no image
                //[[i:card]] should only the image, nothing else
                //[[v:card]] should show verbose mode (all the things)
                //[a:ping], [a:uptime], [a:stats] -- administrative functions
                //[a:days] -- days since the kickstarter for HR successfully funded
                var cardSearch = true;
                //"Default View"
                var showText = false;
                var showImage = true;
                var showType = true;
                var showCost = true;
                var showFaction = true;
                var showDefense = true;

                //We figured out the user wanted a card search, so let's get the results!
                if(cardSearch){
                    //figure out what the searchTerm is (after changing the above to commandInput)
                    const searchTerm = commandInput
                    const results = await this.gallery.searchGallery(searchTerm, MAX_RESULTS);
                    if (results.length === 0) {
                        await message.reply(`No cards found with name "${searchTerm}"`);
                        continue;
                    }
                    if (results.length > 1) {
                        await message.reply({content: `Multiple matches found for name "${searchTerm}", please select your choice:`, components: [await generateSelectMenu(this.gallery, results)]});
                        continue;
                    }
                    await message.reply({content: `Card found for name "${searchTerm}"`, embeds: await generateCardEmbeds(this.gallery, results[0], showImage, showText, showType, showCost, showFaction, showDefense)});
                }
            }
        } catch (e) {
            console.log(e);
        }
    };
});

// run this code when an interaction is received
client.on('interactionCreate', async interaction => {
    try {
        const message = interaction.message;
        if (interaction.customId === 'selectMenu') {
            const cardIndex = Number(interaction.values[0]);
            //console.log(`Card Index Selected: ${cardIndex}`)
            await interaction.update({content: 'Card selected', embeds: await generateCardEmbeds(this.gallery, cardIndex, true, false, true, true, true, true), components: []});
        }
    } catch (e) {
        console.log(e);
        interaction.update({content: 'Something went wrong, please try again later.', components: []});
    }
});

async function generateSelectMenu(gallery, cardIndexes) {
    const selectOptions = await Promise.all(cardIndexes.map(async cardIndex => {
            const entry = await gallery.getGalleryItem(cardIndex);
            const selectOption = {
                label: entry.Name,
                value: String(cardIndex),
                description: "".concat(entry.Type ? `Type: ${entry.Type}, ` : "", entry.Faction ? `Faction: ${entry.Faction}, ` : "",  `Set: ${entry['Set Name']}`).slice(0, 100)
            };
            return selectOption;
        }));
    const selectMenu = new MessageSelectMenu()
        .addOptions(selectOptions)
        .setCustomId('selectMenu');
    const actionRow = new MessageActionRow()
        .addComponents(selectMenu);
    return actionRow;
}

async function generateCardEmbeds(gallery, index, showImage, showText, showType, showCost, showFaction, showDefense) {
    const card = await gallery.getGalleryItem(index);
    const cardImageUrls = card['Image URLs'].split(' | ');
    const embeds = [];
    const name = card.Name;
    for (const index in cardImageUrls) {

        //Modifying message side color for "rarity"
        // -- less than 2 is "gold",
        // -- less than 3 is "silver"
        // -- anything else is suppose to be white, but see comment below
        var color = '#b04343'
        if (card['Set Qty'] < 2){
            color = '#d7b369';
        }
        else if (card['Set Qty'] < 3){
            color = '#c0c0c0';
        }
        else{
            color = '#ffffff';
        }

        //Build Reply MessageEmbed
        const cardEmbed = new MessageEmbed()
            .setColor(color)
            .setTitle(card.Name)
            .setURL('https://www.herorealms.com/card-gallery/')
            .setFooter(`Set: ${card['Set Name']}        Artist: ${card.Artist}`);

        //Moving this here to provide more control as to when the image will be added to the embed.
        if(showImage){
            cardEmbed.setImage(cardImageUrls[index]);
        }

        //Moved setFields to addField to provide more control on what gets added and when.
        //Probably want to remove the turnary operation at somepoint since the field won't be added,
        //if the data is null with the if check.
        if(card.Type && showType){
            cardEmbed.addField('Type', (card.Type ? card.Type : '\u200b'), true);
        }
        if(card.Cost && showCost){
            cardEmbed.addField('Cost', (card.Cost ? card.Cost : '\u200b'), true);
        }
        if(card.Faction && showFaction){
            cardEmbed.addField('Faction', (card.Faction ? card.Faction : '\u200b'), true)
        }
        if(card.Defense && showDefense){
            cardEmbed.addField('Defense', (card.Defense ? card.Defense : '\u200b'), true)
        }
        if(card.Text && showText){
            cardEmbed.addField('Card/Ability Text', (card.Text ? card.Text : '\u200b'), false)
        }

        embeds.push(cardEmbed);
    }
    return embeds;
}

// login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN).catch(console.log);