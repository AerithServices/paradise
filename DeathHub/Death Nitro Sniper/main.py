import requests
import json
import time
import websocket
import threading
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from websocket import WebSocketConnectionClosedException

try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    HAS_COLOR = True
except ImportError:
    HAS_COLOR = False
    Fore = type('Fore', (), {'GREEN': '', 'RED': '', 'LIGHTBLACK_EX': '', 'LIGHTYELLOW_EX': '', 'RESET': ''})()

def log(level, msg):
    ts = datetime.now().strftime("%H:%M:%S")
    if HAS_COLOR:
        colors = {'info': Fore.LIGHTBLACK_EX, 'success': Fore.GREEN, 'error': Fore.RED, 'warn': Fore.LIGHTYELLOW_EX}
        col = colors.get(level, '')
        print(f"{Fore.LIGHTBLACK_EX}[{ts}]{Style.RESET_ALL} {col}{msg}{Style.RESET_ALL}")
    else:
        print(f"[{ts}] {msg}")

def banner():
    if HAS_COLOR:
        print(f"\n{Fore.LIGHTBLACK_EX}death hub{Style.RESET_ALL} / nitro sniper\n")
    else:
        print("\ndeath hub / nitro sniper\n")

def load_token():
    with open('token.txt', 'r') as f:
        line = f.read().strip()
    if '=' in line:
        return line.split('=', 1)[1].strip()
    return line

TOKEN = load_token()
GATEWAY_URL = 'wss://gateway.discord.gg/?v=9&encoding=json'
GIFT_PATTERN = re.compile(r'(discord.gift/|discordapp.com/gifts/)([a-zA-Z0-9]+)')

session = requests.Session()
session.headers.update({'Authorization': TOKEN, 'Content-Type': 'application/json'})
claim_executor = ThreadPoolExecutor(max_workers=4)

def send_json_request(ws, request):
    ws.send(json.dumps(request))

def receive_json_response(ws):
    response = ws.recv()
    if response:
        return json.loads(response)

def heartbeat(interval, ws):
    while True:
        time.sleep(interval)
        hb = {"op": 1, "d": None}
        send_json_request(ws, hb)

def claim_nitro(code, detect_time=None):
    start = time.perf_counter()
    r = session.post(
        f'https://discord.com/api/v9/entitlements/gift-codes/{code}/redeem',
        json={},
        timeout=10
    )
    ms = int((time.perf_counter() - start) * 1000)
    total_ms = int((time.perf_counter() - detect_time) * 1000) if detect_time else None
    time_str = f"{ms}ms" + (f" | {total_ms}ms total" if total_ms else "")
    if r.status_code == 200:
        log('success', f"claimed discord.gift/{code} ({time_str})")
    else:
        err = r.json().get("message", "unknown")
        log('error', f"failed {code}: {err} ({time_str})")

def run_sniper():
    ws = websocket.WebSocket()
    ws.connect(GATEWAY_URL)
    event = receive_json_response(ws)

    hb_interval = event['d']['heartbeat_interval'] / 1000
    threading.Thread(target=heartbeat, args=(hb_interval, ws), daemon=True).start()

    payload = {
        "op": 2,
        "d": {
            "token": TOKEN,
            "properties": {"$os": "windows", "$browser": "chrome", "$device": "desktop"}
        }
    }
    send_json_request(ws, payload)

    try:
        session.get('https://discord.com/api/v9/users/@me', timeout=5)
    except Exception:
        pass

    log('success', "ready, listening for codes")

    while True:
        event = receive_json_response(ws)
        if event and event.get('t') == 'MESSAGE_CREATE':
            content = event.get('d', {}).get('content', '')
            matches = GIFT_PATTERN.findall(content)
            codes = list({c for _, c in matches})

            if codes:
                detect_time = time.perf_counter()
                for code in codes:
                    claim_executor.submit(claim_nitro, code, detect_time)
                    log('warn', f"found discord.gift/{code}")

def main():
    banner()
    while True:
        try:
            run_sniper()
        except WebSocketConnectionClosedException:
            log('warn', "disconnected, reconnecting in 5s...")
            time.sleep(5)
        except Exception as e:
            log('error', f"{e} - reconnecting in 5s...")
            time.sleep(5)

if __name__ == '__main__':
    main()
