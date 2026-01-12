# LootList+ Discord Bot

This is the Discord bot that keeps the LootList+ bot online in Discord servers.

## Running Locally

1. Make sure you have the bot token in your `.env.local` file in the parent directory
2. Run the bot:
   ```bash
   cd discord-bot
   npm start
   ```

## What This Bot Does

- Connects to Discord and stays online
- Shows presence in all servers it's added to
- Displays status: "Playing LootList+ | lootlistplus.dev"

## Deployment

This bot needs to run 24/7 to stay online. You can deploy it to:

### Option 1: Railway (Recommended - Free)
1. Create account at railway.app
2. Create new project
3. Deploy from GitHub
4. Add DISCORD_BOT_TOKEN environment variable
5. Bot will stay online 24/7

### Option 2: Render (Free)
1. Create account at render.com
2. Create new Web Service
3. Connect your GitHub repo
4. Set build command: `cd discord-bot && npm install`
5. Set start command: `cd discord-bot && npm start`
6. Add DISCORD_BOT_TOKEN environment variable

### Option 3: Keep Running Locally
- Run `npm start` and keep terminal open
- Bot will stay online as long as your computer is on

## Bot Invite Link

To add the bot to servers, use this link format:
```
https://discord.com/api/oauth2/authorize?client_id=1458757176171560980&permissions=0&scope=bot
```

Replace `1458757176171560980` with your bot's Application ID from Discord Developer Portal.
