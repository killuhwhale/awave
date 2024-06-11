"use client";

import React, {
  useState,
  useEffect,
  ChangeEvent,
  useRef,
  useCallback,
} from "react";

import { Howl } from "howler";

import CIcon from "@coreui/icons-react";
import {
  cilMediaPlay,
  cilMediaPause,
  cilMediaSkipForward,
  cilMediaSkipBackward,
  cilArrowLeft,
  cilArrowRight,
} from "@coreui/icons";

import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { User, getAuth, signInAnonymously } from "firebase/auth";

import SongPlayer from "./comps/SongPlayer";
import SongListSearchable from "./comps/songListSearchable";
import SongListOnDeck from "./comps/songListOnDeck";
import ActionCancelModal from "./comps/modals/ActionCancelModal";
import fbApp from "./utils/firebase";

import {
  DEFAULT_SONG,
  PLAYERNAME_LEFT,
  PLAYERNAME_RIGHT,
  SongProp,
  getSongs,
  isGoodSecret,
  rtcMsg,
} from "./utils/utils";
import Commands from "./utils/Commands";
import CONFIG from "../../config.json";
import useInterceptBackNavigation from "./comps/interceptBackEvent";

/**
 *
 *  wma does not work!
 *   MetalMan.wma
 *
 */

const partyName = CONFIG["partyName"];
const WSURL = CONFIG["wss_url"];
const host = CONFIG["host"];
const db = getFirestore(fbApp);
const auth = getAuth(fbApp);
const CMD = new Commands();

const TIME_REMAINING_BEFORE_PLAYING_NEXT_DELAY = 19;

const Home: React.FC = () => {
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

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setlistsRef = useRef<Setlist[]>([] as Setlist[]);
  const [setlists, setSetlists] = useState<Setlist[]>([] as Setlist[]);

  const [leftSong, setLeftSong] = useState<SongProps | null>(null);
  const [rightSong, setRightSong] = useState<SongProps | null>(null);

  const leftSongRef = useRef<SongProps | null>(null);
  const rightSongRef = useRef<SongProps | null>(null);

  const [leftMusicVolume, setLeftMusicVolume] = useState(50);
  const [rightMusicVolume, setRightMusicVolume] = useState(50);
  const [balance, setBalance] = useState(50);
  const balanceRef = useRef(50);
  const balanceIntervalRef = useRef<NodeJS.Timeout>();
  const SLIDE_DURATION = 1776 * 2.5; // Next DELAY

  const [onDeckSongs, setOnDeckSongs] = useState<SongProps[] | null>(null);
  const onDeckSongsRef = useRef<SongProps[] | null>(null);
  const [allSongs, setAllSongs] = useState<SongProps[] | null>(null);

  const [user, setUser] = useState<User | null>(null);

  const handleBackNavigation = () => {
    // window.history.pushState(null, null, "http://localhost:3000/");
    // const confirmed = window.confirm("Are you sure you want to go back?");
    // if (!confirmed) {
    // }
  };

  // TODO() uncomment, will help prvent unwanted back nav
  // useInterceptBackNavigation(handleBackNavigation);

  useEffect(() => {
    if (ws.current === null) {
      return connectToWebSocket();
    }
  }, [ws]);

  const newPeer = () => {
    const turnConfig = {
      urls: CONFIG["urls"],
      username: CONFIG["turn_username"],
      credential: CONFIG["credential"],
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

    peer.onicecandidate = (event) => {
      console.log("onCandidate:", event.candidate);
      if (event.candidate) {
        ws.current?.send(
          JSON.stringify(
            rtcMsg(partyName, "s3cr3t", {
              rtcType: "candidate",
              candidate: event.candidate,
            })
          )
        );
      }
    };

    peer.onicecandidateerror = (event) => {
      console.log("icecandidateerror:", event);
    };
    peer.onnegotiationneeded = (event) => {
      console.log("onnegotiationneeded:", event);
    };
    peer.onicegatheringstatechange = (event) => {
      console.log("icegatheringstatechange:", event);
    };
    peer.onsignalingstatechange = (event) => {
      console.log("onsignalingstatechange:", event);
    };
    peer.oniceconnectionstatechange = (event) => {
      console.log("iceconnectionstatechange:", event);
    };
    peer.onconnectionstatechange = (event) => {
      console.log("onconnectionstatechange:", event);
    };
    peer.ontrack = (event) => {
      console.log("ontrack:", event);
      console.log("Send stream to RTCView: ", event.streams[0]);
      event.streams[0].getAudioTracks().forEach((track) => {
        console.log("Audio enabled: ", track.enabled);
      });
      console.log(
        "Track/ streams: ",
        event.streams,
        event.streams[0].getTracks()
      );

      if (micStreamRef.current) {
        const mediaStream = event.streams[0];

        micStreamRef.current.srcObject = mediaStream;

        // micStreamRef.current.srcObject = event.streams[0];
        micStreamRef.current.muted = false;
        micStreamRef.current.volume = 0.95;
        micStreamRef.current.play();
      }
    };
    return peer;
  };

  const handleOffer = async (data: any) => {
    if (!peerConnectionRef.current) return;
    // handle existing peerConnection
    if (peerConnectionRef.current.localDescription) {
      peerConnectionRef.current = newPeer();
    }

    console.log("handling offer...", data.offer);
    try {
      await peerConnectionRef.current?.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );
      console.log(
        "peerConnectionRef.current remoteDescription: ",
        peerConnectionRef.current.remoteDescription
      );
      console.log("creating answer...");
      const answer = await peerConnectionRef.current.createAnswer();
      console.log("Created answer...", answer);

      await peerConnectionRef.current?.setLocalDescription(
        new RTCSessionDescription(answer)
      );
      console.log(
        "Sending answer... local desc: ",
        peerConnectionRef.current?.localDescription
      );

      ws.current?.send(
        JSON.stringify(
          rtcMsg(partyName, "s3cr3t", {
            rtcType: "answer",
            answer: peerConnectionRef.current?.localDescription,
          })
        )
      );
    } catch (err) {
      console.log("Err responding to offer: ", err);
    }
  };

  const connectToWebSocket = () => {
    if (ws.current) return;

    if (!peerConnectionRef.current) {
      console.log("Connecting to RTCPeer");
      peerConnectionRef.current = newPeer();
    }

    const wss = new WebSocket(WSURL);
    ws.current = wss;

    wss.onopen = () => {
      console.log("WSS Connected! Sending register command 0");

      wss.send(
        JSON.stringify({
          cmd: 0,
          cmdType: 0,
          partyName: partyName,
          clientType: "player",
        })
      );
    };

    wss.onmessage = async (ev) => {
      const data = JSON.parse(ev.data);
      console.log("Recv'd msg: ", data);
      const cmdType = data["cmdType"];
      const userSecret = data["secretCode"];
      console.log("cmdType: ", typeof cmdType, cmdType);

      if (!isGoodSecret(CONFIG.secret, userSecret)) return;

      if (cmdType == 1) {
        executeCmd(data);
      } else if (cmdType === 1337) {
        switch (data.rtcType) {
          case "offer":
            await handleOffer(data);
            break;
          case "answer":
            break;
          case "candidate":
            console.log("Adding candidate from", data);
            await peerConnectionRef.current?.addIceCandidate(
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
      console.log("WSs closeed", ev);
      if (!ev.wasClean) {
        ws.current = null;
        connectToWebSocket();
      }
    };

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
      case CMD.SENDSONG:
        console.log("Song sent! Playing now: ", data.song);
        playRequestedSong(
          SongProp(data.song?.fileName ?? "", data.song?.artist ?? "")
        );
        break;
      default:
        break;
    }
  };

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
        .then(async (creds) => {
          console.log("Signing in res: ", creds);
          setUser(creds.user);
          try {
            await getSetlists();
          } catch (err) {
            console.log("Setlist err: ", err);
          }
        })
        .catch((err) => {
          console.log("Error signing in!");
        });
    }
    return () => unsub();
  }, [user]);

  const getSetlists = async () => {
    const setListPath = `setlists/${partyName}/setlists`;
    console.log("loading setlists: ", setListPath);
    try {
      console.log("Getting doc...");
      const setlistDocs = await getDocs(collection(db, setListPath));
      console.log("Got doc:", setlistDocs);

      // const allSetlists: Setlist[] = [] as Setlist[];

      const allSetlists = await Promise.all(
        setlistDocs.docs.map(async (doc, idx) => {
          // console.log("Setlist: ", doc.data());
          const setlistData = doc.data() as Setlist;

          const songDocs = await getDocs(
            collection(db, `${setListPath}/${doc.id}/songs`)
          );

          const allSongs = [] as SongProps[];
          songDocs.docs.forEach((songDoc) => {
            const songData = songDoc.data() as SongProps;
            console.log("songDoc: ", songData);
            allSongs.push({
              ...songData,
              src: `http://${host}:3001/${encodeURIComponent(
                songData["fileName"]
              )}`,
            });
          });
          allSongs.sort((a, b) => ((a.order ?? 0) > (b.order ?? 0) ? 1 : -1));
          return {
            title: doc.id,
            order: idx,
            songs: allSongs,
          } as Setlist;
        })
      );

      console.log("Setting setlists: ", allSetlists);
      allSetlists.sort((a, b) => (a.order > b.order ? 1 : -1));
      setSetlists(allSetlists);
      setlistsRef.current = allSetlists;
    } catch (err) {
      console.log("Error getting setlist: ", err);
    }
  };

  // Set an interval to check the current playback time every 10 seconds
  const initLoadingRef = useRef(false);
  const checkRemTime = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    checkIntervalRef.current = setInterval(function () {
      if (currentPlayerRef.current) {
        var currentTime = currentPlayerRef.current.seek(); // Get the current playback time in seconds
        var timeRemaining = currentPlayerRef.current.duration() - currentTime;
        console.log("Time remaining: " + timeRemaining.toFixed(2) + " seconds");

        // If the remaining time is less than 10 seconds, log it to the console
        if (timeRemaining <= TIME_REMAINING_BEFORE_PLAYING_NEXT_DELAY) {
          console.log(
            "The song will end in " + timeRemaining.toFixed(2) + " seconds!"
          );
          masterNext();
          //  clearInterval(checkInterval); // Stop checking once we are within the last 10 seconds
        }
      }
    }, 10000); // Check every 10 seconds
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

  useEffect(() => {
    if (onDeckSongsRef.current) return;
    getSongs().then((songs) => {
      onDeckSongsRef.current = songs;
      setOnDeckSongs(songs);
      onDeckSongsRef.current = songs;
      setAllSongs(songs);

      console.log("Init load for songs!!");
      if (!leftPlayerRef.current) {
        console.log("Getting next left song", leftPlayerRef.current);
        const nextLeftSong = getNextSong();

        setNewPlayer(PLAYERNAME_LEFT, nextLeftSong, true);

        if (!leftSong) {
          leftSongRef.current = nextLeftSong;
          setLeftSong(nextLeftSong);
        }
      }

      if (!rightPlayerRef.current) {
        console.log("Getting next right song", rightPlayerRef.current);
        const nextRightSong = getNextSong();
        setNewPlayer(PLAYERNAME_RIGHT, nextRightSong, true);

        if (!rightSong) {
          rightSongRef.current = nextRightSong;
          setRightSong(nextRightSong);
        }
      }
      initLoadingRef.current = false;
    });
  }, []);

  const onDragStart = (e: any, song: SongProps) => {
    e.dataTransfer.setData("song", JSON.stringify(song));
    e.dataTransfer.setData("type", 1);
  };

  const onDragOver = (e: any) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  // onDrop for onDeckSongs
  // Adds song to on deck
  // Doesnt work with touch, not going to rely on this.

  const onDrop = (e: any, dropIndex: number) => {
    e.preventDefault();
    const dragType = e.dataTransfer.getData("type");
    if (dragType !== "1") return;
    // Dragged from onDeckSongs
    console.log("DROPPED @: ", dropIndex);

    try {
      const draggedSong = JSON.parse(e.dataTransfer.getData("song"));
      if (!onDeckSongsRef.current) return;
      // Remove song from list
      const onDeckSongsFiltered = onDeckSongsRef.current.filter(
        (onDeckSong) => {
          return onDeckSong.src === draggedSong.src;
        }
      );

      // Add dragged song to correct index
      console.log("Fileted val: ", onDeckSongsFiltered.length);
      if (onDeckSongsFiltered.length === 0) {
        if (onDeckSongsRef.current.length === 0) {
          setOnDeckSongs((prevSongs) => {
            if (!prevSongs) {
              return [draggedSong];
            }
            const s = [...prevSongs, draggedSong];
            onDeckSongsRef.current = s;
            return s;
          });
        } else {
          setOnDeckSongs((prevSongs) => {
            if (!prevSongs) {
              return [draggedSong];
            }

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

  // Deprecated
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
        if (!prevSongs) {
          return [draggedSong];
        }

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

  const getNextSong = (): SongProps => {
    console.log("Getting next song from: ", onDeckSongsRef.current);
    if (!onDeckSongsRef.current) return DEFAULT_SONG;
    if (onDeckSongsRef.current.length === 0) return DEFAULT_SONG;

    let nextSong = { ...onDeckSongsRef.current[0] } as SongProps;

    setOnDeckSongs(
      onDeckSongsRef.current.slice(1, onDeckSongsRef.current.length)
    );

    onDeckSongsRef.current = onDeckSongsRef.current.slice(
      1,
      onDeckSongsRef.current.length
    );

    if (!nextSong) nextSong = DEFAULT_SONG;
    return nextSong;
  };

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

  // Sets up a new player and set new current song
  // Sets up auto next on end of song.
  // Doesnt start playback
  const setNewPlayer = (
    playerName: string,
    newSong: SongProps,
    init = false
  ) => {
    return new Promise((res, rej) => {
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

        checkRemTime();
        if (playerName === PLAYERNAME_LEFT) {
          setLeftDuration(dur);
          leftSongRef.current = newSong;
          setLeftSong(newSong);
          leftPlayerRef.current = newPlayer;
          leftDurationRef.current = dur;
        } else {
          setRightDuration(dur);
          rightSongRef.current = newSong;
          setRightSong(newSong);
          rightPlayerRef.current = newPlayer;
          rightDurationRef.current = dur;
        }
        res("");
      });

      newPlayer.on("end", () => {
        masterNext();
      });
    });
  };

  const requestPlayLockRef = useRef(false);

  // Sets new player and calls masterNext
  // Feels like master Next should not be called because it calls autonext, which chooses a song
  // but it is working....
  const playRequestedSong = async (song: SongProps) => {
    if (requestPlayLockRef.current) return;
    requestPlayLockRef.current = true;
    console.log("playing request song: ", song);

    // Try everythiong from same function call?
    //restoreNonPlayingPlayerSongOnDeck

    if (currentPlayerNameRef.current && !masterNextButtonDisabled.current) {
      restoreNonPlayingPlayerSongOnDeck();
      removeOnDeckSong(song);

      if (currentPlayerNameRef.current == PLAYERNAME_LEFT) {
        await setNewPlayer(PLAYERNAME_RIGHT, song, false);
      }

      if (currentPlayerNameRef.current == PLAYERNAME_RIGHT) {
        await setNewPlayer(PLAYERNAME_LEFT, song, false);
      }

      // set after enxt is done and ready to play again
      //requestPlayLockRef.current = false
      masterNext();
    }
  };

  // Puts non playing Player's song back on deck
  const restoreNonPlayingPlayerSongOnDeck = () => {
    if (currentPlayerRef.current) {
      let songToGoOnDeck: SongProps | null = null;
      // Currently playing
      if (currentPlayerNameRef.current === PLAYERNAME_LEFT) {
        // Take the song from right player and put on deck
        songToGoOnDeck = rightSongRef.current;
      } else {
        songToGoOnDeck = leftSongRef.current;
      }

      console.log("restoring song: ", songToGoOnDeck);
      if (songToGoOnDeck) {
        addSongToTopOfOnDeck(songToGoOnDeck);
      }
    }
  };

  const addSongToTopOfOnDeck = (songToGoOnDeck: SongProps) => {
    if (onDeckSongsRef.current && onDeckSongsRef.current.length > 0) {
      const newSongs = [
        songToGoOnDeck,
        ...onDeckSongsRef.current,
      ] as SongProps[];
      setOnDeckSongs(newSongs);
      onDeckSongsRef.current = newSongs;
    } else {
      setOnDeckSongs([songToGoOnDeck as SongProps]);
      onDeckSongsRef.current = [songToGoOnDeck as SongProps];
    }
  };

  // Picks next song from onDeck and plays it on the waiting player
  // So the next song is played, then we get another song to load on the other player that is not currently playing.
  const autoNextSong = (playerName: string) => {
    console.log("AUTONEXTSONG called.");
    const nextSong = getNextSong();
    console.log("Playing next song from autoNextSong: ", nextSong);
    playNextSong(playerName, nextSong);
  };

  // Sets new player on requested player with requested song.
  // Sets balance and switches player (update currentPlayerRef)
  const playNextSong = (playerName: string, nextSong: SongProps) => {
    if (playerName === PLAYERNAME_LEFT) {
      slideBalance("right");
      rightPlayerRef.current?.play();
      setIsRightPlaying(true);
      setIsLeftPlaying(false);
      leftSongRef.current = nextSong;
      setLeftSong(nextSong);

      console.log("Setting left song for P1");
      setTimeout(async () => {
        switchCurrentPlayer(PLAYERNAME_RIGHT);
        leftPlayerRef.current?.unload();
        await setNewPlayer(playerName, nextSong);
      }, SLIDE_DURATION + 40);

      // play right track
    } else {
      slideBalance("left");
      leftPlayerRef.current?.play();
      setIsLeftPlaying(true);
      setIsRightPlaying(false);
      rightSongRef.current = nextSong;
      setRightSong(nextSong);

      console.log("Setting right song for LeftP2");

      setTimeout(async () => {
        switchCurrentPlayer(PLAYERNAME_LEFT);
        rightPlayerRef.current?.unload();
        await setNewPlayer(playerName, nextSong);
      }, SLIDE_DURATION + 40);
    }
  };

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

  // Calls autoNextSong and diables the next btn while transitioning between players...
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
        requestPlayLockRef.current = false;
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
  const removeOnDeckSong = (songToremove: SongProps) => {
    console.log("Removing: ", songToremove);

    if (!onDeckSongsRef.current) {
      return;
    }

    const newSongs = [...onDeckSongsRef.current];
    const fNewSongs = newSongs.filter((song) => {
      return song.fileName !== songToremove?.fileName;
    });
    onDeckSongsRef.current = fNewSongs;
    setOnDeckSongs(fNewSongs);

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

  const unconfirmedLoadSetlist = (unconfirmedSetlist: string) => {
    console.log(
      "unconfirmedLoadSetlist unconfirmedSetlist:",
      unconfirmedSetlist,
      setlists
    );

    let setlistIdx = 0;
    let c = 0;
    const allSetlists = [allSongsSetlist, ...setlistsRef.current];

    for (const sl of allSetlists) {
      if (sl.title == unconfirmedSetlist) {
        setlistIdx = c;
      }
      c++;
    }

    const setlist = allSetlists[setlistIdx];

    console.log("unconfirmedLoadSetlist ", setlist);
    if (setlist) {
      setOnDeckSongs(setlist.songs);
      onDeckSongsRef.current = setlist.songs;
      setCurSetListIdx(setlistIdx);
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
  const LG_BTN_SIZE = 140;

  return (
    <div
      id="pageRoot"
      style={{ background: "black" }}
      className="flex min-h-screen h-screen max-h-screen bg-slate-900 flex-col items-center justify-between ml-8 mr-8"
    >
      <audio id="audioPlayer" controls ref={micStreamRef}></audio>
      <div className="flex flex-col justify-center  w-full h-1/6 max-h-1/6 min-h-1/6 ">
        <div className="flex flex-col justify-center  w-full h-1/6 ">
          {/* Row Song Player */}

          <div className="flex  w-full">
            <div className="w-1/2">
              {leftSong ? (
                <SongPlayer
                  key={`${leftSong.src}_p1`}
                  setNewPlayer={setNewPlayer}
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
                  setNewPlayer={setNewPlayer}
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
          {/* Row Balance Slider */}
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
            {/* <p className="w-full text-center">
              Bal: {parseInt(balance.toString())}
            </p> */}
          </div>
        </div>
      </div>

      {/* Row On deck */}
      <div className="flex  items-center justify-center w-full space-x-12 max-h-5/6 min-h-5/6 h-5/6">
        <div className=" bg-neutral-800 text-rose-700 text-sm  w-1/2  rounded-md font-bold h-full">
          {/* Row Play/ Pause */}
          <div className="flex w-full justify-center items-center space-x-24 h-1/6">
            <CIcon
              icon={
                isLeftPlaying || isRightPlaying ? cilMediaPause : cilMediaPlay
              }
              height={LG_BTN_SIZE}
              width={LG_BTN_SIZE}
              color="#61DAFB"
              id="mainPlay"
              onClick={
                isLeftPlaying || isRightPlaying ? masterPause : masterPlay
              }
            />
            {/* {isLeftPlaying || isRightPlaying ? (
          ) : (
            <CIcon
              icon={cilMediaPlay}
              height={LG_BTN_SIZE}
              width={LG_BTN_SIZE}
              color="#61DAFB"
              id="mainPlay"
              onClick={masterPlay}
            />
          )} */}
            <CIcon
              icon={cilMediaSkipForward}
              height={LG_BTN_SIZE}
              width={LG_BTN_SIZE}
              color="#61DAFB"
              onClick={masterNext}
            />
          </div>

          <div className="flex w-full justify-center items-center space-x-24 h-5/6">
            {onDeckSongs ? (
              <SongListOnDeck
                createSetlistPage={false}
                songs={onDeckSongs}
                playRequestedSong={playRequestedSong}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragStartRearrangeDeck={onDragStartRearrangeDeck}
                onDragOverRearrangeDeck={onDragOverRearrangeDeck}
                onDropRearrangeDeck={onDropRearrangeDeck}
                confirmRemoveOnDeckSong={confirmRemoveOnDeckSong}
              />
            ) : (
              <></>
            )}
          </div>
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
              <CIcon
                icon={cilArrowLeft}
                size="lg"
                color="#61DAFB"
                onClick={() => {
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
                {!combinedSetlists ? (
                  <></>
                ) : (
                  combinedSetlists.map((setList: Setlist, idx: number) => {
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
                  })
                )}
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
              <CIcon
                icon={cilArrowRight}
                size="lg"
                color="#61DAFB"
                onClick={() => {
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
              return !setlist.songs ? (
                <div key={`${idx}_SongListSearchable`}></div>
              ) : (
                <SongListSearchable
                  key={`${idx}_SongListSearchable`}
                  playRequestedSong={playRequestedSong}
                  addSongToTopOfOnDeck={addSongToTopOfOnDeck}
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
        onAction={() => {
          if (rmOnDeckSong) removeOnDeckSong(rmOnDeckSong);
        }}
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
