# Changelog

## v4.6.2 Early Access (testing)

- Added a private owner/team command to manage the early-access test-server cohort.
- Added `?installembedemoji` and `/installembedemoji` to install six clean, reusable embed emojis in a server.
- Updated published changelogs with clear `+` additions, `~` improvements, and `−` fixes; refreshed the help panel's command and permission details.
- Made runtime JSON updates atomic and preserve a recovery copy when a data file is malformed.
- Fixed command alias routing; `?flip` consistently flips a coin, while `?reversetext` reverses text.
- Corrected status and bot-info panels to report prefix and slash command counts separately.
- Improved anti-raid verification recovery after temporary API failures and respect for manual changes.
- Kept local runtime JSON records out of Bot-Hosting deploys and moved release notes into tracked application content.
- Expanded setup, anti-raid, anti-spam, permissions, and data-handling documentation.
- Early-access enrollment records a server only; it does not message or modify that server.

## v4.6.1

- Added slash-command support alongside prefix commands.
- Added moderation, configurable welcome/verification, tickets, leveling, economy, server utilities, and optional AI modes.
- Made lockdown reversible: it saves channel send permissions and preserves channels and messages.
- Made generated invites use a minimal core permission bundle by default; higher-permission bundles are opt-in.
- Kept application-owner maintenance and cross-server controls gated to the verified application owner/team.
