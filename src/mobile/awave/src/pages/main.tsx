import React, { useEffect, useRef, useState } from "react";
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

// import {
//   ScreenCapturePickerView,
//   RTCPeerConnection,
//   RTCIceCandidate,
//   RTCSessionDescription,
//   RTCView,
//   MediaStream,
//   MediaStreamTrack,
//   mediaDevices,
//   registerGlobals,
// } from "react-native-webrtc";

import {
  RTCPeerConnection as WebRTCPeerConnection,
  RTCIceCandidate as WebRTCIceCandidate,
  RTCSessionDescription as WebRTCSessionDescription,
  RTCRtpTransceiver as WebRTCRtpTransceiver,
  RTCRtpReceiver as WebRTCRtpReceiver,
  RTCRtpSender as WebRTCRtpSender,
  RTCErrorEvent as WebRTCErrorEvent,
  MediaStream as WebMediaStream,
  MediaStreamTrack as WebMediaStreamTrack,
  mediaDevices as WebmediaDevices,
  permissions as Webpermissions,
  registerGlobals as WebregisterGlobals,
  RTCView as WebRTCView,
} from "react-native-webrtc-web-shim";

import config from "../../config.json";
import { rtcMsg } from "../utils/utils";

// You'll only really need to use this function if you are mixing project development with libraries that use browser based WebRTC functions. Also applies if you are making your project compatible with react-native-web.
// registerGlobals();

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

type Setlist = {
  order: number;
  title: string;
};

function Main() {
  const partyName = "tp"; // Get from a config file
  const [secretCode, setSecretCode] = useState("");
  // const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [setlists, setSetlists] = useState<Setlist[]>([] as Setlist[]);
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);
  const streamRef = useRef<any | null>(null);
  const peerConnectionRef = useRef<WebRTCPeerConnection | null>(null);

  const connectToWebSocket = () => {
    console.log("Attempting to connec to wss...");
    if (wsRef.current) return;
    console.log("Connecting to wss...");
    let cleanupwebRTC;
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
            clientName: "controller",
          })
        );
        cleanupwebRTC = setupWebRTC();
      };

      wss.onmessage = async (ev) => {
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
            console.log(
              "Recv'd answer! Setting Remote Description: ",
              data.clientName
            );
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
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

    return () => {
      if (cleanupwebRTC) {
        console.log("Called cleanuowebRTC");
        cleanupwebRTC();
      }
    };
  };

  useEffect(() => {
    let cleanupWss;
    if (wsRef.current === null) {
      cleanupWss = connectToWebSocket();
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
  }, [wsRef.current]);

  const setupWebRTC = () => {
    let peerConnection: WebRTCPeerConnection;

    console.log("Is ws ready?...", wsRef.current, wsRef.current?.readyState);

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    console.log("Begin creating webrtc connect...", wsRef.current.readyState);

    const _ = async () => {
      let mediaConstraints = {
        audio: true,
        video: false,
      };

      try {
        const stream = await WebmediaDevices.getUserMedia(mediaConstraints);

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
            // turnConfig,
          ],
        };

        peerConnection = new WebRTCPeerConnection(peerConstraints);

        console.log("Adding stream tracks to peerCon: ", stream);
        stream.getTracks().forEach((track) => {
          console.log("Adding track to stream: ", track);
          peerConnection.addTrack(track, stream);
        });

        peerConnection.addEventListener("connectionstatechange", (event) => {
          console.log("connectionstatechange:", event);
        });

        peerConnection.addEventListener("icecandidate", (event) => {
          console.log("onCandidate:", event, event.candidate);
          if (event.candidate && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current?.send(
              JSON.stringify(
                rtcMsg(partyName, "s3cr3t", {
                  rtcType: "candidate",
                  candidate: event.candidate,
                  clientName: "controller",
                })
              )
            );
          }
        });
        peerConnection.addEventListener("icecandidateerror", (event) => {
          console.log("icecandidateerror:", event);
        });

        peerConnection.addEventListener("iceconnectionstatechange", (event) => {
          console.log("iceconnectionstatechange:", event);
        });
        peerConnection.addEventListener("icegatheringstatechange", (event) => {
          console.log("icegatheringstatechange:", event);
        });
        peerConnection.addEventListener("negotiationneeded", (event) => {
          console.log("negotiationneeded:", event);
        });
        peerConnection.addEventListener("signalingstatechange", (event) => {
          console.log("signalingstatechange:", event);
        });
        peerConnection.addEventListener("track", (event) => {
          console.log("addEventListener track:", event);
        });

        peerConnection.onconnectionstatechange = function (event) {
          switch (peerConnection.connectionState) {
            case "connected":
              console.log(
                "The peer connection is directly connected with the other peer."
              );

              break;
            case "disconnected":
            case "failed":
              console.error("Connection state is failed/disconnected.");
              break;
          }
        };
        // let sessionConstraints = {
        //   mandatory: {
        //     OfferToReceiveAudio: true,
        //     OfferToReceiveVideo: false,
        //     VoiceActivityDetection: true,
        //   },
        // };

        const sessionConstraints = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        } as RTCOfferOptions;

        let datachannel = peerConnection.createDataChannel("my_channel");

        datachannel.addEventListener("open", (event) => {
          console.log("Data channel open");
          datachannel.send("TEststststststtst");
        });
        datachannel.addEventListener("close", (event) => {
          console.log("Data channel");
        });
        datachannel.addEventListener("message", (message) => {});

        try {
          const offer = await peerConnection.createOffer(sessionConstraints);
          await peerConnection.setLocalDescription(offer);
          console.log("Sending offer: ", offer, wsRef.current.readyState);
          wsRef.current?.send(
            JSON.stringify(
              rtcMsg(partyName, "s3cr3t", { rtcType: "offer", offer: offer })
            )
          );
        } catch (err) {
          console.log("Error creating offer");
        }

        streamRef.current = stream;
        peerConnectionRef.current = peerConnection;
      } catch (err) {
        // Handle Error
        console.log("Err: ", err);
      }
    };
    _()
      .then(() => {})
      .catch(() => {});

    return () => {
      console.log("Cleaning webrtc");
      if (streamRef && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  };

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
      <WebRTCView stream={streamRef.current} />
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
