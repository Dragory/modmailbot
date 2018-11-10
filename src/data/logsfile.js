const fs = require('fs');
const path = require('path');
const bot = require('../bot');

const folder = path.join(__dirname, 'logsfile');

const threads = require('./threads');
const utils = require('../utils');
const config = require('../config');

    bot.on('messageCreate', async msg => {
        if ( (config.useLogFile) === false ) return;

        // Check if the message was sent in the inbox server
        if (! utils.messageIsOnInboxServer(msg)) return;

        // Check if the channel where the message was sent is an open thread
        const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
        if (! thread) return;
     
        if (thread) {
           // wait for the getDMChannel function to complete and then return the available user info, such as ID, username, discriminator, etc.
           let userData = ( await thread.getDMChannel() ).recipient;
           exists(msg, userData);
       }
     });

     bot.on('channelDelete', async (channel) => {
         if ( (config.useLogFile) === false ) return;
         if ( (config.logFileChannelID) === null ) {
            console.log('[WARN] Can not upload log file to discord, a channel id for logFileChannelID has not been set!')
            return;
         }

        if (channel.guild.id !== utils.getInboxGuild().id) return;
         
        const thread = await threads.findByChannelId(channel.id);
        if (! thread) return;
         
        if (thread) {
            console.log(`[NOTE] Thread channel closed, uploading log file for ${channel.name}...`)
            await uploadFile(channel.id)
        }
      });

// Upload the file to discord, get the attachment URL and post the URL to the website
async function uploadFile(threadChannelID) {

    try {
    const thread = await threads.findByChannelId(threadChannelID);
    let data = ( await thread.getDMChannel() ).recipient;
    let userID = ( await data.id);

    let username = await (`${data.username}#${data.discriminator}`);
    let fileChannelID = config.logFileChannelID;
    let logChannelID = config.logChannelId

        await fs.readFile(`${folder}/${username}.txt`, 'utf8', async function (err,data) {
            if (err) {
              return console.log(err);
            }

            await bot.createMessage(fileChannelID,`Logs for ${username} (${userID})`, {file: Buffer.from(data), name: `${username}.txt`}).then( async (msg) => {

                let attachmentURL = await msg.attachments[0].url.split("/");
        
                let channelID = await attachmentURL[4];
        
                let id = await attachmentURL[5];
        
                let filename = await msg.attachments[0].filename.split(".")[0];
        
                await bot.createMessage(logChannelID,`Logs: http://txt.discord.website/?txt=${channelID}/${id}/${filename}`)
                console.log(`[NOTE] Succesfully uploaded file to discord`)
            }).catch( (error) => {
                if (error.code === 10003) {
                    console.log('[WARN] Could not upload file, the specified LogFileChannelID is not a valid channel id!')
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
async function exists(msg, user) {
    try {
    let checkFile = await (`${user.username}#${user.discriminator}`);

    if ( (fs.existsSync(`${folder}/${checkFile}.txt`)) === true) {
        await append(msg, checkFile);
    } else {
        console.log(`[NOTE] Creating new text file log for ${checkFile}...`)
        await firstWrite(msg, user, checkFile);
    };

    } catch(error) {
        console.log(error)
    }
};

// Create the file with the name username#discriminator and write the header to the file
async function firstWrite(msg, user, checkFile) {

    try {

        let firstWriteText = await `-- Logs -- ${user.username}#${user.discriminator} (${user.id})\r\n`+
        `\r\n[${(new Date(msg.timestamp)).toUTCString()}] ${msg.member.username}#${msg.member.discriminator} (${msg.member.id}) : ${msg.content}\r\n`;
    
        fs.writeFile(`${folder}/${checkFile}.txt`, firstWriteText, function(writeError) {
            if (writeError) return console.log(writeError);

        console.log(`[NOTE] Succesfully created new log file for ${checkFile}`);

    });

    } catch(error) {
        console.log(error)
    }
};

// Append the message to the .txt file if it exists, if not, a new one will be created without the header
async function append(msg, checkFile) {
    try {
        let content = await `\r\n[${(new Date(msg.timestamp)).toUTCString()}] ${msg.member.username}#${msg.member.discriminator} (${msg.member.id}) : ${msg.content}\r\n`;

        fs.appendFile(`${folder}/${checkFile}.txt`, content, function(error) {
            if (error) {
                console.log(error);
                return;
            };
        });

    } catch(error) {
        console.log(error)
    }

};
