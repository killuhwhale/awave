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
  const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [signaled, setSignaled] = useState(false);

  const [setlists, setSetlists] = useState<Setlist[]>([] as Setlist[]);
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);
  const streamRef = useRef<any | null>(null);
  const peerConnectionRef = useRef<WebRTCPeerConnection | null>(null);
  const [hasAudioStream, setHasAudioStream] = useState(false);

  useEffect(() => {
    let peerConnection: WebRTCPeerConnection;
    if (
      !wsRef.current ||
      !wsRef.current.readyState ||
      wsRef.current.readyState !== WebSocket.OPEN
    )
      return;
    console.log("Begin creating webrtc connect...", wsRef.current.readyState);

    const _ = async () => {
      let audioCount = 0;
      let mediaConstraints = {
        audio: true,
        video: false,
      };

      try {
        const stream = await WebmediaDevices.getUserMedia(mediaConstraints);
        streamRef.current = stream;

        let peerConstraints = {
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302",
            },
          ],
        };

        peerConnection = new WebRTCPeerConnection(peerConstraints);
        peerConnectionRef.current = peerConnection;
        peerConnection.addEventListener("connectionstatechange", (event) => {
          console.log("connectionstatechange:", event);
        });

        peerConnection.addEventListener("icecandidate", (event) => {
          if (event.candidate) {
            console.log("onCandidate:");
            ws?.send(
              JSON.stringify(
                rtcMsg(partyName, "s3cr3t", {
                  rtcType: "candidate",
                  candidate: event.candidate,
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
          console.log("track:", event);
        });

        peerConnection.onconnectionstatechange = function (event) {
          switch (peerConnection.connectionState) {
            case "connected":
              console.log(
                "The peer connection is directly connected with the other peer."
              );
              streamRef.current
                .getTracks()
                .forEach((track) =>
                  peerConnection.addTrack(track, streamRef.current)
                );
              break;
            case "disconnected":
            case "failed":
              console.error("Connection state is failed/disconnected.");
              break;
          }
        };
        let sessionConstraints = {
          mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: false,
            VoiceActivityDetection: true,
          },
        };

        peerConnection
          .createOffer(sessionConstraints)
          .then((offer) => {
            peerConnection.setLocalDescription(offer);
            console.log("Sending offer: ", offer, ws.readyState);
            ws?.send(
              JSON.stringify(
                rtcMsg(partyName, "s3cr3t", { rtcType: "offer", offer: offer })
              )
            );
          })
          .catch((error) => console.error("Offer error: ", error));

        let datachannel = peerConnection.createDataChannel("my_channel");

        datachannel.addEventListener("open", (event) => {});
        datachannel.addEventListener("close", (event) => {});
        datachannel.addEventListener("message", (message) => {});
        // datachannel.send("TEststststststtst");

        setHasAudioStream(true);
      } catch (err) {
        // Handle Error
        console.log("Err: ", err);
      }

      console.log("Audio devices: ", audioCount);
    };
    _()
      .then(() => {})
      .catch(() => {});

    return () => {
      if (streamRef && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, [signaled]);

  const connectToWebSocket = () => {
    if (ws) return;
    const wss = new WebSocket(WSURL);
    setWs(ws);
    wsRef.current = wss;
  };

  useEffect(() => {
    if (ws === null) {
      return connectToWebSocket();
    }

    ws.onopen = () => {
      console.log("Connected!");
      console.log("WSS Connected! Sending register command 0");
      setSignaled(true);
      ws.send(
        JSON.stringify({
          cmd: 0,
          cmdType: 0,
          partyName: partyName,
        })
      );
    };

    ws.onmessage = (ev) => {
      // Not expecting messages from controller
      const data = JSON.parse(ev.data);
      console.log("Recv'd msg:", data);
      switch (data.rtcType) {
        // case "offer":
        //   peerConnectionRef.current.setRemoteDescription(
        //     new RTCSessionDescription(data.offer)
        //   );
        //   peerConnectionRef.current
        //     .createAnswer()
        //     .then((answer) => {
        //       peerConnectionRef.current.setLocalDescription(answer);
        //       console.log("Sending answer: ", answer);
        //       ws.send(
        //         JSON.stringify(
        //           rtcMsg(partyName, "s3cr3t", {
        //             rtcType: "answer",
        //             answer: answer,
        //           })
        //         )
        //       );
        //     })
        //     .catch((error) => console.error("Answer error: ", error));
        //   break;
        case "answer":
          console.log("Recv'd answer! Setting Remote Description");
          peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          break;
        case "candidate":
          console.log("Recv'd candidate! Adding ice candidate");
          peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
          break;
      }
    };

    ws.onerror = (error) => {
      console.log("WebSocket Error ", error);
      if (ws && ws.readyState !== WebSocket.OPEN) {
        setWs(null);
        wsRef.current = null;
      }
    };

    ws.onclose = (ev) => {
      if (!ev.wasClean) {
        setWs(null);
        wsRef.current = null;
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
      {/* {hasAudioStream ? <WebRTCView stream={streamRef.current} /> : <></>} */}
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
