import random
import discord
from discord.ext import commands
from pathlib import Path


class Gen(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.cooldown(1, 150.0, commands.BucketType.user)
    @commands.command(name="gen")
    async def gen(self, ctx, type: str):
        stocks_path = Path(__file__).resolve().parent.parent / "stocks"

        if not stocks_path.exists():
            ctx.command.reset_cooldown(ctx)
            return await ctx.warn("No stocks folder found.")

        target = type.lower()
        matched = None
        for file in stocks_path.iterdir():
            if file.is_file() and file.stem.lower() == target:
                matched = file
                break

        if not matched:
            ctx.command.reset_cooldown(ctx)
            return await ctx.warn(f"No stock found for `{type}`.")

        try:
            lines = matched.read_text(encoding="utf-8").splitlines()
            if not lines:
                ctx.command.reset_cooldown(ctx)
                return await ctx.warn(f"Stock `{type}` is empty.")

            account = random.choice(lines)

            try:
                embed = discord.Embed(
                    color=9068479,
                    title=f"here is your {type} account.",
                    description=f"```{account}```",
                )
                await ctx.author.send(embed=embed)
                await ctx.success(f"Sent `{type}` account to your DMs.")
            except discord.Forbidden:
                ctx.command.reset_cooldown(ctx)
                return await ctx.warn("Could not DM you. Please enable DMs.")

            remaining = [line for line in lines if line != account]
            if remaining:
                matched.write_text("\n".join(remaining), encoding="utf-8")
            else:
                matched.unlink()
        except Exception as e:
            await ctx.deny(f"Failed to generate: {e}")

    @gen.error
    async def gen_error(self, ctx, error):
        if isinstance(error, commands.CommandOnCooldown):
            owner_id = self.bot.config.get("owner_id")
            if owner_id and ctx.author.id == int(owner_id):
                self.gen.reset_cooldown(ctx)
                parts = ctx.message.content.strip().split(None, 1)
                if len(parts) >= 2:
                    await self.gen(ctx, parts[1])
                else:
                    await ctx.deny("Missing type argument.")
            else:
                retry = int(error.retry_after)
                minutes, seconds = divmod(retry, 60)
                time_str = f"{minutes}m {seconds}s" if minutes else f"{seconds}s"
                await ctx.warn(f"Command on cooldown. Try again in {time_str}.")


async def setup(bot):
    await bot.add_cog(Gen(bot))
