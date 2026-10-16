<div align="center">

# ⚔️ Conquest

### A flexible Discord bot for safer, more capable communities.

[![License: MIT](https://img.shields.io/badge/license-MIT-5865F2.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-57F287.svg)](https://nodejs.org/)
[![Release](https://img.shields.io/badge/release-v4.6.2%20early%20access-FEE75C.svg)](CHANGELOG.md)

**Moderation · Anti-raid · Setup tools · Tickets · Leveling · Optional AI**

</div>

Conquest is an independent community project. This repository contains the bot's application code and documentation. It does not include the running bot's credentials, live server/user data, hosting configuration, or backups.

> 🧪 **v4.6.2 is in early-access preparation.** The DM-only `?earlyaccess` command records selected test servers for the team; adding a server does not message or change it. Experimental features must explicitly check the early-access registry before they affect a server.

## ✨ What Conquest can do

- 🛡️ **Moderation and safety:** warnings, timeouts, kicks, bans, slow mode, reversible lockdown, anti-spam, and anti-raid alerts.
- 🧰 **Server setup:** welcome and verification flows, role tools, ticket panels, and starter layouts for community, gaming, study, and creator servers.
- 🎟️ **Community tools:** tickets, leveling, economy, polls, giveaways, utility commands, and custom commands.
- 🤖 **Optional AI:** configurable AI channels and modes. AI is optional; the rest of the bot can run without an AI provider key.
- 🧾 **Open source:** MIT-licensed code with contribution and security-reporting guidance.

## 🚀 Set up your own instance

### 1. Create the Discord application

Create an application and bot in the [Discord Developer Portal](https://discord.com/developers/applications). Copy the bot token into a private environment variable; never commit or share it. Start with the `bot` and `applications.commands` OAuth scopes and grant only the permissions needed for the features you enable. The bot's `?invite` command can generate a least-privilege invite for an already running instance.

### 2. Enable the intents you need

In **Bot → Privileged Gateway Intents**, enable **Server Members Intent** for join, leave, welcome, and member features. Enable **Message Content Intent** for `?` prefix commands, AFK, message utilities, and configured AI channels. Keep those intents off if you do not use the related features.

### 3. Install and configure

Use Node.js 22 or newer, then:

```sh
git clone https://github.com/yoericwsg/Conquest-Discord-Bot.git
cd Conquest-Discord-Bot
npm install
```

Copy `.env.example` to `.env` and set `DISCORD_TOKEN`. Add `GROQ_API_KEY` only if you want to use the Groq-backed AI features. Keep `.env` private.

### 4. Start Conquest

```sh
npm start
```

At startup, Conquest loads prefix and slash commands and registers slash commands globally. Discord can take a little while to show new global commands.

### 5. Deploy with Bot-Hosting

Link the project folder to your deployment with `npx bot-hosting link <deployment-id>`. Set `DISCORD_TOKEN` in the host's private environment settings, then run `npx bot-hosting deploy`. To deploy on each save, use `npx bot-hosting deploy --watch`. Check output with `npx bot-hosting logs -n 100`.

### 6. Configure a server

Invite Conquest, then use `?help` to browse commands. An administrator can configure logging with `?setlog #mod-log`, set welcome or verification options, create a ticket panel, and apply a starter layout with `?serverbuild community` (or `gaming`, `study`, `creator`). The bot needs the corresponding channel/role permissions for each feature. Review Discord's invite screen and grant additional permissions only when you enable those features.

## 🛡️ Anti-raid and anti-spam

Anti-raid monitoring is enabled in **medium** mode by default. The application owner/team can inspect or change this global setting in a bot DM with `?antiraid` or `?antiraid high`:

| Mode | Join burst that triggers an alert | Automatic action |
| --- | --- | --- |
| `off` | None | None |
| `low` | 10 joins in 10 seconds | Alert only |
| `medium` | 5 joins in 5 seconds | Alert only |
| `high` | 3 joins in 5 seconds | Temporarily raises server verification for 10 minutes when the bot has Manage Server; then restores the prior level |

Conquest also alerts on bursts of channel or role deletions. These alerts are for staff visibility; they do not automatically ban users or rebuild deleted channels. The anti-spam system times out a regular member for 30 seconds after 7 messages in 5 seconds; administrators and members with Manage Messages are excluded. Alerts go to the configured log channel, or the server's system channel when no log channel is set.

For an incident, server administrators can run `?lockdown <reason>` and then `?lockdown confirm`. Lockdown preserves channels and messages, temporarily restricts member sending, and can be reversed with `?cancellockdown`.

## 🧪 v4.6.2 early-access cohort

The application owner/team can manage the test-server list in a direct message with the bot:

```text
?earlyaccess 123456789012345678
?earlyaccess list
?earlyaccess remove 123456789012345678
```

Conquest must already be in the selected server. This records the server for the test cohort; it does not send an announcement, change server settings, or automatically enable experimental features. Any v4.6.2 experiment should check the early-access registry before running.

## 🧭 Useful commands

| Command | What it does |
| --- | --- |
| `?help` | Browse available commands |
| `?status` / `?ping` | Check bot status and latency |
| `?antiraid [off\|low\|medium\|high]` | Owner/team DM: view or set global anti-raid sensitivity |
| `?serverbuild <template>` | Add a starter layout without deleting existing items |
| `?ticketpanel [#channel]` | Post a support panel |
| `?invite [core\|moderation\|setup\|full]` | Generate an invite; review any extra permissions before approving |
| `?checkservers` | Owner/team DM: inspect bot server membership and announcement setup |
| `?announce <serverID> <reason>` | Owner/team DM: announce to a selected server |
| `?downtime 1hr <reason>` | Owner/team DM: post a temporary maintenance notice |

Commands with cross-server reach are restricted to the verified application owner/team and run in bot DMs. Server moderation and configuration commands also check Discord permissions.

## 🔐 Intents, AI, and data

Conquest stores runtime settings and feature records as JSON under `data/` on the host. Depending on the features enabled, records may include server configuration, AFK state, leveling/economy progress, warnings, custom commands, and moderation/security settings. Snipe/edit-snipe message details are held in process memory. Never publish live `data/*.json` files.

When AI mode is enabled in a channel, relevant message text and supported image input may be sent to the configured AI provider to generate a response. Check the provider's current terms and privacy settings before enabling AI. This repository does not define a hosting provider's logs, backups, location, or retention period; operators should disclose and configure those separately.

## 🧑‍💻 Contributing and security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Please report vulnerabilities privately through GitHub Security Advisories when available; see [SECURITY.md](SECURITY.md).

## 📜 License

Conquest is released under the [MIT License](LICENSE). It is an independent project and is not endorsed by Discord.
