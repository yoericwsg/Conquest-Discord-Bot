# Changelog

## v4.6.2 Early Access (testing)

- Added a private owner/team command to manage the early-access test-server cohort.
- Made runtime JSON updates atomic and preserve a recovery copy when a data file is malformed.
- Prevented command aliases from silently overriding another command; `?flip` now consistently flips a coin, and `?reversetext` reverses text.
- Corrected status and bot-info panels to report prefix and slash command counts separately instead of double-counting commands.
- Anti-raid verification now retries restoration after temporary API failures and respects manual verification changes.
- Improved deployment safety by keeping local runtime JSON records out of Bot-Hosting deploys.
- Expanded setup, anti-raid, anti-spam, permissions, and data-handling documentation.
- Early-access enrollment records a server only; it does not message or modify that server.

## v4.6.1

- Added slash-command support alongside prefix commands.
- Added moderation, configurable welcome/verification, tickets, leveling, economy, server utilities, and optional AI modes.
- Made lockdown reversible: it saves channel send permissions and preserves channels and messages.
- Made generated invites use a minimal core permission bundle by default; higher-permission bundles are opt-in.
- Kept application-owner maintenance and cross-server controls gated to the verified application owner/team.
