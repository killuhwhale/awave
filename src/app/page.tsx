"use client";
import React, {
  useState,
  useEffect,
  ChangeEvent,
  useRef,
  useCallback,
} from "react";
import { Howl } from "howler";
import SongPlayer from "./comps/SongPlayer";
import SongList from "./comps/songListSearchable";
import SongListSearchable from "./comps/songListSearchable";
import SongListOnDeck from "./comps/songListOnDeck";
import config from "../../config.json";
import {
  UilPlayCircle,
  UilPauseCircle,
  UilSkipForwardAlt,
  UilArrowLeft,
  UilArrowRight,
} from "@iconscout/react-unicons";
import ActionCancelModal from "./comps/modals/ActionCancelModal";
import fbApp from "./utils/firebase";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
} from "firebase/firestore/lite";
import { rtcMsg } from "./utils/utils";
const db = getFirestore(fbApp);

/**
 *
 *  wma does not work!
 *   MetalMan.wma
 *
 */

interface IndexedObject {
  [key: string]: string; // Index signature
}

class Commands {
  PLAY = "play";
  PAUSE = "pause";
  NEXT = "next";
  VOLUP = "volup";
  VOLDOWN = "voldown";
  LOADSETLIST = "loadSetlist";

  getCmd: IndexedObject = {
    "1": this.PLAY,
    "2": this.PAUSE,
    "3": this.NEXT,
    "4": this.VOLUP,
    "5": this.VOLDOWN,
    "6": this.LOADSETLIST,
  };
}

const CMD = new Commands();

const WSURL = config["wss_url"];

function cleanSongSource(songSrc: string): string {
  return encodeURIComponent(songSrc);
}
const host = config["host"];
console.log("hosthosthosthost", host);
const DEFAULT_SONG = {
  name: "Track 8",
  src: `http://${host}:3001/${cleanSongSource("Track 8.wav")}`,
};

const songs: SongProps[] = [
  {
    name: "--Dumby1",
    src: `http://${host}:3001/${cleanSongSource("Dumby1.wav")}`,
  },
  {
    name: "--Dumby2",
    src: `http://${host}:3001/${cleanSongSource("Dumby2.wav")}`,
  },
  {
    name: "Track5",
    album: "Debut Album",
    artist: "Unlucky 17",
    src: `http://${host}:3001/${cleanSongSource("Track5.wav")}`,
  },
  {
    name: "Track 1",
    artist: "Unlucky 17",
    src: `http://${host}:3001/${cleanSongSource("Track 1.wav")}`,
  },
  {
    name: "Track 3",
    album: "Debut Album",
    src: `http://${host}:3001/${cleanSongSource("Track 3.wav")}`,
  },
  {
    name: "Track 4",
    src: `http://${host}:3001/${cleanSongSource("Track 4.wav")}`,
  },
  {
    name: "Apt 6 - T2",
    src: `http://${host}:3001/${cleanSongSource("Apt 6 - T2.wav")}`,
  },
  {
    name: "Track 6",
    src: `http://${host}:3001/${cleanSongSource("Track6.wav")}`,
  },
];

const PLAYERNAME_LEFT = "p1";
const PLAYERNAME_RIGHT = "p2";

type CmdMsg = {
  cmd: number;
  cmdType: number;
  partyName: string;
  secretCode: string;
  setlist: number;
  volAmount: number;
};
const partyName = "tp";

const Home = () => {
  const currentPlayerRef = useRef<Howl | null>();
  const currentPlayerNameRef = useRef<string>();

  const leftPlayerRef = useRef<Howl | null>();
  const rightPlayerRef = useRef<Howl | null>();
  const [leftDuration, setLeftDuration] = useState(0);
  const leftDurationRef = useRef(0);
  const [rightDuration, setRightDuration] = useState(0);
  const rightDurationRef = useRef(0);

  const [isLeftPlaying, setIsLeftPlaying] = useState(false);
  const [isRightPlaying, setIsRightPlaying] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<HTMLAudioElement | null>(null);
  const vidStreamRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const setlistsRef = useRef<Setlist[]>([] as Setlist[]);
  const [setlists, setSetlists] = useState<Setlist[]>([] as Setlist[]);

  useEffect(() => {
    const setListPath = `setlists/${partyName}/setlists`;
    console.log("loading setlists: ", setListPath);
    const _ = async () => {
      console.log("Getting doc...");
      const setlistDocs = await getDocs(collection(db, setListPath));
      console.log("Got doc:", setlistDocs);

      // const allSetlists: Setlist[] = [] as Setlist[];

      const allSetlists = await Promise.all(
        setlistDocs.docs.map(async (doc) => {
          // console.log("Setlist: ", doc.data());
          const setlistData = doc.data() as Setlist;

          const songDocs = await getDocs(
            collection(db, `${setListPath}/${setlistData.title}/songs`)
          );

          const allSongs = [] as SongProps[];
          songDocs.docs.forEach((songDoc) => {
            const songData = songDoc.data() as SongProps;
            allSongs.push({
              ...songData,
              src: `http://${host}:3001/${encodeURIComponent(
                songData["name"]
              )}`,
            });
          });

          return {
            ...setlistData,
            songs: allSongs,
          } as Setlist;
        })
      );

      console.log("Setting setlists: ", allSetlists);
      allSetlists.sort((a, b) => (a.order > b.order ? 1 : -1));
      setSetlists(allSetlists);
      setlistsRef.current = allSetlists;
    };
    _().then(() => {});
  }, []);

  const connectToWebSocket = () => {
    if (ws.current) return;

    const wss = new WebSocket(WSURL);

    wss.onopen = () => {
      console.log("WSS Connected! Sending register command 0");

      wss.send(
        JSON.stringify({
          cmd: 0,
          cmdType: 0,
          partyName: partyName,
        })
      );
    };

    const turnConfig = {
      urls: config["urls"],
      username: "a",
      credential: "a",
    };

    console.log("turnConfig: ", turnConfig);

    let peerConstraints = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
        turnConfig,
      ],
    };
    let peerConnection = new RTCPeerConnection(peerConstraints);
    let datachannel: RTCDataChannel | null = null;
    peerConnectionRef.current = peerConnection;

    peerConnectionRef.current.addEventListener("icecandidate", (event) => {
      console.log("onCandidate:", event.candidate);
      if (event.candidate) {
        wss?.send(
          JSON.stringify(
            rtcMsg(partyName, "s3cr3t", {
              rtcType: "candidate",
              candidate: event.candidate,
            })
          )
        );
      }
    });

    peerConnectionRef.current.addEventListener("icecandidateerror", (event) => {
      console.log("icecandidateerror:", event);
    });

    peerConnectionRef.current.addEventListener("datachannel", (event) => {
      datachannel = event.channel;

      // Now you've got the datachannel.
      // You can hookup and use the same events as above ^

      datachannel.addEventListener("open", (event) => {});
      datachannel.addEventListener("close", (event) => {});
      datachannel.addEventListener("message", (message) => {
        alert(message);
      });
    });

    peerConnectionRef.current.addEventListener("track", async (event) => {
      console.log("Send stream to RTCView: ", event.streams[0]);
      console.log("Enabled: ");
      event.streams[0].getAudioTracks().forEach((track) => {
        console.log("Audio enabled: ", track.enabled);
      });
      console.log("Enabled: ", event.streams[0].getTracks());

      if (micStreamRef.current) {
        micStreamRef.current.srcObject = event.streams[0];
        micStreamRef.current.play();
        micStreamRef.current.volume = 1;
      }
      if (vidStreamRef.current) {
        vidStreamRef.current.srcObject = event.streams[0];
        vidStreamRef.current.play();
        vidStreamRef.current.volume = 1;
      }
    });

    wss.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      console.log("Recv'd msg: ", data);
      const cmd = data["cmd"];
      const cmdType = data["cmdType"];
      console.log("cmdType: ", typeof cmdType, cmdType);
      if (cmdType == 1) {
        executeCmd(data);
      } else if (cmdType === 1337) {
        switch (data.rtcType) {
          case "offer":
            console.log("handling offer...");
            peerConnectionRef.current?.setRemoteDescription(
              new RTCSessionDescription(data.offer)
            );
            console.log("creating answer...");

            peerConnectionRef.current
              ?.createAnswer()
              .then((answer) => {
                console.log("Created answer...", answer);
                peerConnectionRef.current?.setLocalDescription(answer);
                console.log("Sending answer...", wss);

                wss.send(
                  JSON.stringify(
                    rtcMsg(partyName, "s3cr3t", {
                      rtcType: "answer",
                      answer: answer,
                    })
                  )
                );
              })
              .catch((error) => console.error("Answer error: ", error));
            break;
          case "answer":
            console.log("Setting local description from answer");
            peerConnection.setLocalDescription(
              new RTCSessionDescription(data.answer)
            );
            break;
          case "candidate":
            console.log("Adding candidate");
            peerConnectionRef.current?.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
            break;
        }
      }
    };

    wss.onerror = (error) => {
      console.log("WebSocket Error ", error);
      if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
        ws.current = null;
      }
    };

    wss.onclose = (ev) => {
      console.log("WSs closeed");
      if (!ev.wasClean) {
        ws.current = null;
        connectToWebSocket();
      }
    };

    // Create offer
    try {
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

      peerConnection.createOffer(sessionConstraints).then((offer) => {
        peerConnection.setLocalDescription(offer);

        console.log("Sending offer: ", offer);
        wss.send(
          JSON.stringify(
            rtcMsg(partyName, "s3cr3t", { rtcType: "offer", offer: offer })
          )
        );
      });
    } catch (err) {
      console.log("Error creating offer");
    }
    // Also listen for an answer

    ws.current = wss;
    // return () => {
    //   if ((wss as WebSocket)?.readyState !== WebSocket.CLOSED) {
    //     (wss as WebSocket).close();
    //   }
    // };
  };

  const executeCmd = (data: CmdMsg) => {
    switch (CMD.getCmd[data.cmd]) {
      case CMD.PLAY:
        console.log("Press Play!");
        masterPlay();
        break;
      case CMD.PAUSE:
        console.log("Press Pause!");
        masterPause();
        break;
      case CMD.NEXT:
        console.log("Press Next!");

        masterNext();
        break;
      case CMD.VOLUP:
        console.log("Press Vol up!", data.volAmount);
        masterVol(data.volAmount);
        break;
      case CMD.VOLDOWN:
        console.log("Press Vol down!", data.volAmount);
        masterVol(-data.volAmount);
        break;
      case CMD.LOADSETLIST:
        console.log("LoadSetlist!", data.setlist);
        unconfirmedLoadSetlist(data.setlist);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (ws.current === null) {
      return connectToWebSocket();
    }
  }, [ws]);

  const initLoadingRef = useRef(false);

  const setNewPlayer = (
    playerName: string,
    newSong: SongProps,
    init = false
  ) => {
    console.log("Attempting Loading new song and player");

    if (!newSong) return;

    if (leftPlayerRef.current && playerName === PLAYERNAME_LEFT) {
      leftPlayerRef.current.unload();
    }
    if (rightPlayerRef.current && playerName === PLAYERNAME_RIGHT) {
      rightPlayerRef.current.unload();
    }

    const newPlayer = new Howl({
      src: newSong.src,
      html5: true, // Allows playing from a file/blob
    });

    if (init) {
      currentPlayerNameRef.current = PLAYERNAME_LEFT;
      currentPlayerRef.current = newPlayer;
    }

    newPlayer?.once("load", function () {
      const dur = newPlayer.duration();

      if (playerName === PLAYERNAME_LEFT) {
        setLeftDuration(dur);
        leftPlayerRef.current = newPlayer;
        leftDurationRef.current = dur;
      } else {
        setRightDuration(newPlayer.duration());
        rightPlayerRef.current = newPlayer;
        rightDurationRef.current = dur;
      }
    });

    //   newPlayer.on("", () => {});

    // setPlayer(newPlayer);
  };

  const switchCurrentPlayer = (playerName: string) => {
    if (playerName === PLAYERNAME_LEFT) {
      console.log("Switching current player left");
      currentPlayerNameRef.current = PLAYERNAME_LEFT;
      currentPlayerRef.current = leftPlayerRef.current;
    } else {
      console.log("Switching current player right");
      currentPlayerNameRef.current = PLAYERNAME_RIGHT;
      currentPlayerRef.current = rightPlayerRef.current;
    }
  };

  const [onDeckSongs, setOnDeckSongs] = useState(songs);
  const onDeckSongsRef = useRef(songs);
  const [allSongs, setAllSongs] = useState(songs);

  const onDragStart = (e: any, song: SongProps) => {
    e.dataTransfer.setData("song", JSON.stringify(song));
    e.dataTransfer.setData("type", 1);
  };

  const onDragOver = (e: any) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const onDrop = (e: any, dropIndex: number) => {
    e.preventDefault();
    const dragType = e.dataTransfer.getData("type");
    if (dragType !== "1") return;
    console.log("DROPPED @: ", dropIndex);

    try {
      const draggedSong = JSON.parse(e.dataTransfer.getData("song"));
      if (!onDeckSongsRef.current) return;
      const onDeckSongsFiltered = onDeckSongsRef.current.filter(
        (onDeckSong) => {
          return onDeckSong.src === draggedSong.src;
        }
      );

      console.log("Fileted val: ", onDeckSongsFiltered.length);
      if (onDeckSongsFiltered.length === 0) {
        if (onDeckSongsRef.current.length === 0) {
          setOnDeckSongs((prevSongs) => {
            const s = [...prevSongs, draggedSong];
            onDeckSongsRef.current = s;
            return s;
          });
        } else {
          setOnDeckSongs((prevSongs) => {
            const s = [
              ...prevSongs.slice(0, dropIndex),
              draggedSong,
              ...prevSongs.slice(dropIndex),
            ];
            onDeckSongsRef.current = s;
            return s;
          });
        }
      }
    } catch (err) {
      console.log("Error on drop: ", err);
    }
  };

  const onDragStartRearrangeDeck = (
    e: any,
    song: SongProps,
    startIndex: number
  ) => {
    e.dataTransfer.setData("song", JSON.stringify(song));
    e.dataTransfer.setData("startIndex", startIndex);
    e.dataTransfer.setData("type", 0);
  };

  const onDragOverRearrangeDeck = (e: any) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const onDropRearrangeDeck = (e: any, dropIndex: number) => {
    e.preventDefault();
    const dragType = e.dataTransfer.getData("type");
    console.log("DROPPED RearrangeDeck @: ", dragType, dropIndex);

    if (dragType !== "0") return;
    try {
      const draggedSong = JSON.parse(e.dataTransfer.getData("song"));
      const startIndex = parseInt(e.dataTransfer.getData("startIndex"));
      console.log(
        "DROPPED RearrangeDeck startIdx, dropIdx ",
        startIndex,
        dropIndex
      );
      setOnDeckSongs((prevSongs) => {
        const newSongs = [...prevSongs];
        newSongs.splice(dropIndex, 0, draggedSong);
        console.log("Dropped songs 1: ", newSongs);

        if (startIndex < dropIndex) {
          newSongs.splice(startIndex, 1);
        } else {
          newSongs.splice(startIndex + 1, 1);
        }
        console.log("Dropped songs 2: ", newSongs);
        onDeckSongsRef.current = newSongs;
        return newSongs;
      });
    } catch (err) {
      console.log("Error on drop: ", err);
    }
  };

  const getNextSong = () => {
    console.log("Getting next song from: ", onDeckSongs);
    const nextSong = { ...onDeckSongsRef.current[0] };
    setOnDeckSongs(onDeckSongsRef.current.slice(1, onDeckSongs.length));
    onDeckSongsRef.current = onDeckSongsRef.current.slice(
      1,
      onDeckSongs.length
    );
    if (!nextSong.name) return DEFAULT_SONG;
    return nextSong;
  };

  const [leftSong, setLeftSong] = useState<SongProps | null>(null);
  const [rightSong, setRightSong] = useState<SongProps | null>(null);

  const [leftMusicVolume, setLeftMusicVolume] = useState(50);
  const [rightMusicVolume, setRightMusicVolume] = useState(50);
  const [balance, setBalance] = useState(50);
  const balanceRef = useRef(50);
  const balanceIntervalRef = useRef<NodeJS.Timeout>();
  const SLIDE_DURATION = 1776;

  const onVolmeShareChange: React.ChangeEventHandler<HTMLInputElement> = (
    ev: ChangeEvent<HTMLInputElement>
  ) => {
    if (balanceIntervalRef.current) {
      clearInterval(balanceIntervalRef.current);
    }

    const val = ev.target.value;
    updateBalance(val);
    balanceRef.current = parseInt(val);
  };

  const updateBalance = (newBalance: string) => {
    const val = newBalance;
    const leftVol = 100 - parseInt(val);
    const rightVol = parseInt(val) - 1;
    // console.log("Setting volumes: ", leftVol, rightVol, val);
    setLeftMusicVolume(leftVol / 100);
    setRightMusicVolume(rightVol / 100);
    setBalance(parseInt(val));
  };

  // Slides balance to left or right
  const slideBalance = (direction: string) => {
    if (balanceIntervalRef.current) {
      clearInterval(balanceIntervalRef.current);
    }

    const steps = 20;
    const intervalTime = SLIDE_DURATION / steps;
    let originalVolume = balanceRef.current;
    if (direction === "right") {
      originalVolume = 100 - balanceRef.current;
    }
    const decrement = originalVolume / steps;
    const intervalId = setInterval(() => {
      let newVolume = Math.max(1, balanceRef.current - decrement);
      if (direction === "right") {
        newVolume = Math.min(100, balanceRef.current + decrement);
      }

      balanceRef.current = newVolume;
      updateBalance(`${newVolume}`);
    }, intervalTime);
    balanceIntervalRef.current = intervalId;
    // Ensure the interval is cleared after the duration
    setTimeout(() => clearInterval(intervalId), SLIDE_DURATION);
  };

  useEffect(() => {
    console.log("Init load for songs!!");
    if (!leftPlayerRef.current) {
      console.log("Getting next left song", leftPlayerRef.current);
      const nextLeftSong = getNextSong();

      setNewPlayer(PLAYERNAME_LEFT, nextLeftSong, true);

      if (!leftSong) setLeftSong(nextLeftSong);
    }

    if (!rightPlayerRef.current) {
      console.log("Getting next right song", rightPlayerRef.current);
      const nextRightSong = getNextSong();
      setNewPlayer(PLAYERNAME_RIGHT, nextRightSong, true);

      if (!rightSong) setRightSong(nextRightSong);
    }
    initLoadingRef.current = false;
  }, []);

  const autoNextSong = (playerName: string) => {
    console.log("AUTONEXTSONG called.");
    const nextSong = getNextSong();
    playNextSong(playerName, nextSong);
  };

  // Each player will call this with their name
  // We then need to play the next song on this player.
  const playNextSong = (playerName: string, nextSong: SongProps) => {
    if (playerName === PLAYERNAME_LEFT) {
      slideBalance("right");
      rightPlayerRef.current?.play();
      setIsRightPlaying(true);
      setIsLeftPlaying(false);

      console.log("Setting left song for P1");

      setTimeout(() => {
        switchCurrentPlayer(PLAYERNAME_RIGHT);
        leftPlayerRef.current?.unload();
        setNewPlayer(playerName, nextSong);
        setLeftSong(nextSong);
      }, SLIDE_DURATION + 40);

      // play right track
    } else {
      slideBalance("left");
      leftPlayerRef.current?.play();
      setIsLeftPlaying(true);
      setIsRightPlaying(false);

      console.log("Setting right song for P2");

      setTimeout(() => {
        switchCurrentPlayer(PLAYERNAME_LEFT);
        rightPlayerRef.current?.unload();
        setNewPlayer(playerName, nextSong);
        setRightSong(nextSong);
      }, SLIDE_DURATION + 40);
    }
  };

  // useEffect(() => {}, [leftSong.src, rightSong.src]);

  const masterPlay = () => {
    if (currentPlayerNameRef.current) {
      if (
        currentPlayerNameRef.current === PLAYERNAME_LEFT &&
        !leftPlayerRef.current?.playing()
      ) {
        setIsLeftPlaying(true);
        leftPlayerRef.current?.play();
        console.log("Master Play Left");
      } else if (
        currentPlayerNameRef.current === PLAYERNAME_RIGHT &&
        !rightPlayerRef.current?.playing()
      ) {
        setIsRightPlaying(true);
        rightPlayerRef.current?.play();
        console.log("Master Play Right");
      }
    }
  };

  const masterPause = () => {
    if (currentPlayerNameRef.current) {
      if (
        currentPlayerNameRef.current === PLAYERNAME_LEFT &&
        leftPlayerRef.current?.playing()
      ) {
        setIsLeftPlaying(false);
        leftPlayerRef.current?.pause();
        console.log("Master Pause Left");
      } else if (
        currentPlayerNameRef.current === PLAYERNAME_RIGHT &&
        rightPlayerRef.current?.playing()
      ) {
        setIsRightPlaying(false);
        rightPlayerRef.current?.pause();
        console.log("Master Pause Right");
      }
    }
  };

  const masterNextButtonDisabled = useRef(false);
  const masterNext = () => {
    if (
      currentPlayerRef.current &&
      currentPlayerNameRef.current &&
      !masterNextButtonDisabled.current
    ) {
      console.log(
        "Master next current name ref: ",
        currentPlayerNameRef.current
      );
      autoNextSong(currentPlayerNameRef.current);
      masterNextButtonDisabled.current = true;
      setTimeout(() => {
        masterNextButtonDisabled.current = false;
      }, SLIDE_DURATION + 80);
    }
  };

  const masterVol = (volAmount: number) => {
    const delta = volAmount / 100;
    const curVol = Howler.volume();
    const newVolume = Math.max(0, Math.min(curVol + delta, 1));
    console.log("New Volume");
    Howler.volume(newVolume);
  };

  const [showRemoveOnDeckSong, setShowRemoveOnDeckSong] = useState(false);
  const [rmOnDeckSong, setRmOnDeckSong] = useState<SongProps | null>();

  // Give to SongDeckList
  const confirmRemoveOnDeckSong = (rmSong: SongProps) => {
    setRmOnDeckSong(rmSong);
    setShowRemoveOnDeckSong(true);
  };

  // Give to Modal action
  const removeOnDeckSong = () => {
    console.log("Removing: ", rmOnDeckSong?.src);
    setOnDeckSongs((prevSongs) => {
      const newSongs = [...prevSongs];
      const fNewSongs = newSongs.filter(
        (song) => song.src !== rmOnDeckSong?.src
      );
      onDeckSongsRef.current = fNewSongs;
      return fNewSongs;
    });

    setShowRemoveOnDeckSong(false);
  };

  const [curSetListIdx, setCurSetListIdx] = useState(0);
  const setListScrollRef = useRef<HTMLDivElement>(null);
  const [scrollIntervalID, setScrollIntervalID] =
    useState<NodeJS.Timeout | null>(null);

  const handleMouseDown = useCallback((dir: number) => {
    if (scrollIntervalID) clearInterval(scrollIntervalID);
    // Start the timer when the mouse button is pressed
    const intervalID = setInterval(() => {
      setListScrollRef.current?.scrollBy({
        behavior: "smooth",
        left: dir * 75,
      });
    }, 100); // Scrolls every 1 second
    setScrollIntervalID(intervalID);
  }, []);

  const handleMouseUp = useCallback(() => {
    // Clear the timer if the mouse button is released
    if (scrollIntervalID) clearInterval(scrollIntervalID);
  }, [scrollIntervalID]);

  const handleMouseLeave = useCallback(() => {
    // Also clear the timer if the cursor leaves the element while holding the mouse button
    if (scrollIntervalID) clearInterval(scrollIntervalID);
  }, [scrollIntervalID]);

  const allSongsSetlist = {
    title: "All Songs",
    order: 0,
    songs: allSongs,
  };

  const combinedSetlists = [
    allSongsSetlist,
    ...(setlists ?? ([] as Setlist[])),
  ];

  const [setlistToLoad, setSetlistToLoad] = useState(-1);
  const [showSetlistToLoadConfirm, setShowSetlistToLoadConfirm] =
    useState(false);

  const confirmLoadSetlist = (idx: number) => {
    setShowSetlistToLoadConfirm(true);
    setSetlistToLoad(idx);
  };

  const unconfirmedLoadSetlist = (unconfirmedSetlist: number) => {
    console.log(
      "unconfirmedLoadSetlist unconfirmedSetlist:",
      unconfirmedSetlist,
      setlists
    );
    const setlist =
      unconfirmedSetlist === -1
        ? allSongsSetlist
        : setlistsRef.current[unconfirmedSetlist - 1];

    console.log("unconfirmedLoadSetlist ", setlist);
    if (setlist) {
      setOnDeckSongs(setlist.songs);
      onDeckSongsRef.current = setlist.songs;
      setCurSetListIdx(unconfirmedSetlist);
    }
  };

  const loadSetlist = () => {
    const setlist =
      setlistToLoad === -1 ? allSongsSetlist : setlists[setlistToLoad];
    if (setlist) {
      setOnDeckSongs(setlist.songs);
      onDeckSongsRef.current = setlist.songs;
    }
    setShowSetlistToLoadConfirm(false);
  };

  return (
    <div
      id="pageRoot"
      className="flex min-h-screen h-screen max-h-screen  flex-col items-center justify-between ml-8 mr-8"
    >
      <div className="flex flex-col justify-center  w-full h-3/6 max-h-3/6 min-h-3/6 ">
        <div className="flex flex-col justify-center  w-full h-3/6 ">
          <div className="flex  w-full">
            <div className="w-1/2">
              {leftSong ? (
                <SongPlayer
                  key={`${leftSong.src}_p1`}
                  playerName={PLAYERNAME_LEFT}
                  playerRef={leftPlayerRef}
                  duration={leftDuration}
                  durationRef={leftDurationRef}
                  nextSong={autoNextSong}
                  musicVol={leftMusicVolume}
                  isPlaying={isLeftPlaying}
                  setIsPlaying={setIsLeftPlaying}
                  song={leftSong}
                  bgColor="bg-slate-800"
                />
              ) : (
                <div></div>
              )}
            </div>
            <div className="w-1/2">
              {rightSong ? (
                <SongPlayer
                  key={`${rightSong.src}_p2`}
                  playerName={PLAYERNAME_RIGHT}
                  isPlaying={isRightPlaying}
                  setIsPlaying={setIsRightPlaying}
                  playerRef={rightPlayerRef}
                  duration={rightDuration}
                  durationRef={rightDurationRef}
                  nextSong={autoNextSong}
                  musicVol={rightMusicVolume}
                  song={rightSong}
                  bgColor="bg-slate-900"
                />
              ) : (
                <div></div>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col items-center justify-center">
            <input
              className="w-3/4"
              type="range"
              onChange={onVolmeShareChange}
              min="1"
              max="100"
              disabled
              value={balance}
            ></input>
            <p className="w-full text-center">
              Bal: {parseInt(balance.toString())}
            </p>
          </div>
        </div>

        <div className="flex w-full justify-center items-center space-x-24 h-3/6">
          {isLeftPlaying || isRightPlaying ? (
            <UilPauseCircle size="120" color="#61DAFB" onClick={masterPause} />
          ) : (
            <UilPlayCircle size="120" color="#61DAFB" onClick={masterPlay} />
          )}
          <UilSkipForwardAlt size="120" color="#61DAFB" onClick={masterNext} />
        </div>
      </div>

      {/* <audio id="audioPlayer" controls ref={micStreamRef}></audio> */}
      <video id="videoPlayer" controls ref={vidStreamRef}></video>

      <div className="flex  items-center justify-center w-full space-x-12 max-h-3/6 min-h-3/6 h-3/6">
        <div className=" bg-neutral-800 text-rose-700 text-sm  w-1/2  rounded-md font-bold h-full">
          <SongListOnDeck
            songs={onDeckSongs}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragStartRearrangeDeck={onDragStartRearrangeDeck}
            onDragOverRearrangeDeck={onDragOverRearrangeDeck}
            onDropRearrangeDeck={onDropRearrangeDeck}
            confirmRemoveOnDeckSong={confirmRemoveOnDeckSong}
          />
        </div>

        <div className=" bg-neutral-800 w-1/2 text-emerald-300 text-sm font-bold h-full rounded-md ">
          <div className="flex flex-1 h-1/6 justify-between">
            <div
              onPointerDown={() => {
                handleMouseDown(-1);
              }}
              onPointerUp={() => handleMouseUp()}
              onPointerLeave={() => handleMouseLeave()}
              className="flex-1 flex justify-center"
            >
              <UilArrowLeft
                size="50"
                color="#61DAFB"
                onClick={() => {
                  console.log("Scrolling: ", setListScrollRef.current);
                  setListScrollRef.current?.scrollBy({
                    left: -50,
                    behavior: "smooth",
                  });
                }}
              />
            </div>

            <div
              className="overflow-x-auto flex-auto w-3/4 flex-shrink-0 flex justify-center  space-x-8 cursor-pointer"
              ref={setListScrollRef}
            >
              <div className="w-full flex">
                {combinedSetlists?.map((setList: Setlist, idx: number) => {
                  return (
                    <div
                      key={`${idx}_setlist`}
                      className={`flex ${
                        idx === curSetListIdx
                          ? "text-rose-700"
                          : "text-neutral-400"
                      }`}
                      onClick={() => {
                        setCurSetListIdx(idx);
                      }}
                    >
                      <p
                        className={`p-4 border-b-2 ${
                          idx === curSetListIdx
                            ? "border-rose-700"
                            : "border-neutral-400"
                        }`}
                      >
                        {setList.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              onPointerDown={() => {
                handleMouseDown(1);
              }}
              onPointerUp={() => handleMouseUp()}
              onPointerLeave={() => handleMouseLeave()}
              className="flex-1  flex justify-center"
            >
              <UilArrowRight
                size="50"
                color="#61DAFB"
                onClick={() => {
                  console.log("Scrolling: ", setListScrollRef.current);
                  setListScrollRef.current?.scrollBy({
                    left: 50,
                    behavior: "smooth",
                  });
                }}
              />
            </div>
          </div>
          <div className="flex flex-auto h-5/6 overflow-y-auto">
            {combinedSetlists.map((setlist: Setlist, idx: number) => {
              return (
                <SongListSearchable
                  hidden={idx !== curSetListIdx}
                  title={setlist.title}
                  songs={setlist.songs}
                  onDragStart={onDragStart}
                  confirmLoadSetlist={() => {
                    confirmLoadSetlist(idx - 1);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <ActionCancelModal
        isOpen={showRemoveOnDeckSong}
        message={`Are you sure you want to remove "${rmOnDeckSong?.name}"`}
        onAction={removeOnDeckSong}
        actionText="Remove"
        onClose={() => {
          setShowRemoveOnDeckSong(false);
        }}
        key={`rmODS_${rmOnDeckSong?.src}`}
        note={`${rmOnDeckSong?.src}`}
        btnStyle="bg-rose-700 text-slate-200"
      />
      <ActionCancelModal
        isOpen={showSetlistToLoadConfirm}
        message={`Are you sure you want to load "${setlists[setlistToLoad]?.title}"`}
        onAction={loadSetlist}
        actionText="Load"
        onClose={() => {
          setShowSetlistToLoadConfirm(false);
        }}
        key={`LSL_${setlists[setlistToLoad]?.title}`}
        note={`${setlists[setlistToLoad]?.title}`}
        btnStyle="bg-rose-700 text-slate-200"
      />
    </div>
  );
};

export default Home;
