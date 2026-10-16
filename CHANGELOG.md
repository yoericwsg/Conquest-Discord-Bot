# Changelog

## v4.6.2 Early Access (in preparation)

- Added a private owner/team command to manage the early-access test-server cohort.
- Improved deployment safety by keeping local runtime JSON records out of Bot-Hosting deploys.
- Expanded setup, anti-raid, anti-spam, permissions, and data-handling documentation.
- Early-access enrollment records a server only; it does not message or modify that server.

## v4.6.1

- Added slash-command support alongside prefix commands.
- Added moderation, configurable welcome/verification, tickets, leveling, economy, server utilities, and optional AI modes.
- Made lockdown reversible: it saves channel send permissions and preserves channels and messages.
- Made generated invites use a minimal core permission bundle by default; higher-permission bundles are opt-in.
- Kept application-owner maintenance and cross-server controls gated to the verified application owner/team.
