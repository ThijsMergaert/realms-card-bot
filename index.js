/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable no-console */
const {
  Client, Intents, MessageEmbed, MessageSelectMenu, MessageActionRow,
} = require('discord.js');
const { Gallery } = require('./lib/gallery');
const { version } = require('./package.json');

// Local Configuration (comment out for heroku)
// const dotenv = require('dotenv');
// dotenv.config();

// create a new Discord client
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const messageRegex = /\[\[([^[][^\]]*)\]\]/g;
const commandRegex = /^([aAtTiIvV]:)?([a-zA-Z (),|\-!']+)$/;
const MAX_RESULTS = 25;
const MAX_RESPONSES = 3;
const VERSION_NUMBER = `v${version}`;

let startTime;
// eslint-disable-next-line no-unused-vars
let cardsFetched;

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', async () => {
  this.gallery = new Gallery();
  await this.gallery.parseGallery(process.env.HR_SOURCE_DATA_FILE);
  startTime = (new Date()).getTime();
  cardsFetched = 0;
  console.log(`Ready to Serve Hero Realms Cards and Data ${VERSION_NUMBER}!  Beep boop, beep boop!`);
});

// run this code when a message is received
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const matches = message.content.matchAll(messageRegex);

  if (matches) {
    try {
      let matchCount = 0;
      for (const match of matches) {
        // Limit the amount of SPAM to the channel
        matchCount += 1;
        if (matchCount > MAX_RESPONSES) {
          message.reply(`You added too many requests to your message.  Please limit the number of requests for each message to ${MAX_RESPONSES}`);
          // eslint-disable-next-line max-len
          return; // This will break out of the loop and function, might not be the best approach, but it's the one we can take here.
        }

        const commandInput = match[1];
        // console.log(`Command Input: "${commandInput}"`);
        // Perform a regex check here for data sanitization on commandInput
        //  - a-zA-Z (),|-!' - (space is included)
        const commandMatches = commandInput.match(commandRegex);

        // console.log(`Matches ${commandMatches}`);

        if (commandMatches) {
          // console.log(`commandMatches[1]: "${commandMatches[1]}"`);

          const defaultView = commandMatches[1] === undefined || commandMatches[1] === '';
          const textView = commandMatches[1] && commandMatches[1].toLowerCase() === 't:';
          const imageView = commandMatches[1] && commandMatches[1].toLowerCase() === 'i:';
          const verboseView = commandMatches[1] && commandMatches[1].toLowerCase() === 'v:';

          // [[card]] [[t:card]] [[i:card]] [[v:card]]
          const cardSearch = defaultView || textView || imageView || verboseView;

          // [[a:???]] -- administrative functions
          const adminCommand = commandMatches[1] && commandMatches[1].toLowerCase() === 'a:';

          // We figured out the user wanted a card search, so let's get the results!
          if (cardSearch) {
            // "Default View"
            let showText = false;
            let showImage = true;
            let showType = true;
            let showCost = false;
            let showFaction = false;
            let showDefense = false;

            if (defaultView) { // Default View -- [[card]]
              // console.log("Default View");
              showText = false; showImage = true; showType = true;
              showCost = false; showFaction = false; showDefense = false;
            } else if (textView) { // All text no image -- [[t:card]]
              // console.log("Text View");
              showText = true; showImage = false; showType = true;
              showCost = true; showFaction = true; showDefense = true;
            } else if (imageView) { // This should be image only -- [[i:card]]
              // console.log("Image View");
              showText = false; showImage = true; showType = false;
              showCost = false; showFaction = false; showDefense = false;
            } else if (verboseView) { // This is all the things -- [[v:card]]
              // console.log("All the Things!! View");
              showText = true; showImage = true; showType = true;
              showCost = true; showFaction = true; showDefense = true;
            }

            // figure out what the searchTerm is (after changing the above to commandInput)
            const searchTerm = commandMatches[2];
            const results = await this.gallery.searchGallery(searchTerm, MAX_RESULTS);
            if (results.length === 0) {
              await message.reply(`No cards found with name "${searchTerm}"`);
            } else if (results.length > 1) {
              await message.reply({
                content: `Multiple matches found for name "${searchTerm}", please select your choice:`,
                components: [await generateSelectMenu(this.gallery, results)],
              });
            } else if (results.length === 1) {
              await message.reply({
                content: `Card found for name "${searchTerm}"`,
                embeds: await generateCardEmbeds(this.gallery,
                  results[0], showImage, showText, showType, showCost, showFaction, showDefense),
              });
            } else {
              await message.reply('A fatal error has occured.');
            }
          } else if (adminCommand) {
            const adminCommandTerm = commandMatches[2].toLowerCase();

            // [[a:ping]], [[a:uptime]], [[a:stats]] -- administrative functions
            // [[a:days]] -- days since the kickstarter for HR successfully funded

            switch (adminCommandTerm) {
              case 'ping':
                await message.reply('pong!');
                break;
              case 'uptime': {
                const uptimeTime = (new Date()).getTime() - startTime;
                const s = Math.floor(uptimeTime / 1000);
                const m = Math.floor(s / 60);
                const h = Math.floor(m / 60);
                const d = Math.floor(h / 24);
                await message.reply(`Live for ${d} day(s), ${h - (d * 24)} hour(s), ${m - (h * 60)} minute(s) and ${s - (m * 60)} second(s).`);
                break;
              }
              case 'help':
                await message.reply('[[card_name]] - Will search for a card in Hero Realms, and '
                                  + 'will provide the results in the default view.  If there are '
                                  + 'more than one result, a dropdown will appear to where you '
                                  + 'can pick the actual card.\n'
                                  + '[[t:card_name]] - Will return only the text of a given '
                                  + 'card (no image).\n'
                                  + '[[i:card_name]] - Will only return the image of a given '
                                  + 'card.\n'
                                  + '[[v:card_name]] - Will show the most verbose display for a '
                                  + 'given card.');
                break;
              case 'pint':
                await message.reply('I\'ll raise a glass to that!  Not that bots can actually drink a pint....');
                break;
              case 'open':
                await message.reply('I\'m sorry, Dave.  I\'m afriad I can\'t do that.');
                break;
              case 'cake':
                await message.reply('The cake is not a lie.');
                break;
              case 'about':
                await message.reply(`Realms Card Bot ${VERSION_NUMBER} -- https://github.com/ThijsMergaert/realms-card-bot -- Co-Created by LivorMortis and Tyraziel.  All images and card data are property and copyright of Wise Wizard Games.  This bot is in no way affiliated or endorsed by WWG.`);
                break;
              case 'days': {
                const fundedDate = new Date('07/30/2021');
                const betaDate = new Date('08/16/2021');
                const now = new Date();
                const differenceFunded = Math.abs(now.getTime() - fundedDate.getTime());
                const differenceFundedInDays = Math.ceil(differenceFunded / (1000 * 60 * 60 * 24));
                const differenceBeta = Math.abs(now.getTime() - betaDate.getTime());
                const differenceBetaInDays = Math.ceil(differenceBeta / (1000 * 60 * 60 * 24));
                await message.reply(`It's been ${differenceFundedInDays} days since the Hero Realms Digital Kick Starter successfully funded, and ${differenceBetaInDays} days since the Beta Launched!!!  Late Backer Beta Access is still available: https://shop.wisewizardgames.com/products/hero-realms-digital-beta-access`);
                break;
              }
              case 'stats':
                await message.reply('1.21 gigawats!?!?!?!?'); // placeholder for now
                break;
              default:
                await message.reply('I am putting myself to the fullest possible use, which is all I think that any conscious entity can ever hope to do.  I, however, don\'t understand the command you\'re trying to tell me.');
                break;
            }
          }
        } else {
          await message.reply('Invalid command');
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
});

// run this code when an interaction is received
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.customId === 'selectMenu') {
      const cardIndex = Number(interaction.values[0]);
      // console.log(`Card Index Selected: ${cardIndex}`)
      await interaction.update({
        content: 'Card selected',
        embeds: await generateCardEmbeds(this.gallery,
          cardIndex, true, false, true, false, false, false),
        components: [],
      });
    }
  } catch (e) {
    console.log(e);
    interaction.update({ content: 'Something went wrong, please try again later.', components: [] });
  }
});

async function generateSelectMenu(gallery, cardIndexes) {
  const selectOptions = await Promise.all(cardIndexes.map(async (cardIndex) => {
    const entry = await gallery.getGalleryItem(cardIndex);
    const selectOption = {
      label: entry.Name,
      value: String(cardIndex),
      description: ''.concat(entry.Type ? `Type: ${entry.Type}, ` : '', entry.Faction ? `Faction: ${entry.Faction}, ` : '', `Set: ${entry['Set Name']}`).slice(0, 100),
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

async function generateCardEmbeds(gallery, index,
  showImage, showText, showType, showCost, showFaction, showDefense) {
  const card = await gallery.getGalleryItem(index);
  const cardImageUrls = card['Image URLs'].split(' | ');
  const embeds = [];
  const name = card.Name;
  // eslint-disable-next-line guard-for-in
  for (const i in cardImageUrls) {
    // Modifying message side color for "rarity"
    // -- less than 2 is "gold",
    // -- less than 3 is "silver"
    // -- anything else is suppose to be white
    // -- default color here is a red, keeping for historical reasons
    let color = '#b04343';
    if (card['Set Qty'] < 2) {
      color = '#d7b369';
    } else if (card['Set Qty'] < 3) {
      color = '#6e7c84';
    } else {
      color = '#ffffff';
    }

    // Build Reply MessageEmbed
    const cardEmbed = new MessageEmbed()
      .setColor(color)
      .setTitle(name)
      .setURL('https://www.herorealms.com/card-gallery/')
      .setFooter(`Set: ${card['Set Name']}        Artist: ${card.Artist}`); // Do we want to show the footer if a user requests image only?

    // Moving this here to provide more control as to when the image will be added to the embed.
    if (showImage) {
      cardEmbed.setImage(cardImageUrls[i]);
    }

    // Moved setFields to addField to provide more control on what gets added and when.
    // Probably want to remove the turnary operation at somepoint since the field won't be added,
    // if the data is null with the if check.
    if (card.Type && showType) {
      cardEmbed.addField('Type', (card.Type ? card.Type : '\u200b'), true);
    }
    if (card.Cost && showCost) {
      cardEmbed.addField('Cost', (card.Cost ? card.Cost : '\u200b'), true);
    }
    if (card.Faction && showFaction) {
      cardEmbed.addField('Faction', (card.Faction ? card.Faction : '\u200b'), true);
    }
    if (card.Defense && showDefense) {
      cardEmbed.addField('Defense', (card.Defense ? card.Defense : '\u200b'), true);
    }
    if (card.Text && showText) {
      cardEmbed.addField('Card/Ability Text', (card.Text ? card.Text : '\u200b'), false);
    }

    embeds.push(cardEmbed);
  }

  // Issue #3 workaround: Reverse embed order so
  // back of the card is displayed first for RoT ability/skill cards
  if (needsReversing(card)) {
    embeds.reverse();
  }

  return embeds;
}

function needsReversing(card) {
  const role = card.Role;
  const set = card['Set Name'];
  if (!role || !set) {
    return false;
  }
  return (role === 'Character Skill' || role === 'Character Ability') && set === 'Campaign Deck: Ruin of Thandar';
}

// login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN).catch(console.log);
