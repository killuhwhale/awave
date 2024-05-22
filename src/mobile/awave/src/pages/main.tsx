import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Button,
  ScrollView,
  Text,
  TextInput,
  TouchableHighlight,
  View,
} from "react-native";
import fbApp from "../firebase/firebaseApp";

import { collection, getDocs, getFirestore } from "firebase/firestore/lite";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  requestPermissions,
  rtcMsg,
} from "../utils/utils";

import config from "../utils/config";

const db = getFirestore(fbApp);
const WSURL = config["wss_url"];

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

const storeData = async (partyName: string, secret: string) => {
  try {
    const data = { partyName, secret };
    await AsyncStorage.setItem("@party_info", JSON.stringify(data));
    console.log("Data saved");
  } catch (e) {
    console.error("Failed to save the data to the storage", e);
  }
};

const getData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem("@party_info");
    if (jsonValue != null) {
      return JSON.parse(jsonValue);
    }
  } catch (e) {
    console.error("Failed to fetch the data from storage", e);
  }
  return { partyName: "", secret: "" };
};

type Setlist = {
  order: number;
  title: string;
};

const debounce = (fn, timeout = 500) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, timeout);
  };
};

const CTLBTN: React.FC<{ fn: any; text: string }> = ({ fn, text }) => {
  return (
    <TouchableHighlight
      style={{
        width: "45%",
        marginRight: 5,
        marginTop: 4,
        marginBottom: 4,
        padding: 8,
        borderRadius: 12,
        backgroundColor: "#2196f3",
        justifyContent: "center",
        alignItems: "center",
      }}
      onPress={fn}
    >
      <Text style={{ color: "white" }}> {text} </Text>
    </TouchableHighlight>
  );
};

function Main() {
  const [partyName, setPartyName] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const updatePartyName = useCallback(debounce(storeData, 3000), []);
  const updateSecretCode = useCallback(debounce(storeData, 3000), []);
  const wsRef = useRef<WebSocket | null>(null);
  const [isOnCall, setIsOnCall] = useState(false);

  const [setlists, setSetlists] = useState<Setlist[]>([] as Setlist[]);
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);
  const streamRef = useRef<any | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    console.log("On Call effect: ", peerConnectionRef.current, isOnCall);
    if (peerConnectionRef.current && !isOnCall) {
      setIsOnCall(true);
    } else if (!peerConnectionRef.current && isOnCall) {
      setIsOnCall(false);
    }
  }, [isOnCall]);

  const newPeer = async () => {
    const turnConfig = {
      urls: config["urls"],
      username: "a",
      credential: "a",
      // username: config["username"],
      // credential: config["credential"],
    };

    console.log("peerConstraint TURN: ", turnConfig);

    let peerConstraints = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
        turnConfig,
      ],
    };

    const peer = new RTCPeerConnection(peerConstraints);

    let mediaConstraints = {
      audio: true,
      video: false,
    };

    try {
      let stream;
      try {
        stream = await mediaDevices.getUserMedia(mediaConstraints);
        streamRef.current = stream;
      } catch (err) {
        console.log("Err getting media: ", err);
      }

      console.log("Adding stream tracks to peerCon: ", stream);
      streamRef.current.getTracks().forEach((track) => {
        console.log("Adding track to stream: ", track);
        peer.addTrack(track, streamRef.current);
      });

      peer.addEventListener("icecandidate", (event) => {
        console.log("onCandidate:", event, event.candidate);
        if (event.candidate && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current?.send(
            JSON.stringify(
              rtcMsg(partyName, "s3cr3t", {
                rtcType: "candidate",
                candidate: event.candidate,
                clientName: "controller",
                secretCode: secretCode,
              })
            )
          );
        }
      });
      peer.addEventListener("icecandidateerror", (event) => {
        console.log("icecandidateerror:", event);
      });

      peer.addEventListener("iceconnectionstatechange", (event) => {
        console.log("iceconnectionstatechange:", event);
      });
      peer.addEventListener("icegatheringstatechange", (event) => {
        console.log("icegatheringstatechange:", event);
      });
      peer.addEventListener("negotiationneeded", async (event) => {
        console.log("negotiationneeded:", event);
        const sessionConstraints = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        } as RTCOfferOptions;

        try {
          const offer = await peer.createOffer(sessionConstraints);
          await peer.setLocalDescription(new RTCSessionDescription(offer));
          console.log("Sending offer: ", offer, wsRef.current.readyState);
          wsRef.current?.send(
            JSON.stringify({
              ...rtcMsg(partyName, "s3cr3t", {
                rtcType: "offer",
                offer: peer.localDescription,
              }),
              secretCode: secretCode,
            })
          );
        } catch (err) {
          console.log("Error creating offer:", err);
        }
      });
      peer.addEventListener("signalingstatechange", (event) => {
        console.log("signalingstatechange:", event);
      });
      peer.addEventListener("track", (event) => {
        console.log("addEventListener track:", event);
      });

      peer.addEventListener("connectionstatechange", function (event) {
        switch (peer.connectionState) {
          case "connected":
            console.log(
              "The peer connection is directly connected with the other peer."
            );
            setIsOnCall(true);

            break;
          case "disconnected":
            setIsOnCall(false);
          case "failed":
            setIsOnCall(false);
            console.error("Connection state is failed/disconnected.");
            break;
        }
      });
    } catch (err) {
      // Handle Error
      console.log("Err: ", err);
    }

    return peer;
  };

  const callMusicPlayer = async () => {
    connectToWebSocket();
    peerConnectionRef.current = await newPeer();
  };

  const hangUp = async () => {
    if (streamRef && streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      setIsOnCall(false);
    }
  };

  const connectToWebSocket = () => {
    console.log("Attempting to connec to wss...");
    if (wsRef.current || !partyName || !secretCode) return;

    console.log("Connecting to wss...");

    try {
      const wss = new WebSocket(WSURL);
      wsRef.current = wss;
      console.log("Setting wss listeners....");
      wss.onopen = () => {
        console.log("Connected!");
        console.log("WSS Connected! Sending register command 0");
        wss.send(
          JSON.stringify({
            cmd: 0,
            cmdType: 0,
            partyName: partyName,
            secretCode: secretCode,
            clientName: "controller",
          })
        );
      };

      wss.onmessage = async (ev) => {
        if (!peerConnectionRef.current) return;

        // Not expecting messages from controller
        const data = JSON.parse(ev.data);
        console.log("Recv'd msg:", data);
        switch (data.rtcType) {
          case "offer":
            // console.log("received offer");
            // await peerConnectionRef.current.setLocalDescription(
            //   new RTCSessionDescription(data.offer)
            // );

            // peerConnectionRef.current
            //   .createAnswer()
            //   .then((answer) => {
            //     // peerConnectionRef.current.setLocalDescription(answer);
            //     console.log("Sending answer: ", answer);
            //     wsRef.current?.send(
            //       JSON.stringify(
            //         rtcMsg(partyName, "s3cr3t", {
            //           rtcType: "answer",
            //           answer: answer,
            //           clientName: "controller",
            //         })
            //       )
            //     );
            //   })
            //   .catch((error) => console.error("Answer error: ", error));
            break;
          case "answer":
            try {
              console.log(
                "Recv'd answer! Setting Remote Description: ",
                data.clientName
              );
              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(data.answer)
              );
            } catch (err) {
              console.log(
                "error setting remote: ",
                peerConnectionRef.current,
                err
              );
            }
            break;
          case "candidate":
            console.log("Adding ice candidate from: ", data.clientName);
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
            break;
        }
      };

      wss.onerror = (error) => {
        console.log("WebSocket Error ", error);
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          wsRef.current = null;
        }
      };

      wss.onclose = (ev) => {
        console.log("on wss close");
        if (!ev.wasClean) {
          wsRef.current = null;
          connectToWebSocket();
        }
      };
    } catch (err) {
      console.log("Err connecting to wss: ", err);
    }
  };

  useEffect(() => {
    console.log("partyName/ secretCode: ", partyName, secretCode);
    if (!partyName || !secretCode) {
      console.log("Getting stored gata...");
      getData().then((data) => {
        console.log("Stored data: ", data);
        const { partyName, secret } = data;
        console.log("Stored data: ", partyName, secret);
        setPartyName(partyName);
        setSecretCode(secret);
      });
    }
  }, []);

  useEffect(() => {
    let cleanupWss;
    if (wsRef.current === null) {
      if (requestPermissions()) {
        cleanupWss = connectToWebSocket();
      }
    }

    // return () => {
    //   console.log("Cleaning websocket");
    //   if ((wsRef.current as WebSocket)?.readyState !== WebSocket.CLOSED) {
    //     (wsRef.current as WebSocket).close();
    //   }
    //   if (cleanupWss) {
    //     console.log("Called cleanupwebRTC");
    //     cleanupWss();
    //   }
    // };
  }, [wsRef.current, partyName, secretCode]);

  const sendCommand = (cmdKey, setlist: number = 0, volAmount: number = 12) => {
    if (wsRef.current) {
      const cmd = {
        cmdType: 1,
        cmd: CMD.cmds[cmdKey],
        partyName,
        secretCode,
        setlist,
        volAmount,
      };
      console.log("Command: ", cmd);
      wsRef.current.send(JSON.stringify(cmd));
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
      typeof currentSetlist?.order
    );
    sendCommand(CMD.LOADSETLIST, currentSetlist?.order, 0);
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
    _()
      .then(() => {})
      .catch((err) => console.error(err));
  }, [partyName]);

  const onCallColor = isOnCall ? "red" : "green";
  const onCallText = isOnCall ? "Connected" : "Not Connected";
  return (
    <ScrollView
      id="mainscroll"
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View id="row1" style={{ flex: 2, flexDirection: "column" }}>
        <Text style={{ fontSize: 24 }}>Connection</Text>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ flex: 1, flexDirection: "column" }}>
            <Text style={{ textAlign: "center" }}>Party Name</Text>
            <TextInput
              style={{
                width: "100%",
                backgroundColor: "black",
                color: "white",
                padding: 4,
              }}
              placeholder="Party Name"
              value={partyName}
              onChange={(ev) => {
                setPartyName(ev.nativeEvent.text);
                updatePartyName(ev.nativeEvent.text, secretCode);
              }}
            />
          </View>

          <View style={{ flex: 1, flexDirection: "column" }}>
            <Text style={{ textAlign: "center" }}>Secret</Text>
            <TextInput
              style={{
                width: "100%",
                backgroundColor: "black",
                color: "white",
                padding: 4,
              }}
              placeholder="Secret Code"
              value={secretCode}
              onChange={(ev) => {
                setSecretCode(ev.nativeEvent.text);
                updateSecretCode(partyName, ev.nativeEvent.text);
              }}
            />
          </View>
        </View>
      </View>

      <View id="row2" style={{ flex: 3 }}>
        <Text style={{ fontSize: 24 }}>Microphone</Text>
        <View
          style={{
            backgroundColor: onCallColor,
            borderRadius: 12,
            justifyContent: "center",
            alignContent: "center",
            alignItems: "center",
            padding: 12,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {onCallText}
          </Text>
        </View>
        <View style={{ margin: 4 }}>
          <Button title="Call" onPress={callMusicPlayer} />
        </View>
        <View style={{ margin: 4 }}>
          <Button title="Hang Up" onPress={hangUp} color="#dc2626" />
        </View>
      </View>

      <View id="row3" style={{ flex: 3 }}>
        <Text style={{ fontSize: 24 }}>Controls</Text>
        <View style={{ flexDirection: "row" }}>
          <CTLBTN fn={sendPlay} text="Play" />
          <CTLBTN fn={sendPause} text="Pause" />
        </View>
        <View style={{ flexDirection: "row" }}>
          <CTLBTN fn={sendPause} text="Pause" />
          <CTLBTN fn={sendNext} text="Next" />
        </View>
        <View style={{ flexDirection: "row" }}>
          <CTLBTN fn={sendVolDown} text="Vol Down" />
          <CTLBTN fn={sendVolUp} text="Vol UP" />
        </View>
      </View>

      <View style={{ flex: 3 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontSize: 24 }}>Setlist</Text>
            <Text style={{ fontSize: 16 }}>
              Current Setlist: {currentSetlist?.title}
            </Text>
          </View>
          <View style={{ flex: 3 }}>
            {setlists.map((sl, idx) => {
              console.log("Setlist: ", sl);
              return (
                <View
                  key={`sl_${idx}`}
                  style={{ backgroundColor: "black", padding: 8 }}
                >
                  <TouchableHighlight onPress={() => setCurrentSetlist(sl)}>
                    <Text
                      style={{
                        color:
                          sl.order == currentSetlist?.order ? "white" : "grey",
                      }}
                    >
                      {sl.title} - {sl.order}
                    </Text>
                  </TouchableHighlight>
                </View>
              );
            })}
            <Button title="Load Current Setlist" onPress={sendLoadSetlist} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export default Main;
