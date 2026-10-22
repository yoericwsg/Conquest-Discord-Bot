<div align="center">

# Conquest

### Discord moderation and community management bot

[![License: MIT](https://img.shields.io/badge/license-MIT-5865F2.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-57F287.svg)](https://nodejs.org/)
[![Release](https://img.shields.io/badge/release-v4.6.2%20early%20access-FEE75C.svg)](CHANGELOG.md)

**Moderation · Anti-raid · Server setup · Tickets · Leveling**

</div>

Conquest is an independent community project. This repository is the **public source snapshot**: you can inspect it, fork it, modify it, and run your own separate bot instance under the MIT license. Cloning this repository does **not** give you access to Conquest's hosted bot, its Discord account, private team tools, production credentials, live server/user data, hosting configuration, or backups. A self-hosted copy is your own deployment and must use a bot application and token that you control.

> **v4.6.2 is in early-access testing.** The DM-only `?earlyaccess` command records selected test servers for the team. Adding a server does not message or change it. Experimental features must explicitly check the early-access registry before they affect a server.

## Features

- **Moderation and safety:** warnings, timeouts, kicks, bans, slow mode, reversible lockdown, anti-spam, and anti-raid alerts.
- **Server setup:** welcome and verification flows, role tools, ticket panels, and starter layouts for community, gaming, study, and creator servers.
- **Community tools:** tickets, leveling, economy, polls, giveaways, utility commands, and custom commands.
- **Optional AI integration:** AI channels and modes are disabled unless configured. The rest of the bot works without an AI provider key.
- **Open source:** MIT-licensed code with contribution and security-reporting guidance.

## Install your own instance

### Quick start

For the shortest local setup, use Node.js 22 or newer, create a Discord application, add its token to `.env`, and run:

```sh
npm install
npm start
```

The default prefix is `?`. Run `?help` in a server after inviting the bot. Slash commands are registered globally at startup and can take a few minutes to appear.

### 1. Create the Discord application

Create an application and bot in the [Discord Developer Portal](https://discord.com/developers/applications). Copy the bot token into a private environment variable; never commit or share it. Start with the `bot` and `applications.commands` OAuth scopes and grant only the permissions needed for the features you enable. The bot's `?invite` command can generate a least-privilege invite for an already running instance.

### 2. Enable the intents you need

In **Bot → Privileged Gateway Intents**, enable **Server Members Intent** for join, leave, welcome, and member features. Enable **Message Content Intent** for `?` prefix commands, AFK, message utilities, and configured AI channels. Keep those intents off if you do not use the related features.

### 3. Download the source and install dependencies

You can **clone** the repository to make a local working copy, or use GitHub's **Fork** button to create your own GitHub copy. A fork tracks your changes separately; it does not connect to or control the official Conquest bot.

Install [Git](https://git-scm.com/downloads) and [Node.js 22 or newer](https://nodejs.org/) first. Then run:

```sh
git clone https://github.com/yoericwsg/Conquest-Discord-Bot.git
cd Conquest-Discord-Bot
npm install
```

Create your private environment file from the example. On Windows PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

On macOS or Linux:

```sh
cp .env.example .env
```

Set `DISCORD_TOKEN` to the token for **your own** Discord bot application. `GROQ_API_KEY` is optional and only needed for Groq-backed AI features. Set `SESSION_SECRET` to a long, randomly generated private value if you use features that rely on it. Never paste secrets into issues, commits, screenshots, or chat. `.env` is excluded by `.gitignore`; `.env.example` is safe to commit because its values are placeholders.

### 4. Start Conquest

```sh
npm start
```

At startup, Conquest loads prefix and slash commands and registers slash commands globally. Discord can take a little while to show new global commands.

### 5. Deploy with Bot-Hosting

From the project folder, sign in once, link the deployment, add `DISCORD_TOKEN` in the host's private environment settings, and deploy:

```sh
npx bot-hosting login
npx bot-hosting link <deployment-id>
npx bot-hosting deploy
```

Use `npx bot-hosting deploy --watch` while developing. Check the latest output with `npx bot-hosting logs -n 100`. Keep the token in the host's environment settings; do not put it in a command, commit, or README.

### 6. Invite the bot to a test server

Create an OAuth2 URL in the Developer Portal with the `bot` and `applications.commands` scopes. Select only the permissions required by the features you plan to use. Keep the bot's role above any roles it needs to manage. Start with a private test server before inviting it to a larger community.

### 7. Configure a server

Invite Conquest, then use `?help` to browse commands. An administrator can configure logging with `?setlog #mod-log`, set welcome options, create a ticket panel, list templates with `?templates`, apply a starter layout with `?serverbuild community` (or `gaming`, `study`, `creator`), and set up verification with `?setverify #verify @Member`. Disable the panel configuration with `?verifyoff`; existing verification messages stay in the channel. The bot needs the corresponding channel/role permissions for each feature. Review Discord's invite screen and grant additional permissions only when you enable those features.

For server-local embed styling, an administrator with **Manage Expressions** can run `?installembedemoji` or `/installembedemoji`. The core pack adds six Conquest emojis without replacing or deleting existing emojis. For the full **102-symbol** set, run `?installembedemoji full` or use `/installembedemoji` with **full: true**. The full pack includes themed moderation, safety, server, utility, community, support, status, and economy icons. Discord limits how many custom emojis each server can store, so the command installs what fits, reports the result, and stops when the server reaches its limit. The bot also needs **Create Expressions** or **Manage Expressions**. Custom embeds include Conquest branding and a timestamp; use the server emoji picker to insert installed icons into titles or descriptions.

### 8. First-run checklist

1. Confirm the bot is online in the Discord Developer Portal and the terminal shows a successful login.
2. Invite it to a test server using the `bot` and `applications.commands` scopes. Begin with only the permissions needed for the features you plan to try. Add permissions such as Manage Messages, Manage Roles, Manage Channels, or Moderate Members only when needed, and only after reviewing the code paths that use them.
3. Enable **Message Content Intent** if you want `?` prefix commands. Enable **Server Members Intent** if you want member join/leave and welcome features. Some privileged intents may require approval for larger Discord applications.
4. In the test server, run `?help`, then configure logging and welcome features before enabling moderation automation. Test destructive or server-wide actions in a private test server first.
5. Keep the process running in a reliable host if you want the bot online continuously. `npm start` in a local terminal stops when that terminal or computer stops.

### Common setup problems

- **`Used disallowed intents`**: enable the matching privileged intent in the Developer Portal, then restart the bot.
- **Prefix commands do not respond**: enable Message Content Intent, check the `?` prefix, and confirm the bot can view the channel and send messages.
- **Slash commands do not appear immediately**: global command registration can take time. Confirm the invite included `applications.commands`, then restart once and check again.
- **Missing access / missing permissions**: check the bot role position and channel-specific overwrites. Grant only the permission required by the specific feature.
- **AI replies fail**: AI is optional. Check `GROQ_API_KEY` and provider availability, or leave AI disabled and use the rest of the bot.
- **Bot exits after launch**: read the first error in the terminal, confirm Node.js is version 22+, run `npm install` again, and verify the environment variable names. Do not share the token when asking for help.

### Permissions by feature

| Feature | Main Discord permissions | Extra intent |
| --- | --- | --- |
| Prefix commands | View Channel, Send Messages, Embed Links | Message Content |
| Welcome, leave, autorole | Send Messages, Embed Links, Manage Roles | Server Members |
| Moderation | Moderate Members, Manage Messages, Kick/Ban Members | Server Members |
| Tickets and server layouts | Manage Channels, Manage Roles | None |
| Embed emoji installer | Manage Expressions | None |

The bot role must be above roles it assigns or moderates. Channel-specific overwrites can still block a permission granted at the server level.

### Run tests and inspect changes

Install dependencies with `npm install`, then run the project test suite with:

```sh
npm test
```

Review the source and the current [release notes](CHANGELOG.md) before enabling features in a production server. The public source snapshot can differ from the separately hosted Conquest service; do not assume a feature is active in the official bot just because it exists in this repository.

## Add selected features to another Discord bot

This repository is a complete Discord application, not an npm plugin. You can still reuse individual features in an existing bot:

1. Copy the command file and the `systems/` or `utils/` modules it imports.
2. Install the dependencies used by that feature. Most features use `discord.js`; image embeds use `sharp`; `groq-sdk` is only needed for the optional AI integration.
3. Register the command with your bot's prefix and slash-command loaders.
4. Copy the configuration keys and storage paths that the feature expects. Do not copy Conquest's `.env` or runtime `data/` files.
5. Enable the Discord intents and permissions listed in the command's source, then test in a disposable server.
6. Keep the MIT license and copyright notice, and label your deployment as an independent fork if you publish it.

## What this repository contains

- **You can:** read and audit the files published here, fork the repository, make changes, run a separate instance, and redistribute it under the [MIT license](LICENSE), while following that license and applicable law.
- **You do not receive:** the official bot's token, access to the official bot account, team authorization, hosted runtime, production configuration, private records, or a guarantee that every public-source feature is deployed on the official service.
- **You are responsible for your copy:** create and secure your own Discord application, configure permissions and intents, protect your secrets, review data handling, and keep dependencies and code updated.
- **Branding and identity:** the MIT license covers the code, not ownership of the Conquest name, logos, artwork, or the official Discord bot identity. Do not impersonate the official service or imply endorsement. Clearly label modified deployments as independent forks.
- **Public vs private:** this repository is the material intentionally published for inspection and reuse. Production secrets, live server data, backups, and hosting credentials are not part of it. Do not commit runtime `data/`, logs, backups, `.env`, or tokens.

## Repository layout

| Path | What it contains |
| --- | --- |
| `index.js` | Bot startup, event wiring, and command registration |
| `commands/` | Prefix and slash command implementations, organized by feature |
| `systems/` | Shared moderation, safety, storage, logging, setup, and integration systems |
| `utils/` | Reusable helpers |
| `content/` | Public static content such as release notes |
| `data/` | Runtime data location; generated records are ignored by Git |
| `*.test.js` under `systems/` | Automated tests run by `npm test` |
| `.env.example` | Placeholder names for local secrets and optional integrations |

A fork does not inherit official production data or deployment settings. Review `config.json` and the relevant command/system code before running a modified copy.

## Update a fork

To get newer upstream source into a clone that has no local changes:

```sh
git pull --ff-only origin main
npm install
npm test
npm start
```

If you have made local changes, commit or back them up before pulling, then merge/rebase deliberately and resolve conflicts. Read the release notes for migration notes before updating a long-running instance.

## FAQ

**Can I run the code without operating a Discord bot?** Yes. You can read and modify the source without creating an application. To connect it to Discord, you need a bot application and token that you control.

**Does cloning this repo add my server to the official Conquest bot?** No. It creates a copy of the source. Your server joins an instance only when you invite that instance's bot account.

**Can I publish a modified copy?** The source is MIT licensed. Preserve the license and copyright notice, make clear that your deployment is an independent fork, and do not publish credentials or private data. The license does not grant rights to Conquest branding or Discord account access.

**Where do I report a bug or security issue?** Use GitHub Issues for ordinary reproducible bugs and feature requests. Follow [SECURITY.md](SECURITY.md) to report vulnerabilities privately; do not post exploit details or secrets publicly.

## Anti-raid and anti-spam

Anti-raid monitoring is enabled in **medium** mode by default. The application owner/team can inspect or change this global setting in a bot DM with `?antiraid` or `?antiraid high`:

| Mode | Join burst that triggers an alert | Automatic action |
| --- | --- | --- |
| `off` | None | None |
| `low` | 10 joins in 10 seconds | Alert only |
| `medium` | 5 joins in 5 seconds | Alert only |
| `high` | 3 joins in 5 seconds | Temporarily raises server verification for 10 minutes when the bot has Manage Server; then restores the prior level |

Conquest also alerts on bursts of channel or role deletions. These alerts are for staff visibility; they do not automatically ban users or rebuild deleted channels. The anti-spam system times out a regular member for 30 seconds after 7 messages in 5 seconds; administrators and members with Manage Messages are excluded. Alerts go to the configured log channel, or the server's system channel when no log channel is set.

For an incident, server administrators can run `?lockdown <reason>` and then `?lockdown confirm`. Lockdown preserves channels and messages, temporarily restricts member sending, and can be reversed with `?cancellockdown`.

## v4.6.2 early-access cohort

The application owner/team can manage the test-server list in a direct message with the bot:

```text
?earlyaccess 123456789012345678
?earlyaccess list
?earlyaccess remove 123456789012345678
```

Conquest must already be in the selected server. This records the server for the test cohort; it does not send an announcement, change server settings, or automatically enable experimental features. Any v4.6.2 experiment should check the early-access registry before running.

## Common commands

| Command | What it does |
| --- | --- |
| `?help` | Browse available commands |
| `?status` / `?ping` | Check bot status and latency |
| `?antiraid [off\|low\|medium\|high]` | Owner/team DM: view or set global anti-raid sensitivity |
| `?serverbuild <template>` | Add a starter layout without deleting existing items |
| `?templates` | List the available community, gaming, study, and creator layouts |
| `?setverify #channel @role [message]` / `/setverify` | Post a button that gives a member role after verification |
| `?verifyoff` / `/verifyoff` | Remove the saved verification configuration without deleting its message |
| `?ticketpanel [#channel]` | Post a support panel |
| `?invite [core\|moderation\|setup\|full]` | Generate an invite; review any extra permissions before approving |
| `?checkservers` | Owner/team DM: inspect bot server membership and announcement setup |
| `?announce <serverID> <reason>` | Owner/team DM: announce to a selected server |
| `?downtime 1hr <reason>` | Owner/team DM: post a temporary maintenance notice |
| `?installembedemoji [full]` / `/installembedemoji` | Install the six-icon core pack or the optional 102-symbol full pack (Manage Expressions required) |
| `?changelogs latest` / `?changelogs older` or `/changelogs` | Owner/team DM: broadcast the latest or previous release notes |

Commands with cross-server reach are restricted to the verified application owner/team and run in bot DMs. Server moderation and configuration commands also check Discord permissions.

The release-note embed marks additions with **+**, improvements with **~**, and fixes with **−**.

## Intents, integrations, and data

Conquest stores runtime settings and feature records under `data/` on the host. Depending on the features enabled, records may include server configuration, AFK state, leveling/economy progress, warnings, custom commands, moderation/security settings, and recovery copies of malformed records. Snipe/edit-snipe message details are held in process memory. Never publish the contents of `data/`.

AI is optional. If you enable it, relevant message text and supported image input may be sent to the configured provider to generate a response. Review that provider's current terms and privacy settings before enabling it. The bot remains usable with AI disabled.

This repository does not define a hosting provider's logs, backups, location, or retention period. Operators should disclose and configure those separately.

## Contributing and security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Please report vulnerabilities privately through GitHub Security Advisories when available; see [SECURITY.md](SECURITY.md).

## License

Conquest is released under the [MIT License](LICENSE). It is an independent project and is not endorsed by Discord.



