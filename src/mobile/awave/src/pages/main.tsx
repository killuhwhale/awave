import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  TouchableHighlight,
} from "react-native";
import fbApp from "../firebase/firebaseApp";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
} from "firebase/firestore/lite";
const db = getFirestore(fbApp);
const WSURL = "ws://localhost:4000";

class Commands {
  cmds = {
    play: 1,
    pause: 2,
    next: 3,
    volup: 4,
    voldown: 5,
    loadSetlist: 6,
  };

  PLAY = "play";
  PAUSE = "pause";
  NEXT = "next";
  VOLUP = "volup";
  VOLDOWN = "voldown";
  LOADSETLIST = "loadSetlist";
}

const CMD = new Commands();

type Setlist = {
  order: number;
  title: string;
};

function Main() {
  const partyName = "tp"; // Get from a config file
  const [secretCode, setSecretCode] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [setlists, setSetlists] = useState<Setlist[]>([] as Setlist[]);
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);

  const connectToWebSocket = () => {
    if (ws) return;
    const wss = new WebSocket(WSURL);
    setWs(wss);
  };

  useEffect(() => {
    if (ws === null) {
      return connectToWebSocket();
    }

    ws.onopen = () => {
      console.log("Connected!");
    };

    ws.onmessage = (ev) => {
      // Not expecting messages from controller
    };

    ws.onerror = (error) => {
      console.log("WebSocket Error ", error);
      if (ws && ws.readyState !== WebSocket.OPEN) {
        setWs(null);
      }
    };

    ws.onclose = (ev) => {
      if (!ev.wasClean) {
        setWs(null);
      }
    };

    return () => {
      if ((ws as WebSocket)?.readyState !== WebSocket.CLOSED) {
        (ws as WebSocket).close();
      }
    };
  }, [ws]);

  const sendCommand = (cmdKey, setlist: number = 0, volAmount: number = 12) => {
    if (ws) {
      const cmd = {
        cmdType: 1,
        cmd: CMD.cmds[cmdKey],
        partyName,
        secretCode,
        setlist,
        volAmount,
      };
      console.log("Command: ", cmd);
      ws.send(JSON.stringify(cmd));
    }
  };

  const sendPlay = () => {
    console.log("Sending play", partyName, secretCode);
    sendCommand(CMD.PLAY);
  };

  const sendPause = () => {
    console.log("Sending pause", partyName, secretCode);
    sendCommand(CMD.PAUSE);
  };

  const sendNext = () => {
    console.log("Sending pause", partyName, secretCode);
    sendCommand(CMD.NEXT);
  };

  const sendVolUp = () => {
    console.log("Sending pause", partyName, secretCode);
    sendCommand(CMD.VOLUP);
  };

  const sendVolDown = () => {
    console.log("Sending pause", partyName, secretCode);
    sendCommand(CMD.VOLDOWN);
  };

  const sendLoadSetlist = () => {
    console.log(
      "Sending LoadSetlist",
      partyName,
      secretCode,
      typeof currentSetlist.order
    );
    sendCommand(CMD.LOADSETLIST, currentSetlist.order, 0);
  };

  useEffect(() => {
    const setListPath = `setlists/${partyName}/setlists`;
    console.log("loading setlists: ", setListPath);
    const _ = async () => {
      console.log("Getting doc...");
      const setlistDocs = await getDocs(collection(db, setListPath));
      console.log("Got doc:", setlistDocs);
      const allSetlists = [] as Setlist[];
      setlistDocs.docs.forEach((doc) => {
        // console.log("Setlist: ", doc.data());
        allSetlists.push(doc.data() as Setlist);
      });

      setSetlists(allSetlists.sort((a, b) => (a.order > b.order ? 1 : -1)));
      setCurrentSetlist(
        allSetlists.sort((a, b) => (a.order > b.order ? 1 : -1))[0]
      );
    };
    _().then(() => {});
  }, []);

  return (
    <View>
      <Text>Main page</Text>
      <TextInput
        style={{
          width: "100%",
          backgroundColor: "black",
          color: "white",
          padding: 4,
        }}
        placeholder="Secret Code"
        value={secretCode}
        onChange={(ev) => setSecretCode(ev.nativeEvent.text)}
      />
      <Button title="Play" onPress={sendPlay} />
      <Button title="Pause" onPress={sendPause} />
      <Button title="Next" onPress={sendNext} />
      <Button title="Vol UP" onPress={sendVolUp} />
      <Button title="Vol DOWN" onPress={sendVolDown} />
      <View>
        <View>
          <Text>Current Setlist: {currentSetlist?.title}</Text>
        </View>
        {setlists.map((sl) => {
          return (
            <View style={{ backgroundColor: "black", padding: 8 }}>
              <TouchableHighlight onPress={() => setCurrentSetlist(sl)}>
                <Text
                  style={{
                    color: sl.order == currentSetlist.order ? "white" : "grey",
                  }}
                >
                  {sl.title} - {sl.order}
                </Text>
              </TouchableHighlight>
            </View>
          );
        })}
      </View>

      <Button title="Load Current Setlist" onPress={sendLoadSetlist} />
    </View>
  );
}

export default Main;
