const { Client, Intents, MessageEmbed, MessageSelectMenu, MessageSelectOptionData, MessageActionRow } = require('discord.js');
const { Gallery } = require('./lib/gallery');

// create a new Discord client
const client = new Client({ intents: [ Intents.FLAGS.GUILDS,  Intents.FLAGS.GUILD_MESSAGES ] });
const regex = /\[\[([^\[][^\]]*)\]\]/;
const MAX_RESULTS = 25;

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', async () => {
    this.gallery = new Gallery();
    await this.gallery.parseGallery(process.env.HR_SOURCE_DATA_FILE);
    console.log('Ready!');
});

// run this code when a message is received
client.on('messageCreate', async message => {
    // 
    const matches = message.content.match(regex);
        if (matches) {
            try {
                const results = await this.gallery.searchGallery(matches[1], MAX_RESULTS);
                if (results.length === 0) {
                    await message.reply('No cards found with this name');
                    return;
                }
                if (results.length > 1) {
                    await message.reply({content: 'Multiple matches found, please select your choice:', components: [await generateSelectMenu(this.gallery, results)]});
                    return;
                }
                await message.reply({content: `Card found`, embeds: await generateCardEmbeds(this.gallery, results[0])});
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
            await interaction.update({content: 'Card selected', embeds: await generateCardEmbeds(this.gallery, cardIndex), components: []});
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

async function generateCardEmbeds(gallery, index) {
    const card = await gallery.getGalleryItem(index);
    const cardImageUrls = card['Image URLs'].split(' | ');
    const embeds = [];
    const name = card.Name;
    for (const index in cardImageUrls) {
        const cardEmbed = new MessageEmbed()
            .setColor('#b04343')
            .setTitle(card.Name)
            .setFields(
                { name: 'Type', value: card.Type }
            )
            .setURL('https://www.herorealms.com/card-gallery/')
            .setImage(cardImageUrls[index])
            .setFooter(`Set: ${card['Set Name']}        Artist: ${card.Artist}`);
        embeds.push(cardEmbed);
    }
    return embeds;
}

// login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN).catch(console.log);