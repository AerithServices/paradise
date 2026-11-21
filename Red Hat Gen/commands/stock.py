from discord import Embed
from discord.ext import commands
from pathlib import Path


class Stock(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="stock")
    async def stock(self, ctx):
        stocks_path = Path(__file__).resolve().parent.parent / "stocks"

        if not stocks_path.exists():
            return await ctx.warn("No stocks folder found.")

        files = [f for f in stocks_path.iterdir() if f.is_file()]

        if not files:
            return await ctx.warn("No stocks found. Use `.restock {type} {file}` to add some.")

        lines = []
        for file in files:
            try:
                count = len(file.read_text(encoding="utf-8").splitlines())
                lines.append(f"**{file.stem}** - `{count}`")
            except Exception:
                continue

        embed = Embed(
            color=10414983,
            title="The Stocks!",
            description=f"This is the Stocks for Red Hat, run `.gen {{type}}` to get an account\n\n" + "\n".join(lines),
        )

        await ctx.send(embed=embed)


async def setup(bot):
    await bot.add_cog(Stock(bot))
