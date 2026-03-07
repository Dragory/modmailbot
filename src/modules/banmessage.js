const utils = require("../utils");

module.exports = ({ bot, knex, config, commands }) => {
  commands.addInboxServerCommand("banmessage", [], async (msg, args, thread) => {
    let message = {
      title: "Avatar: The Last Airbender - Ban Appeals",
      description: "The Earth King welcomes you to Lake Laogai. If you're here, it means that you were banned from the main ATLA server. \n Here are a few things to note:",
      author: {
        name: msg.channel.guild.name,
        icon_url: msg.channel.guild.iconURL,
      },
      thumbnail: {
        "url": `https://vignette.wikia.nocookie.net/avatar/images/1/1f/Joo_Dee.png/revision/latest/top-crop/width/720/height/900?cb=20140422090643`
      },
      color: 16738657,
      fields: [
        {
          name: "Communication",
          value: "All communication will occur through <@718577208687460482>, our modmail bot. Any abuse of this bot will resolve in removal from the server, preventing you from appealing in the future", 
        },
        {
          name: "Appeals",
          value: `If your ban was permanent, there is very good reason it won't be lifted. If we wanted it to be temporary, that temporary punishment would have been issued instead. That being said, if you feel that this action was unjust or misinterpreted by our team, Please contact us via our modmail bot, <@718577208687460482>
          \n\nIn the event your appeal is denied, you will be blocked from appealing for up to 3 months. The cooldown may increase with subsequent denials, up to and including the permanent inability to appeal.`
        },
        {
          name: "Invite",
          value: "If your appeal were to be accepted, you can rejoin the server at https://discord.gg/avatar",
        }
      ],
      footer: {
        timestamp: new Date
      }
    } 
  
    await bot.guilds.get('736344840253472830').channels.get('736344840253472833').getMessage('801246595248816149').edit({ embeds: [{message}]});
  utils.postSystemMessageWithFallback(msg.channel, thread, response);
  });
};
