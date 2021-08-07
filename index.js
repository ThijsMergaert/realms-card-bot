const { Client, Intents, MessageEmbed, MessageSelectMenu, MessageSelectOptionData, MessageActionRow } = require('discord.js');
const { Gallery } = require('./lib/gallery');

// create a new Discord client
const client = new Client({ intents: [ Intents.FLAGS.GUILDS,  Intents.FLAGS.GUILD_MESSAGES ] });
const regex = /\[\[(.*)\]\]/;

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', async () => {
    this.gallery = new Gallery();
    await this.gallery.parseGallery(process.env.SOURCE_DATA_FILE);
    console.log('Ready!');
});

client.on('messageCreate', async message => {
    const matches = message.content.match(regex);
        if (matches) {
            try {
                const results = await this.gallery.searchGallery(matches[1]);
                if (results.length === 0) {
                    await message.reply('No cards found with this name');
                    return;
                }
                if (results.length > 1) {
                    await message.reply({content: 'Multiple matches found, please select your choice:', components: [await generateSelectMenu(results.slice(0, 25))]});
                    return;
                }
                await message.reply({content: `Card found`, embeds: await generateCardEmbeds(this.gallery, results[0].index)});
            } catch (e) {
                console.log(e);
            }
        };
});

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

async function generateSelectMenu(cards) {
    const selectOptions = cards.map(card => {
        const entry = card.entry;
        const selectOption = {
            label: entry.Name,
            value: String(card.index),
            description: "".concat(entry.Type ? `Type: ${entry.Type}, ` : "", entry.Faction ? `Faction: ${entry.Faction}, ` : "",  `Set: ${entry['Set Name']}`).slice(0, 100)
        };
        return selectOption;
    })
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