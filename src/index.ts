import { WebClient } from '@slack/web-api';
import { RTMClient } from '@slack/rtm-api';

import { UsersListResult, ConversationsListResult, GetPermalinkResult, Event } from './interfaces';

/*
########  ########    ###    ########  ##     ## ######## 
##     ## ##         ## ##   ##     ## ###   ### ##       
##     ## ##        ##   ##  ##     ## #### #### ##       
########  ######   ##     ## ##     ## ## ### ## ######   
##   ##   ##       ######### ##     ## ##     ## ##       
##    ##  ##       ##     ## ##     ## ##     ## ##       
##     ## ######## ##     ## ########  ##     ## ######## 

This script uses ezybot to notify the users when specific words are mentioned in the given channels.
It is ideally used to allow the users to mute the general channels without missing out on important accouncements (i.e. when lunch is ready)

TO RUN: Modify the constants below to match what you want to do, then run `tsc` to compile from typescript to javascript. Use `node dist/index.js` to run the script. 
You only have to recompile if you make changes

Areas of improvement: Change the public channels array to use names rather than codes

 ######   #######  ##    ##  ######  ########    ###    ##    ## ########  ######  
##    ## ##     ## ###   ## ##    ##    ##      ## ##   ###   ##    ##    ##    ## 
##       ##     ## ####  ## ##          ##     ##   ##  ####  ##    ##    ##       
##       ##     ## ## ## ##  ######     ##    ##     ## ## ## ##    ##     ######  
##       ##     ## ##  ####       ##    ##    ######### ##  ####    ##          ## 
##    ## ##     ## ##   ### ##    ##    ##    ##     ## ##   ###    ##    ##    ## 
 ######   #######  ##    ##  ######     ##    ##     ## ##    ##    ##     ######  
*/

const token = process.env.TOKEN || '';
if (!token) {
  process.exit();
}

// Send these users an alert when someone mentions the keywords in the general channel
const userEmails = ['justin@ezyvet.com', 'eric.lin@ezyvet.com', 'ben.watson@ezyvet.com'];

// Channels to watch for keywords. #general_auckland and #epic-crew
const publicChannels = ['C9M3CJXD2', 'CHD5VBH7X'];

// The regex to match messages in the general channel against
const alertRegex = /food|lunch|cake|sushi|burgers?/;

console.log('starting slack bot');

const web = new WebClient(token);
const rtm = new RTMClient(token);

/**
 * Determine if the message should send an alert to the users
 *
 * @param message the text to check against
 */
const matchMessageContent = (message: string): boolean => {
  const match = message.toLowerCase().match(alertRegex);
  if (!match) {
    return false;
  }
  return true; // Ignore the information from this for now
};

// main function
(async () => {
  const users = (await web.users.list()) as UsersListResult;
  const usersToNotify = users.members.filter(u => userEmails.includes(u.profile.email));
  if (!usersToNotify) {
    console.log('Could not find users');
    return;
  }
  console.log('the bot will send messages to the following users', usersToNotify.map(u => u.profile.real_name));

  const dmList = (await web.conversations.list({
    types: 'im',
    exclude_archived: true,
    limit: 1000,
  })) as ConversationsListResult;

  const userDMChannels = dmList.channels.filter(c => usersToNotify.filter(utn => utn.id === c.user).length > 0);
  if (userDMChannels.length === 0) {
    console.log('Could not find any users DM Channel');
    return;
  }

  const userDMChannelIds = userDMChannels.map(udmc => udmc.id);
  if (userDMChannelIds.length === 0) {
    console.log('Could not find any users DM Channel');
    return;
  }

  rtm.on('connected', event => {
    console.log('connected to slack and listening...');
  });

  rtm.on('message', async (event: Event) => {
    const { text, channel, ts } = event;
    if (!publicChannels.includes(channel)) {
      return;
    }
    if (text && matchMessageContent(text)) {
      console.log('someone mentioned lunch, gogogo');
      const user = users.members.find(u => u.id === event.user); // Find the user that sent the message
      const username = user && user.profile.real_name;
      const permalink = (await web.chat.getPermalink({ channel, message_ts: ts })) as GetPermalinkResult;

      // Send an alert to each user listed
      userDMChannelIds.forEach(dmChannelId => {
        web.chat
          .postMessage({
            channel: dmChannelId,
            text: `${username} mentioned lunch: ${permalink.permalink}`,
            unfurl_links: true,
          })
          .catch(e => {
            console.log(`Could not send message to ${username}`, e);
          });
      });
    }
  });

  await rtm.start();
})();
