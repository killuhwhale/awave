import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Dimensions,
  ScrollView,
  View,
  StyleSheet,
  Text,
  TouchableHighlight,
  Platform,
} from "react-native";

import { User, signInAnonymously } from "firebase/auth";

import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  requestPermissions,
  rtcMsg,
} from "@root/utils/utils";

import ControlPage from "@root/pages/controlpage";
import config from "@root/utils/config";
import { CMD, debounce } from "@root/utils/helpers";
import MusicPage from "@root/pages/musicpage";
import { auth, db } from "@root/firebase/firebaseApp";

const WSURL = config["wss_url"];
const { width, height } = Dimensions.get("window");

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

function Main() {
  const [partyName, setPartyName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const updatePartyName = useCallback(debounce(storeData, 3000), []);
  const updateSecretCode = useCallback(debounce(storeData, 3000), []);
  const wsRef = useRef<WebSocket | null>(null);
  const [isOnCall, setIsOnCall] = useState(false);

  const streamRef = useRef<any | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const signIn = () => {
    signInAnonymously(auth)
      .then((creds) => {
        console.log("Signing in res: ", creds);
        setUser(creds.user);
      })
      .catch((err) => {
        console.log("Error signing in!");
      });
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((fbUser) => {
      if (fbUser) {
        setUser(fbUser);
      } else {
        signIn();
      }
    });

    if (!user) {
      signIn();
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

  const sendLoadSetlist = (currentSetlist) => {
    console.log(
      "Sending LoadSetlist",
      partyName,
      secretCode,
      typeof currentSetlist?.order
    );
    if (currentSetlist) {
      sendCommand(CMD.LOADSETLIST, currentSetlist?.title, 0);
    }
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

  const scrollViewRef = useRef(null);

  const scrollToPage = (pageIndex) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: width * pageIndex, animated: true });
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        marginTop: Platform.OS === "ios" ? 20 : 0,
      }}
    >
      <View style={{ height: "90%" }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          ref={scrollViewRef}
          contentContainerStyle={{
            flexGrow: 1,
            height: "100%",
          }}
        >
          <View style={[styles.page, { backgroundColor: "#1e293b" }]}>
            <ControlPage
              partyName={partyName}
              setPartyName={setPartyName}
              updatePartyName={updatePartyName}
              secretCode={secretCode}
              setSecretCode={setSecretCode}
              updateSecretCode={updateSecretCode}
              isOnCall={isOnCall}
              hangUp={hangUp}
              callMusicPlayer={callMusicPlayer}
              sendPlay={sendPlay}
              sendPause={sendPause}
              sendNext={sendNext}
              sendVolDown={sendVolDown}
              sendVolUp={sendVolUp}
              adminCode={adminCode}
              setAdminCode={setAdminCode}
              resetPlayer={resetPlayer}
            />
          </View>
          <View style={[styles.page, { backgroundColor: "#1e293b" }]}>
            {user ? (
              <MusicPage
                db={db}
                sendSongToPlayer={sendSongToPlayer}
                sendLoadSetlist={sendLoadSetlist}
                partyName={partyName}
                secretCode={secretCode}
              />
            ) : (
              <View></View>
            )}
          </View>
        </ScrollView>
      </View>
      <View
        style={{
          height: "10%",
          // flex: 1,
          flexDirection: "row",
          borderTopColor: "white",
          borderWidth: 2,
        }}
      >
        <View
          style={{
            flex: 1,
            padding: 8,
            backgroundColor: "#020617",
            marginBottom: Platform.OS === "ios" ? 7 : 0,
          }}
        >
          <TouchableHighlight
            style={{
              height: "100%",
              justifyContent: "center",
              backgroundColor: "#0284c7",
              borderRadius: 8,
            }}
            onPress={() => {
              scrollToPage(0);
            }}
          >
            <Text style={{ color: "#FFF", textAlign: "center" }}>Controls</Text>
          </TouchableHighlight>
        </View>

        <View style={{ flex: 1, padding: 8, backgroundColor: "#020617" }}>
          <TouchableHighlight
            style={{
              height: "100%",
              justifyContent: "center",
              backgroundColor: "#0284c7",
              borderRadius: 8,
            }}
            onPress={() => {
              scrollToPage(1);
            }}
          >
            <Text style={{ color: "#FFF", textAlign: "center" }}>Music</Text>
          </TouchableHighlight>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  scrollContainer: {
    flexGrow: 1,
    height: "100%",
  },
  page: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    color: "#fff",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
  },
});

export default Main;
