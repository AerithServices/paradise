from discord import Embed
from discord.ext import commands


class Help(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="help")
    async def help(self, ctx):
        embed = Embed(
            color=7327699,
            title="Help",
            description="Welcome to Red Hat V2, the bot has been reworked from the groundup and its much more stable\n\n###  `🤖` Commands:\n`.stock` = view stocks\n`.gen` = generate an account\n`.restock` = restock accounts\n`.help` = this message",
        ).set_footer(
            text="created by Red Hat industries. 2026",
        )

        await ctx.send(embed=embed)


async def setup(bot):
    await bot.add_cog(Help(bot))
