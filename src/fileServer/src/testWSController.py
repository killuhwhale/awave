import asyncio
import json
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
    async with websockets.connect("ws://127.0.0.1:4000") as ws:
        while True:
            await ws.send(json.dumps({
                "partyName": sys.argv[1],
                "cmd": 0,
                "cmdType": 1
            }))


            # Optionally receive and print a response
            response = await ws.recv()
            print(f"Received response: {response}")
            time.sleep(20)
            break



asyncio.run(run())