const fs = require('fs');
const path = require('path');
const bot = require('../bot');

const folder = path.join(__dirname, 'logsfile');

const utils = require('../utils');
const config = require('../config');
const threads = require('./threads');

    bot.on('messageCreate', async msg => {
        if (! config.useLogFile) return;

        // Check if the message was sent in the inbox server
        if (! utils.messageIsOnInboxServer(msg)) return;

        // Check if the channel where the message was sent is an open thread
        const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
        if (! thread) return;
     
        if (thread) {
           // Wait for the getDMChannel function to complete and then return the available user info, such as ID, username, discriminator, etc.
           let userData = (await thread.getDMChannel()).recipient;
           exists(msg, userData);
       }
     });

     bot.on('channelDelete', async (channel) => {
         if (! config.useLogFile) return;
         if (! config.logFileChannelID) {
            console.log('[WARN] Can not upload log file to discord, a channel id for logFileChannelID has not been set!')
            return;
         }

        if (channel.guild.id !== utils.getInboxGuild().id) return;
         
        const thread = await threads.findByChannelId(channel.id);
        if (! thread) return;
         
        if (thread) {
            console.log(`[NOTE] Thread channel closed, uploading log file for ${channel.name}...`)
            uploadFile(channel.id)
        }
      });

// Upload the file to discord, get the attachment URL and post the URL to the website
async function uploadFile(threadChannelID) {

    try {
    const thread = await threads.findByChannelId(threadChannelID);
    let data = (await thread.getDMChannel()).recipient;
    let userID = data.id;

    let username = `${data.username}#${data.discriminator}`;
    let fileChannelID = config.logFileChannelID;
    let logChannelID = config.logChannelId

        fs.readFile(`${folder}/${username}.txt`, 'utf8', (error,data) => {
            if (error) {
              return console.log(error);
            }

            bot.createMessage(fileChannelID,`Logs for ${username} (${userID})`, {file: Buffer.from(data), name: `${username}.txt`}).then((msg) => {

                let attachmentURL = msg.attachments[0].url.split("/");
                let channelID = attachmentURL[4];
                let id = attachmentURL[5];
                let filename = msg.attachments[0].filename.split(".")[0];
        
                bot.createMessage(logChannelID,`Logs: http://txt.discord.website/?txt=${channelID}/${id}/${filename}`).catch(error => console.error);
                console.log(`[NOTE] Succesfully uploaded file to discord`)
            }).catch((error) => {
                if (error.code === 10003) {
                    console.log('[WARN] Could not upload file, the specified LogFileChannelID is not a valid channel id!')
                    return;
                } else { 
                    console.log(error)
                    return;
                }
            });
    
          });
        // Delete the file after attempting to upload it
        fs.unlink(`${folder}/${username}.txt`, function(error) {
            if (error) {
                console.log(error)
                return;
            };
        });

    } catch(error) {
        console.log(error)
    };

};

// Check if the .txt file exists, if exists, append the file with the messages sent, if not, create a new one

function exists(msg, user) {
    try {
    let checkFile = `${user.username}#${user.discriminator}`;

    if ((fs.existsSync(`${folder}/${checkFile}.txt`))) {
        append(msg, checkFile);
    } else {
        console.log(`[NOTE] Creating new text file log for ${checkFile}...`);
        firstWrite(msg, user, checkFile);
    };
    } catch(error) {
        console.error(error)
    }
};

// Create the file with the name username#discriminator and write the header to the file
function firstWrite(msg, user, checkFile) {
    try {
        let firstWriteText = `-- Logs -- ${user.username}#${user.discriminator} (${user.id})\r\n`+
        `\r\n[${(new Date(msg.timestamp)).toUTCString()}] ${msg.member.username}#${msg.member.discriminator} (${msg.member.id}) : ${msg.content}\r\n`;
    
        fs.writeFile(`${folder}/${checkFile}.txt`, firstWriteText, (writeError) => {
            if (writeError) return console.log(writeError);

        console.log(`[NOTE] Succesfully created new log file for ${checkFile}`);
    });

    } catch(error) {
        console.log(error)
    }
};

// Append the message to the .txt file if it exists, if not, a new one will be created without the header
function append(msg, checkFile) {
    try {
        let content = `\r\n[${(new Date(msg.timestamp)).toUTCString()}] ${msg.member.username}#${msg.member.discriminator} (${msg.member.id}) : ${msg.content}\r\n`;

        fs.appendFile(`${folder}/${checkFile}.txt`, content, (error) => {
            if (error) {
                console.log(error);
                return;
            };
        });

    } catch(error) {
        console.log(error)
    }

};
