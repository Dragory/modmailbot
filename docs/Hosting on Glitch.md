![Glitch Logo](https://miro.medium.com/max/541/1*qilnXz9CPIMPpr-eN6pNyg.png)
# 🌥️ Hosting on Glitch.com
The free hosting service - useful for people that don't want to pay for a host.

Pros: It works surprisingly well and you shouldn't have any major issues if you follow the instructions in this guide correctly.

Cons: You'll have to wipe old logs every now and then when your upper limit of about 200MB is capped. If you're okay with not having old logs, this is the host for you. Remember, its hard to fill up 200MB worth of text so you should be good for a while.

## Prerequisites
* Create a Glitch account at https://glitch.com/signin
> I would recommend registering with your GitHub account. This will come in handy later.
* Create an UptimeRobot account at https://uptimerobot.com/signUp
> You will need this to keep your bot up and running 24/7.
  
## Bot Setup
1. Once your account is created, go to this link https://glitch.com/~glitch-discord-modmail and click "View Source".
2. Then, click the project name in the top left corner and hit "Remix Project".
3. Now, go to the `.env` file enter your bot token where it says `TOKEN=`. Note there can be no spaces before or after your token in that blank since it is a shell file.
4. Next, there is a file named `config.json`. There, you will follow the steps from [🛠️ Setting up the bot](docs/setup.md#single-server-setup) and [📝 Configuration](docs/configuration.md) to configure the configuration file to fit your needs.

## Bot Setup - Visual Guide
<details>
  <summary>Click to expand!</summary>
  Step 1: Click Remix Project
  
  ![Step1](https://i.imgur.com/y2RA1ve.png)
  
  Step 2: Enter your bot token.
  
  ![Step2](https://i.imgur.com/lgV1qQS.png)
  
  Step 3: Configure config.json to fit your needs. More information in [🛠️ Setting up the bot](docs/setup.md#single-server-setup) and [📝 Configuration](docs/configuration.md).
  
  ![Step3](https://i.imgur.com/5RWKcei.png)
  
</details>

## UptimeRobot Setup
![UptimeRobot Logo](https://uptimerobot.com/assets/img/logo_plain.png)
1. Once your account is created, head over to https://uptimerobot.com/dashboard.php
2. Click "Add New Monitor"
3. Select "HTTP(S)"
4. Set Friendly Name to whatever you want like "ModMail Bot" or something.
5. For URL, set it to https://your-project-name.glitch.me/ , replacing `your-project-name` with your actual project name. You can also get the link by clicking "Show" in the Glitch project. 
6. Set Monitoring Interval to every 5 minutes (lowest).
7. Optionally, you can select an alert contact that it will alert when the project goes offline - I've never used this with any bots.
8. Click "Create Monitor" (if you don't select an alert contact you might have to click this twice).
9. You're set with the monitor - it should keep your bot up and running 24/7. Expect occasional downtime, it doesn't happen all the time - just sometimes.

# Additional Resources
* [Glitch Support Forum](https://support.glitch.com/)
* [Discord Support Server](https://discord.gg/vRuhG9R) - Though don't bother to ask for Glitch help. They won't be of much help there as they are anti-glitch.
* You can personally contact me on Discord - Syndicate#2630. If I'm free, I'll try my best to help you but make sure you fully read through this guide before reaching out to me.

Hope you get your bot working with this, good luck! :wave:
