"use client";
import React, { useState, useEffect, ChangeEvent, useRef } from "react";
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
} from "@iconscout/react-unicons";
import ActionCancelModal from "./comps/modals/ActionCancelModal";

/**
 *
 *  wma does not work!
 *   MetalMan.wma
 *
 */

export const btnStyle = "w-[50px] bg-purple-700 mr-6";

function cleanSongSource(songSrc: string): string {
  return encodeURIComponent(songSrc);
}
const host = config["host"];
const DEFAULT_SONG = {
  name: "Track 8",
  src: `http://${host}:3001/${cleanSongSource("Track 8.wav")}`,
};

const songs: SongProps[] = [
  {
    name: "Track5 This is a really long track name that should be truncated and not be long that roughly seventy- two charactes",
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
      const onDeckSongsFiltered = onDeckSongs.filter((onDeckSong) => {
        return onDeckSong.src === draggedSong.src;
      });

      console.log("Fileted val: ", onDeckSongsFiltered.length);
      if (onDeckSongsFiltered.length === 0) {
        if (onDeckSongs.length === 0) {
          setOnDeckSongs((prevSongs) => [...prevSongs, draggedSong]);
        } else {
          setOnDeckSongs((prevSongs) => [
            ...prevSongs.slice(0, dropIndex),
            draggedSong,
            ...prevSongs.slice(dropIndex),
          ]);
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
        return newSongs;
      });
    } catch (err) {
      console.log("Error on drop: ", err);
    }
  };

  //TODO() return next song based on generated setlist
  const getNextSong = () => {
    console.log("Getting next song");
    const nextSong = { ...onDeckSongs[0] };
    setOnDeckSongs(onDeckSongs.slice(1, onDeckSongs.length));
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
    if (!leftPlayerRef.current) {
      const nextLeftSong = getNextSong();
      setNewPlayer(PLAYERNAME_LEFT, nextLeftSong, true);
      if (!leftSong) setLeftSong(nextLeftSong);
    }

    if (!rightPlayerRef.current) {
      const nextRightSong = getNextSong();
      setNewPlayer(PLAYERNAME_RIGHT, nextRightSong);
      if (!rightSong) setRightSong(nextRightSong);
    }
  }, []);

  const autoNextSong = (playerName: string) => {
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
      return newSongs.filter((song) => song.src !== rmOnDeckSong?.src);
    });

    setShowRemoveOnDeckSong(false);
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

      <div className="flex  items-center justify-center w-full space-x-12 max-h-3/6 min-h-3/6 h-3/6">
        <div className=" bg-neutral-800 text-rose-700 text-sm  w-full  rounded-md font-bold h-full">
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

        <div className=" bg-neutral-800 w-full text-emerald-300 text-sm font-bold h-full rounded-md ">
          <SongListSearchable songs={allSongs} onDragStart={onDragStart} />
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
    </div>
  );
};

export default Home;
