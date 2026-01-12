# Deploying LootList+ Discord Bot

Your bot is currently running locally and will show as **online**. However, it will go offline when you close the terminal or turn off your computer.

To keep the bot online 24/7, you need to deploy it to a hosting service.

## Option 1: Railway (Recommended - Free Tier Available)

Railway is the easiest option and has a generous free tier.

### Steps:

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your `loot-list-plus` repository

3. **Configure Service**
   - Railway will auto-detect the bot
   - Or manually set:
     - **Root Directory**: `discord-bot`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

4. **Add Environment Variable**
   - Go to project settings
   - Add variable: `DISCORD_BOT_TOKEN`
   - Paste your bot token from `.env.local` file (starts with `MTQ...`)

5. **Deploy**
   - Railway will automatically deploy
   - Bot will come online within 1-2 minutes
   - Check logs to confirm connection

### Railway Free Tier:
- $5 credit per month
- More than enough for a small bot
- 500 hours of runtime

## Option 2: Render (Free)

Render offers free hosting for web services.

### Steps:

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - **Name**: lootlist-plus-bot
   - **Root Directory**: `discord-bot`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Add Environment Variable**
   - In Environment section
   - Add `DISCORD_BOT_TOKEN` with your token value

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Check logs to see bot come online

### Render Free Tier:
- Free for 750 hours/month
- Enough to keep bot online 24/7
- May spin down after inactivity (will restart automatically)

## Option 3: Heroku (Paid - $5/month)

Heroku used to have a free tier but now requires payment.

1. Create Heroku account
2. Create new app
3. Connect GitHub repo
4. Set buildpack to Node.js
5. Add `DISCORD_BOT_TOKEN` config var
6. Deploy

## Option 4: VPS (DigitalOcean, Linode, etc.)

If you want full control:

1. Get a VPS ($5-10/month)
2. SSH into server
3. Install Node.js
4. Clone repository
5. Install PM2: `npm install -g pm2`
6. Run: `pm2 start discord-bot/bot.js --name lootlist-bot`
7. Setup PM2 to restart on server reboot: `pm2 startup`

## Checking if Bot is Online

After deploying:

1. Open Discord
2. Go to one of your servers
3. Check the member list on the right
4. Look for "LootList+#2672"
5. Should show a green dot (online status)

Or check deployment logs for:
```
✅ Bot is online as LootList+#2672
📊 Connected to 2 servers
```

## Troubleshooting

### Bot shows offline after deploy
- Check deployment logs for errors
- Verify `DISCORD_BOT_TOKEN` environment variable is set correctly
- Make sure service is running (not stopped/sleeping)

### Bot disconnects frequently
- Check if you're on a free tier with sleep mode
- Consider upgrading to paid tier or using Railway

### Can't see bot in member list
- Make sure bot has been invited to your server
- Check bot permissions in Discord Developer Portal
- Verify bot is actually online in deployment logs

## Current Status

✅ Bot code created and tested locally
✅ Bot successfully connects to Discord
✅ Bot shows online in 2 servers
⏳ **Next step**: Deploy to Railway or Render for 24/7 uptime

## Bot Information

- **Bot Name**: LootList+
- **Bot ID**: 1458757176171560980
- **Bot Tag**: LootList+#2672
- **Status Message**: "Playing LootList+ | lootlistplus.dev"
