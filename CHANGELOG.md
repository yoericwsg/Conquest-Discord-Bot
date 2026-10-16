# Changelog

## v4.6.2 Early Access (testing)

- **+ Added** a private owner/team command to manage the early-access test-server cohort.
- **+ Added** `?installembedemoji` and `/installembedemoji` to install six clean, reusable embed emojis in a server.
- **+ Added** the owner/team-only `/changelogs` command in bot DMs alongside its prefix form.
- **+ Added** clear `+` additions, `~` improvements, and `−` fixes to published changelogs; refreshed help details.
- **~ Improved** runtime JSON writes with atomic replacement and recovery copies for malformed files.
- **− Fixed** command alias routing; `?flip` consistently flips a coin, while `?reversetext` reverses text.
- **− Fixed** status and bot-info panels to report prefix and slash command counts separately.
- **~ Improved** anti-raid verification recovery after temporary API failures and respect for manual changes.
- **~ Improved** deployment safety by excluding local runtime records and shipping release notes as application content.
- **~ Improved** setup, anti-raid, anti-spam, permissions, and data-handling documentation.
- Early-access enrollment records a server only; it does not message or modify that server.

## v4.6.1

- Added slash-command support alongside prefix commands.
- Added moderation, configurable welcome/verification, tickets, leveling, economy, server utilities, and optional AI modes.
- Made lockdown reversible: it saves channel send permissions and preserves channels and messages.
- Made generated invites use a minimal core permission bundle by default; higher-permission bundles are opt-in.
- Kept application-owner maintenance and cross-server controls gated to the verified application owner/team.
