from datetime import datetime

import discord
from discord.ext import commands
from pathlib import Path


RESTOCK_CHANNEL_ID = 1534889587149897738

async def send_restock_notification(bot, restocks, title="RESTOCK"):
    channel = bot.get_channel(RESTOCK_CHANNEL_ID)
    if channel is None:
        return

    date_str = datetime.now().strftime("%#m/%#d/%Y")
    lines = [f"## {title} - {date_str}"]

    for service in restocks:
        name = service["name"].title()
        count = service["count"]
        total = service["total"]
        is_new = service["is_new"]

        if is_new:
            lines.append(f"> {name} (NEW!), stocked {count} account(s) (Total: {total})")
        else:
            lines.append(f"> {name}, stocked {count} account(s) (Total: {total})")

    content = "\n".join(lines)

    try:
        await channel.send(content=content)
    except Exception:
        pass


class Restock(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="restock")
    async def restock(self, ctx, type: str):
        owner_id = getattr(self.bot, "config", {}).get("owner_id")
        if owner_id and ctx.author.id != int(owner_id):
            return await ctx.deny("You do not have permission to use this command.")

        attachments = ctx.message.attachments

        if not attachments:
            return await ctx.deny("Please provide at least one `.txt` file attachment.")

        non_txt = [a.filename for a in attachments if not a.filename.endswith(".txt")]
        if non_txt:
            return await ctx.deny(f"Only `.txt` files are supported. Got: {', '.join(non_txt)}")

        try:
            all_lines = []
            for attachment in attachments:
                data = await attachment.read()
                text = data.decode("utf-8")
                lines = [line for line in text.splitlines() if line.strip()]
                all_lines.extend(lines)

            line_count = len(all_lines)
            cleaned = "\n".join(all_lines)

            stocks_path = Path(__file__).resolve().parent.parent / "stocks"
            stocks_path.mkdir(exist_ok=True)

            target_file = stocks_path / f"{type}.txt"
            is_new = not target_file.exists()

            target_file.write_text(cleaned, encoding="utf-8")
            new_total = len(cleaned.splitlines())

            await ctx.success(f"Successfully stocked `{line_count}` {type} Accounts!")
            try:
                await ctx.message.delete()
            except Exception:
                pass

            await send_restock_notification(
                self.bot,
                [
                    {
                        "name": type,
                        "count": line_count,
                        "total": new_total,
                        "is_new": is_new,
                    }
                ],
            )
        except Exception as e:
            await ctx.deny(f"Failed to restock: {e}")

    @restock.error
    async def restock_error(self, ctx, error):
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.deny("Missing arguments. Usage: `.restock {type} {file(s)}`")
        elif isinstance(error, commands.BadArgument):
            await ctx.deny("Invalid argument provided.")

    @commands.command(name="unstock")
    async def unstock(self, ctx, type: str):
        owner_id = getattr(self.bot, "config", {}).get("owner_id")
        if owner_id and ctx.author.id != int(owner_id):
            return await ctx.deny("You do not have permission to use this command.")

        stocks_path = Path(__file__).resolve().parent.parent / "stocks"
        if not stocks_path.exists():
            return await ctx.warn("No stocks folder found.")

        target = type.lower()
        matched = None
        for file in stocks_path.iterdir():
            if file.is_file() and file.stem.lower() == target:
                matched = file
                break

        if not matched:
            return await ctx.warn(f"No stock found for `{type}`.")

        try:
            matched.unlink()
            await ctx.success(f"Successfully unstocked `{type}`.")
        except Exception as e:
            await ctx.deny(f"Failed to unstock: {e}")

    @unstock.error
    async def unstock_error(self, ctx, error):
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.deny("Missing arguments. Usage: `.unstock {type}`")
        elif isinstance(error, commands.BadArgument):
            await ctx.deny("Invalid argument provided.")


    @commands.command(name="bulkrestock")
    async def bulkrestock(self, ctx):
        owner_id = getattr(self.bot, "config", {}).get("owner_id")
        if owner_id and ctx.author.id != int(owner_id):
            return await ctx.deny("You do not have permission to use this command.")

        attachments = ctx.message.attachments

        if not attachments:
            return await ctx.deny("Please provide at least one `.txt` file attachment.")

        non_txt = [a.filename for a in attachments if not a.filename.endswith(".txt")]
        if non_txt:
            return await ctx.deny(f"Only `.txt` files are supported. Got: {', '.join(non_txt)}")

        try:
            stocks_path = Path(__file__).resolve().parent.parent / "stocks"
            stocks_path.mkdir(exist_ok=True)

            restocks = []
            for attachment in attachments:
                data = await attachment.read()
                target = stocks_path / attachment.filename
                service_name = Path(attachment.filename).stem

                is_new = not target.exists()

                target.write_bytes(data)
                new_total = len(data.decode("utf-8").splitlines())
                restocks.append(
                    {
                        "name": service_name,
                        "count": new_total,
                        "total": new_total,
                        "is_new": is_new,
                    }
                )

            await ctx.success(f"Successfully bulk restocked `{len(restocks)}` file(s)!")
            try:
                await ctx.message.delete()
            except Exception:
                pass

            if restocks:
                await send_restock_notification(self.bot, restocks, title="MEGA STOCK")
        except Exception as e:
            await ctx.deny(f"Failed to bulk restock: {e}")

    @bulkrestock.error
    async def bulkrestock_error(self, ctx, error):
        if isinstance(error, commands.BadArgument):
            await ctx.deny("Invalid argument provided.")


async def setup(bot):
    await bot.add_cog(Restock(bot))
