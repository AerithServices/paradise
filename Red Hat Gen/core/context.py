import discord
from discord.ext import commands


class Context(commands.Context):
    async def deny(self, message: str):
        embed = discord.Embed(
            description=f"<:deny:1529732544189304923> {message}",
            color=0xE74C3C,
        )
        await self.send(embed=embed)

    async def success(self, message: str):
        embed = discord.Embed(
            description=f"<:approve:1529732623273037895> {message}",
            color=0x2ECC71,
        )
        await self.send(embed=embed)

    async def warn(self, message: str):
        embed = discord.Embed(
            description=f"<:warn:1529733126547308544> {message}",
            color=0xF1C40F,
        )
        await self.send(embed=embed)


def setup(bot):
    bot.add_context(Context)
