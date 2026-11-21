import os
import discord
from discord.ext import commands
from typing import Optional
from .context import Context


class Bot(commands.Bot):
    def __init__(self, config: dict):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True

        super().__init__(
            command_prefix=config.get("prefix", "!"),
            intents=intents,
            case_insensitive=True,
            help_command=None,
            activity=discord.Activity(
                    name=f"zne.breed.rip | free accounts for everybody!",
                    type=discord.ActivityType.streaming,
                    url="https://twitch.tv/voby7"),
            strip_after_prefix=True,
        )
        self.config = config

    async def get_context(self, message, *, cls=Context):
        return await super().get_context(message, cls=cls)

    async def setup_hook(self):
        for filename in os.listdir("./commands"):
            if filename.endswith(".py") and filename != "__init__.py":
                ext = f"commands.{filename[:-3]}"
                try:
                    await self.load_extension(ext)
                    print(f"Loaded extension: {ext}")
                except Exception as e:
                    print(f"Failed to load extension {ext}: {e}")

    async def on_ready(self):
        print(f"Logged in as {self.user}")
        print(f"Bot ID: {self.user.id}")
        print(f"Guilds: {len(self.guilds)}")

    async def load_extension(self, name: str):
        await super().load_extension(name)

    async def unload_extension(self, name: str):
        await super().unload_extension(name)

    async def reload_extension(self, name: str):
        await self.unload_extension(name)
        await self.load_extension(name)

    def run(self, token: str):
        super().run(token)
