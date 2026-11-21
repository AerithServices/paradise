# Red Hat GEN

Red Hat GEN is a Discord account generation bot that distributes service accounts via direct message. Built with `discord.py`.

## Features

- Generate accounts from local stock files
- Real-time stock inventory via `.stock`
- Owner-only restocking, unstocking, and bulk restocking via Discord attachments
- Private DM delivery of generated accounts
- Per-user cooldown with owner bypass

## Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `.gen <type>` | Main Account generation command. | Everyone |
| `.stock` | Lists available stocks. | Everyone |
| `.restock <type>` | Upload `.txt` files to add accounts to a stock. | Owner only |
| `.unstock <type>` | Delete an entire stock file. | Owner only |
| `.bulkrestock` | Upload multiple `.txt` files to create stocks automatically. | Owner only |
| `.help` | Show the help embed. | Everyone |

## Requirements

- Python 3.8+
- `discord.py` >= 2.3.0
- Discord bot token with **Message Content** and **Server Members** intents enabled

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Create `config.json` in the project root:

```json
{
    "token": "YOUR_BOT_TOKEN",
    "prefix": ".",
    "owner_id": "YOUR_DISCORD_USER_ID"
}
```

3. Enable intents on the [Discord Developer Portal](https://discord.com/developers/applications):
   - **Message Content Intent**
   - **Server Members Intent**

4. Run:

```bash
python main.py
```

## Bot Structure

```
.
├── main.py
├── config.json
├── requirements.txt
├── core/
│   ├── core.py        # Bot setup, intents, extension loading
│   └── context.py     # Custom embed response methods
├── commands/
│   ├── gen.py
│   ├── stock.py
│   ├── help.py
│   └── restock.py
└── stocks/
    ├── netflix.txt
    ├── disney.txt
    └── ...
```

## Notes

- `.gen` has a **150-second cooldown** per user. The bot owner bypasses this.
- Accounts are permanently removed from stock after generation.
- Keep `config.json` private and never commit it to version control.
- The bot default activity is set to streaming with text: `Red Hat.breed.rip | free accounts for everybody!`.
