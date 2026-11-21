import asyncio
import logging
import os
import psutil
import discord
from discord.ext import commands, tasks

# Configure console logger
logging.basicConfig(
    level=logging.INFO,
    format='[ ZNE ] %(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

from utils.config import TOKEN
from utils.db import init_db, is_server_blacklisted, is_user_blacklisted
from utils.views import JoinMessage, REQUIRED_SERVER_ID
from utils.globals import command_count


intents = discord.Intents.default()
intents.guilds = True
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents)


async def global_blacklist_check(interaction: discord.Interaction) -> bool:
    if interaction.guild_id and await is_server_blacklisted(interaction.guild_id):
        await interaction.response.send_message("❌ `Cannot use this command in this server`", ephemeral=True)
        return False
    
    if await is_user_blacklisted(interaction.user.id):
        await interaction.response.send_message("😡 You are blacklisted from using this bot.", ephemeral=True)
        return False
    
    # Increment command count
    global command_count
    command_count += 1
    
    # Check if user is in required server
    required_server = bot.get_guild(REQUIRED_SERVER_ID)
    if required_server is None:
        # Bot is not in the required server, cannot verify membership
        logger.warning(f"Bot is not in required server {REQUIRED_SERVER_ID}")
        return True
    
    try:
        # Try fetching from API first (more reliable for recently joined members)
        try:
            member = await required_server.fetch_member(interaction.user.id)
        except discord.NotFound:
            member = None
        except discord.Forbidden:
            logger.warning(f"Bot lacks permission to fetch member {interaction.user.id}")
            # Allow the command if we can't check
            return True
        
        if member is None:
            await interaction.response.send_message(view=JoinMessage(), ephemeral=True)
            return False
    except Exception as e:
        logger.error(f"Error checking membership: {e}")
        # Allow the command on error
        return True
    
    return True

bot.tree.interaction_check = global_blacklist_check

COGS = [
    "cogs.raid",
    "cogs.owner",
    "cogs.ghost",
    "cogs.fake",
    "cogs.dm",
]

INFO_CHANNEL_ID = 1477953681377853483


async def send_info_embed():
    """Send the info embed to the designated channel."""
    channel = bot.get_channel(INFO_CHANNEL_ID)
    if not channel:
        logger.warning(f"Could not find channel {INFO_CHANNEL_ID}")
        return
    
    # Get system stats
    process = psutil.Process(os.getpid())
    ram_usage = process.memory_info().rss / 1024 / 1024
    cpu_usage = process.cpu_percent()
    
    # Get libraries
    try:
        with open("requirements.txt", "r") as f:
            libs = [line.strip() for line in f if line.strip()]
            libs_formatted = "\n - ".join(libs)
    except:
        libs_formatted = "discord.py"
    
    # Get bot info
    bot_server_count = len(bot.guilds)
    
    # Get ZNE server member count
    zne_server = bot.get_guild(1459804477770039386)
    zne_member_count = zne_server.member_count if zne_server else "Server Teminated."
    
    # Get total synced commands
    total_synced_commands = len(bot.tree.get_commands())
    
    embed = discord.Embed(
        color=9995775,
        title="Bot Info",
        description=f"made by [voby7](https://voby.page.gd/) for [zne](https://discord.gg/sillyz)\nzne member count: **{zne_member_count}**\nbot server count: **{bot_server_count}**\nbot was made in **June 2025**\nthis is the **raid** bot\n**------------------------------------------------**\ntotal commands synced: **{total_synced_commands}**\ntotal commands executed: **{command_count}**\nram usage: **{ram_usage:.2f} MB**\ncpu usage: **{cpu_usage:.2f}%**\n\nlibraries installed: \n - {libs_formatted}\n\nlanguage: **python**\n**------------------------------------------------**\n",
    )
    embed.set_thumbnail(url="https://dnvsrzeijhduiqsrlkmc.supabase.co/storage/v1/object/public/hosted-files/54a084b2-a7e6-4415-81e9-cd4052d91c58/VI2Whjcx_206f5b851a8ad773cd5712f497583f6a.jpg?download=206f5b851a8ad773cd5712f497583f6a.jpg")
    
    try:
        await channel.send(embed=embed)
        logger.info("Info embed sent successfully")
    except Exception as e:
        logger.error(f"Failed to send info embed: {e}")


@tasks.loop(hours=6)
async def auto_send_info():
    """Task to send info embed every 6 hours."""
    await send_info_embed()


@bot.event
async def on_ready():
    await init_db()
    logger.info("Database initialized!")

    for cog in COGS:
        await bot.load_extension(cog)
        logger.info(f"Loaded cog: {cog}")

    await bot.tree.sync()
    logger.info(f"Logged in as {bot.user}")
    
    # Start the auto-send info task
    auto_send_info.start()


async def main():
    try:
        await bot.start(TOKEN)
    except KeyboardInterrupt:
        logger.info("Shutting down bot...")
        await bot.close()

asyncio.run(main())
