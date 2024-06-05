"""
Executed via systemd service.

Location:
    f"/home/{USER}/chromiumos/src/scripts/wssTriggerEnv/wssTrigger"

Useage:
   python3 wssClient.py
"""

import asyncio
import logging
import os
import signal
import subprocess
import threading
import time
import websockets
import json


current_websocket = None  # Global variable to hold the current WebSocket
process_event = threading.Event() # Track if the process is already running
process_monitor_event = threading.Event()
process = None
process_pid = None
initStarted=False

config_path = "../../config.json"
CONFIG = None
with open(config_path, "r", encoding="utf-8") as f:
    CONFIG = json.load(f)
logging.basicConfig(level=logging.INFO, format='%(asctime)s:%(levelname)s:%(message)s')

def cmd():
    return [
        f"/home/{CONFIG['username']}/ws_node/awave/src/appControlCenter/bin/python3", f"/home/{CONFIG['username']}/ws_node/awave/src/appControlCenter/main.py"
    ]

def run_process(cmd, env):
    global current_websocket, process_event, process, process_pid

    process_event.set()
    process = None

    logging.info(f"run_process: {env=}")
    logging.info(f"run_process: {cmd=}")
    if env is None:
        env = {"1337": "0"}


    try:
        # Use Popen to start the process without blocking
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env={**env, **os.environ})
        process_pid = process.pid
    except Exception as err:
        logging.info(f"Error starting process! {err}")
        process_event.clear()
        process_pid = None
        return

    output = ""
    logging.info(f"Process started!, {process.poll()=}")
    while process.poll() is None:  # While the process is still running
        try:
            output = process.stdout.readline()
            logging.info(f"{output=}")
            if "Traceback (most recent call last):" in output:
                output = process.stdout.readlines()
                logging.info(f"{output=}")
        except Exception as err:
            print("Error decoding message and sending progress: ", err)
            output = process.stdout.readlines() + process.stderr.readline()
            logging.info(f"Error: {output=}")


        time.sleep(.3)  # Sleep for a short duration before checking again

    logging.info("Process done!")
    process_event.clear()
    process_pid = None

    # Send a message over the websocket after the process completes
    print("Process completed!")


def is_alive(pid):
    try:
        logging.info("Checking pid...")
        os.kill(pid, 0)
        return True
    except OSError:
        logging.info("Process died, restarting...")
    except TypeError:
        logging.info("No pid on init start, starting...")
    return False


def start():
    try:
        logging.info("Starting...")
        start_cmd = cmd()
        env={"AUTOPLAY": 1}
        thread = threading.Thread(
            target=run_process,
            args=(start_cmd, env, )
        )
        thread.start()
        return True
    except OSError:
        logging.info("Process failed to start")
    except Exception as err:
        logging.info(f"Err starting: {err=}")
    return False

def stop(pid):
    try:
        logging.info(f"Stopping {pid=}...")
        os.kill(pid, signal.SIGTERM)
        return True
    except OSError:
        logging.info("Process stopped")
    except Exception as err:
        logging.info(f"Error stopping: {err=}")
    return False


def monitor_process():
    global process_event, process_monitor_event, process_pid, initStarted
    logging.info("monitor_process pid...")
    while not process_monitor_event.is_set():
        logging.info(f"Want to check pid... {(process_event.is_set())} - {process_pid} - {not initStarted}")
        # if (process_event.is_set() and process_pid) or not initStarted:
        try:
            logging.info("Checking pid...")
            os.kill(process_pid, 0)
        except OSError:
            logging.info("Process died, restarting...")
            env={"AUTOPLAY": "1"}
            thread = threading.Thread(target=run_process, args=(cmd(), env, ))
            thread.start()
        except TypeError:
            logging.info("No pid on init start, starting...")
            env=None
            if initStarted:
                env={"AUTOPLAY": "1"}
            thread = threading.Thread(target=run_process, args=(cmd(), env, ))
            thread.start()
            initStarted = True


        time.sleep(0.25)

async def listen_to_ws():
    global current_websocket, process_event, process, process_event, process_pid


    '''
        cmd: number;
        cmdType: number;
        partyName: string;
        secretCode: string;


    '''

    uri = CONFIG["wss_url"]
    print( f"Using URI: {uri}")
    sent_registration = False
    while True:
        try:
            async with websockets.connect(uri) as websocket:
                current_websocket = websocket
                if not sent_registration:
                    await websocket.send(json.dumps({
                        "cmd": 0,
                        "cmdType": 0,
                        "partyName": CONFIG["partyName"],
                        "secretCode": CONFIG["secret"],
                        "clientType": "admin"
                    }))
                    sent_registration = True

                while True:
                    mping = json.loads(await websocket.recv())
                    logging.info(f"Message: {mping=}", )
                    if mping["cmd"] == 420 and mping["cmdType"] == CONFIG["adminCode"]:
                        if not process_event.is_set() and not process_pid:
                            start()
                            print("runstarted")
                        # elif process_pid and is_alive(process_pid):
                        #     stop(process_pid)
                        #     start()
                        #     print(f"runstarted:runinprogress", process_pid)


        except websockets.ConnectionClosed:
            print("Connection with the server was closed. Retrying in 5 seconds...")
        except Exception as e:
            print(f"An error occurred: {e}. Retrying in 5 seconds...")

        # Wait for 5 seconds before trying to reconnect.
        await asyncio.sleep(5)

if __name__ == "__main__":
    # Run the program using an asyncio event loop

    process_monitor_event.clear()
    monitor_thread = threading.Thread(target=monitor_process)
    monitor_thread.start()


    logging.info("Starting wss Client!")
    loop = asyncio.get_event_loop()
    loop.run_until_complete(listen_to_ws())
    loop.run_forever()

    logging.info("Closing monitor process!")
    process_monitor_event.set()
    monitor_thread.join()