import { Client, WebhookClient, MessageFlags } from 'discord.js-selfbot-v13';
import config from './config.js';
const {
  token,
  status,
  channel_ids,
  webhook_urls,
  mention_server,
  mention_original,
  mention_replaced
} = config;
import { parse } from './parser.js';

/*
* Return the token portion from a webhook url.
* URL: https://discord.com/api/webhooks/123/abcdef
*                                              ↳ TOKEN
*/
function parseWebhookToken(webhookUrl) {
  const index = webhookUrl.lastIndexOf('/');

  if (index == -1) {
    throw 'Invalid Webhook URL';
  }

  return webhookUrl.substring(index + 1, webhookUrl.length);
}

/*
* Return the id portion from a webhook url.
* URL: https://discord.com/api/webhooks/123/abcdef
*                                        ↳ ID
*/
function parseWebhookId(webhookUrl) {
  const indexEnd = webhookUrl.lastIndexOf('/');

  if (indexEnd == -1) {
    throw 'Invalid Webhook URL';
  }

  const indexStart = webhookUrl.lastIndexOf('/', indexEnd - 1);

  if (indexStart == -1) {
    throw 'Invalid Webhook URL';
  }

  return webhookUrl.substring(indexStart + 1, indexEnd);
}

/*
* Key = Channel id where when a message is sent, it is replicated to the webhooks.
* Value = Array of webhooks where the message is replicated.
*/
const channelWebhookMapping = {};

function loadConfigValues() {
  for(let i = 0; i < channel_ids.length; i++) {
    const webhooks = [];

    webhooks.push(new WebhookClient({
      token: parseWebhookToken(webhook_urls[i]),
      id: parseWebhookId(webhook_urls[i])
    }));

    channelWebhookMapping[channel_ids[i]] = webhooks;
  }
}

loadConfigValues();

const client = new Client({ checkUpdate: false });

client.on('ready', async () => {
  console.log(`${client.user.username} is now mirroring >:)!`);
  client.user.setPresence({ status: status });
});

client.on('messageCreate', async (message) => {
  // Skip empty messages.
  if (!message.content.length && !message.embeds.length && !message.attachments.length) {
    return;
  }

  // Skip 'Only you can see this' messages.
  if (message.flags & MessageFlags.Ephemeral) {
    return;
  }

  const webhooks = channelWebhookMapping[message.channelId];

  if (!webhooks) {
    return;
  }

  const emptyChar = '᲼';

  // Prevent 'MessageEmbed field values must be non-empty strings'.
  for (const embed of message.embeds) {
    for (const field of embed.fields) {
      if (!field.name.length) {
        field.name = emptyChar;
      }
      if (!field.value.length) {
        field.value = emptyChar;
      }
    }
  }

  if (!message.content.length) {
    // Prevent 'Message content must be a non-empty string' with embeds.
    if (message.embeds.length) {
      message.content = emptyChar;
    }
  }
  else {
    const mentionReplaceList = mention_server[message.guildId];

    if (mentionReplaceList) {
      for (const replacePair of mentionReplaceList) {
        message.content = message.content.replaceAll(mention_original, mention_replaced);
      }
    }
  }

  for (const attachment of message.attachments) {
    message.content += '\n' + attachment[1].url;
  }

  const parsed_message = await parse(message.content);

  for (const webhook of webhooks) {
    webhook.send({
      content: parsed_message,
      username: message.author.username,
      avatarURL: message.author.avatarURL(),
      embeds: message.embeds
    }).catch(console.error);
  }
});

client.login(token);