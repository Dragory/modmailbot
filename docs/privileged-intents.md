# Privileged Intents

Modmail requires [Privileged Intents](https://support-dev.discord.com/hc/en-us/articles/6207308062871-What-are-Privileged-Intents) for some of its features.
If your instance of the bot can see more than 10,000 members, you might need to complete Discord's [Privileged Intent Review](https://docs.discord.com/developers/gateway/getting-started-with-privileged-intent-review).
Below are some guidelines for answering the questions in the review. Note that these are just a starting point -- you must adjust the answers to match your own setup where appropriate.

## General review questions

- ### "What does your application do?"
  > Modmail is a ticketing system that lets users contact server staff through the bot instead of messaging staff members individually or pinging them publicly in the server. These messages get relayed to modmail threads (tickets), channels where staff members can reply to the user and discuss the case internally. To the user, the entire exchange happens with the bot, while staff members see the conversation as a ticket with a mix of internal discussion and replies to/from the user.
  > 
  > This is a self-hosted, single-community instance of the following open source bot: https://github.com/Dragory/modmailbot
- ### "Do you have a public Privacy Policy telling your users about their data usage?"
  ```
  Yes
  ```
  - #### "Where is your Privacy Policy available?"
    Describe where your [privacy policy](./privacy-policy.md) is available.

  - #### "Where is your Privacy Policy available?"
    Describe where your [privacy policy](./privacy-policy.md) is available.

  - #### "Please share a link to your Privacy Policy."
    Include a link to your [privacy policy](./privacy-policy.md) here.

- ### "How do users contact you to request deletion of their activity data?"
  No guideline here, as this depends on your own processes and privacy policy.

## Message Content Intent

- ### "Can users opt-out of having their message content data tracked?"
  ```
  Yes
  ```
- ### "Are you storing message content data off-platform (outside of Discord)?"
  ```
  Yes
  ```
  - #### "Are you storing user message content data for 30 days or less?"
    ```
    No
    ```

  - #### "How do users contact you to request deletion of their activity data?"
    > Contact details are included as part of the bot's privacy policy: `<link to privacy policy>`

  - #### "Are you encrypting the data that you store at rest, as is required by our developer policy?"
    ```
    Yes
    ```
    **Note:** To comply with [Discord Developer Terms of Service](https://support-dev.discord.com/hc/en-us/articles/8562894815383-Discord-Developer-Terms-of-Service), you must ensure your bot's database is encrypted at rest. See [Note on Discord Developer Terms of Service](./setup.md#note-on-discord-developer-terms-of-service).

- ### "Will the message content data be used to train machine learning or AI Models?"
  ```
  No
  ```

- ### "Why do you need the Message Content intent?"
  > In Modmail, each ticket is represented by a staff-only channel. In addition to messages to/from the user who opened the ticket, these channels contain internal discussions, bot commands, and other relevant information to the ticket. When the ticket is closed, the channel is deleted and Modmail creates a transcript of the ticket that includes all activity within the ticket channel. These transcripts are critical for moderation work and require the Message Content intent to work.

- ### "Please provide links to screenshots and/or videos that demonstrate your use case"
  > Please see the following link for screenshots of an example modmail thread as well as the generated transcript:
  > 
  > https://github.com/Dragory/modmailbot/blob/master/screenshots#modmail-thread-transcript

## Server Members Intent
Note that this intent is only required if you use the bot's server greeting or join/leave notification features.

- ### "Why do you need the Guild Members intent?"
  > The bot includes a "server greetings" feature where the bot sends a DM to new members as they join the server, letting them know that they can message modmail if they need help.
  > 
  > The bot includes a join/leave notifications feature that posts a note in the modmail thread if the user contacting the bot leaves or rejoins the server while the thread is open. This is important context, as a user that has left the server can no longer be messaged by the bot.

- ### "Please provide links to screenshots and/or videos that demonstrate your use case"
  > Please see the following link for a screenshot of a greeting message sent by the bot:
  > 
  > https://github.com/Dragory/modmailbot/blob/master/screenshots#greeting-message

- ### "Are you storing message content data off-platform (outside of Discord)?"
  ```
  Yes
  ```

  - #### "Are you storing user message content data for 30 days or less?"
    ```
    No
    ```

  - #### "How do users contact you to request deletion of their activity data?"
    > Contact details are included as part of the bot's privacy policy: `<link to privacy policy>`

  - #### "Are you encrypting the data that you store at rest, as is required by our developer policy?"
    ```
    Yes
    ```
    **Note:** To comply with [Discord Developer Terms of Service](https://support-dev.discord.com/hc/en-us/articles/8562894815383-Discord-Developer-Terms-of-Service), you must ensure your bot's database is encrypted at rest. See [Note on Discord Developer Terms of Service](./setup.md#note-on-discord-developer-terms-of-service).
