import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Button,
  ScrollView,
  Text,
  TextInput,
  TouchableHighlight,
  View,
} from "react-native";

import { collection, getDocs, getFirestore } from "firebase/firestore/lite";
import fbApp from "@root/firebase/firebaseApp";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  requestPermissions,
  rtcMsg,
} from "@root/utils/utils";

import config from "@root/utils/config";
import { CMD, debounce } from "@root/utils/helpers";
import { User, getAuth, signInAnonymously } from "firebase/auth";
import SongList from "@root/comps/SongList";

const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const WSURL = config["wss_url"];

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

// type Setlist = {
//   order: number;
//   title: string;
// };

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
  const [adminCode, setAdminCode] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const updatePartyName = useCallback(debounce(storeData, 3000), []);
  const updateSecretCode = useCallback(debounce(storeData, 3000), []);
  const wsRef = useRef<WebSocket | null>(null);
  const [isOnCall, setIsOnCall] = useState(false);

  const [setlists, setSetlists] = useState<Setlist[]>([] as Setlist[]);
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);
  const streamRef = useRef<any | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((fbUser) => {
      if (fbUser) {
        setUser(fbUser);
      } else {
        setUser(null);
      }
    });

    if (!user) {
      signInAnonymously(auth)
        .then((creds) => {
          console.log("Signing in res: ", creds);
          setUser(creds.user);
        })
        .catch((err) => {
          console.log("Error signing in!");
        });
    }
    return () => unsub();
  }, [user]);

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
      username: config["turn_username"],
      credential: config["credential"],
    };

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
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current?.send(
            JSON.stringify(
              rtcMsg(partyName, "s3cr3t", {
                rtcType: "candidate",
                candidate: event.candidate,
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
          console.log("Sending offer: ", offer, wsRef.current?.readyState);
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

      peer.addEventListener("connectionstatechange", async function (event) {
        switch (peer.connectionState) {
          case "connected":
            console.log(
              "The peer connection is directly connected with the other peer."
            );
            setIsOnCall(true);

            break;
          case "disconnected":
            setIsOnCall(false);
            await hangUp();
          case "failed":
            setIsOnCall(false);
            await hangUp();
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
      console.log("Stopping tracks!");
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
            clientType: "controller",
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
            break;
          case "answer":
            try {
              console.log("Recv'd answer! Setting Remote Description: ", data);
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
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
            break;
        }
      };

      wss.onerror = (error) => {
        console.log("WebSocket Error ", error);
        if (wsRef.current && wsRef.current?.readyState !== WebSocket.OPEN) {
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

  const sendCommand = (
    cmdKey,
    setlist: string = "All Songs",
    volAmount: number = 12,
    cmdType: number = 1
  ) => {
    if (wsRef.current) {
      const cmd = {
        cmdType: cmdType,
        cmd: CMD.cmds[cmdKey],
        partyName,
        secretCode,
        setlist,
        volAmount,
      };
      console.log("Command: ", cmd);
      wsRef.current?.send(JSON.stringify(cmd));
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

  const resetPlayer = () => {
    console.log("Sending pause", partyName, secretCode);
    try {
      sendCommand(CMD.RESET, null, null, parseInt(adminCode));
    } catch (err) {
      console.log("Error sending reset command", err);
    }
  };

  const sendLoadSetlist = () => {
    console.log(
      "Sending LoadSetlist",
      partyName,
      secretCode,
      typeof currentSetlist?.order
    );
    sendCommand(CMD.LOADSETLIST, currentSetlist?.title, 0);
  };

  const sendSongToPlayer = (song: SongProps) => {
    if (wsRef.current) {
      const cmd = {
        cmdType: 1,
        cmd: CMD.cmds[CMD.SENDSONG],
        partyName,
        secretCode,
        setlist: "",
        volAmount: 0,
        song,
      };

      wsRef.current?.send(JSON.stringify(cmd));
    }
  };

  useEffect(() => {
    if (!partyName) return;
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

  const onCallColor = isOnCall ? "#9f1239" : "#166534";
  const onCallText = isOnCall ? "Connected" : "Not Connected";
  return (
    <View
      style={{
        height: "100%",
        width: "100%",
        paddingTop: 42,
        marginBottom: 20,
      }}
    >
      <ScrollView
        id="mainscroll"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          id="row1"
          style={{
            flex: 2,
            flexDirection: "column",
            padding: 8,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 24, color: "white", marginBottom: 12 }}>
            Connection Details
          </Text>

          <View style={{ flex: 1, flexDirection: "row", padding: 8 }}>
            <View style={{ flex: 1, flexDirection: "column" }}>
              <Text style={{ textAlign: "center", color: "white" }}>
                Party Name
              </Text>
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
              <Text style={{ textAlign: "center", color: "white" }}>
                Secret
              </Text>
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

        <View
          id="row2"
          style={{ flex: 3, padding: 8, marginTop: 8, marginBottom: 8 }}
        >
          <Text style={{ fontSize: 24, color: "white" }}>Microphone</Text>
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

          {isOnCall ? (
            <View style={{ margin: 4, backgroundColor: "#be123c" }}>
              <Button title="Hang Up" onPress={hangUp} />
            </View>
          ) : (
            <View style={{ margin: 4, backgroundColor: "#0e7490" }}>
              <Button title="Call" onPress={callMusicPlayer} />
            </View>
          )}
        </View>

        <View
          id="row3"
          style={{
            flex: 4,
            width: "100%",
            padding: 8,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 24, color: "white" }}>Controls</Text>
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <CTLBTN fn={sendPlay} text="Play" />
            <CTLBTN fn={sendPause} text="Pause" />
          </View>
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <CTLBTN fn={sendPause} text="Pause" />
            <CTLBTN fn={sendNext} text="Next" />
          </View>
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <CTLBTN fn={sendVolDown} text="Vol Down" />
            <CTLBTN fn={sendVolUp} text="Vol Up" />
          </View>
        </View>

        <View style={{ flex: 10, padding: 8, marginTop: 8, marginBottom: 8 }}>
          <View style={{ maxHeight: 350 }}>
            <SongList sendSongToPlayer={sendSongToPlayer} />
          </View>
        </View>
        <View style={{ flex: 4, padding: 8, marginTop: 8, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={{ fontSize: 24, color: "white" }}>Setlist</Text>
              <Text style={{ fontSize: 16, color: "white" }}>
                Current Setlist: {currentSetlist?.title}
              </Text>
            </View>

            <View style={{ flex: 3, gap: 10 }}>
              <ScrollView horizontal={true} style={{ flex: 1 }}>
                <View style={{ flex: 1, flexDirection: "row" }}>
                  {setlists.map((sl, idx) => {
                    return (
                      <View
                        key={`sl_${idx}`}
                        style={{
                          flex: 1,
                          width: 150,
                          borderRadius: 8,
                          backgroundColor:
                            currentSetlist?.title === sl.title
                              ? "#166534"
                              : "black",
                          padding: 8,
                        }}
                      >
                        <TouchableHighlight
                          onPress={() => setCurrentSetlist(sl)}
                          style={{
                            height: "100%",
                            width: "100%",
                            justifyContent: "center",
                            alignContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color:
                                sl.order == currentSetlist?.order
                                  ? "white"
                                  : "grey",
                              textAlign: "center",
                            }}
                          >
                            {sl.title}
                          </Text>
                        </TouchableHighlight>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
              <Button title="Load Current Setlist" onPress={sendLoadSetlist} />
            </View>
          </View>
        </View>

        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ flex: 1, flexDirection: "column" }}>
            <Text style={{ textAlign: "center", color: "white" }}>Admin</Text>
            <TextInput
              style={{
                width: "100%",
                backgroundColor: "black",
                color: "white",
                padding: 4,
              }}
              placeholder="Admin Code"
              value={adminCode}
              onChange={(ev) => {
                setAdminCode(ev.nativeEvent.text);
              }}
            />
            <Button title="Reset Player" onPress={resetPlayer} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default Main;
