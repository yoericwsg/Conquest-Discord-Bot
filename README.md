# Conquest Discord Bot

Public source for Conquest v4.6.1. This repository contains the bot's application code, command handlers, and shared systems. It does not contain the running bot's credentials, server/user data, hosting configuration, or backups.

## What the bot does

Conquest provides server moderation and safety tools, configurable welcome and verification flows, tickets, leveling, utility commands, and optional AI chat. Slash commands and the `?` prefix are supported. Server administrators control which features they enable and what permissions Conquest receives.

The source includes owner-only maintenance and cross-server operations. Those commands authorize against the Discord application owner/team at runtime; they do not grant access to repository users or bot users.

## Run your own instance

1. Create a Discord application and bot, then invite it with the `bot` and `applications.commands` scopes. Start with the minimum permissions needed and grant additional permissions only for features you enable.
2. Install Node.js 22 or later, then run `npm install`.
3. Copy `.env.example` to `.env` and set `DISCORD_TOKEN`. Set `GROQ_API_KEY` only if you want AI features.
4. Run `npm start`. The bot registers its slash commands at startup.

Never commit `.env`, bot tokens, API keys, or live `data/*.json` files. The repository ignores those paths.

## Intents and data handling

The bot requests the Guild Members and Message Content privileged intents. Guild Members supports join/leave, welcome, autorole, and moderation features. Message Content supports prefix commands, AFK handling, configured AI channels, and message utilities. Review these uses and enable only the intents you need in the Discord Developer Portal.

When AI mode is enabled in a channel, relevant message text and supported image input may be sent to Groq for a response. Check the AI provider's current terms and privacy settings before enabling the feature. If AI is not configured, the bot can still run its non-AI features.

Runtime settings and feature records are stored as JSON under `data/` on the host. Depending on enabled features, records can include guild configuration, AFK state, leveling/economy progress, warnings, custom commands, and moderation/security settings. Snipe/edit-snipe message details are kept in process memory. This repository does not define the hosting provider's logs, backups, location, or retention period; operators must disclose and configure those separately.

## Safety notes

- The default `?invite` permission bundle is minimal. Higher-permission bundles are explicit and should be reviewed on Discord's authorization screen.
- `?lockdown` requires Administrator confirmation, preserves channels and messages, and temporarily blocks member sends using saved permission overwrites. `?cancellockdown` restores the saved overwrites. Discord administrators can bypass channel restrictions.
- Moderation and server-management commands check the caller's Discord permissions. Keep the bot's role below trusted staff roles and only grant capabilities you intend to use.
- Conquest is an independent community project and is not endorsed by Discord.

## Development

Run the existing system tests with `npm test`. Contributions should include a concise description of the change and any relevant security or privacy impact. Please report security issues privately using GitHub's Security Advisories when enabled for this repository.

## License

MIT. See [LICENSE](LICENSE).
