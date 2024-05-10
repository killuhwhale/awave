import asyncio
import json
import ssl
import sys
import time
import websockets



'''
cmdType:
    0: register name
    1: send command
cmd:
    0: register name
    1: play
    2: pause
    ....
'''

async def run():
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    async with websockets.connect("wss://localhost:4000", ssl=ssl_context) as ws:
    # async with websockets.connect("wss://heyjamieai.com/webrtcwss/", ssl=ssl_context) as ws:
        while True:
            await ws.send(json.dumps({
                "partyName": sys.argv[1],
                "cmd": 0,
                "cmdType": 0
            }))


            # Optionally receive and print a response
            response = await ws.recv()
            print(f"Received response: {response}")




asyncio.run(run())