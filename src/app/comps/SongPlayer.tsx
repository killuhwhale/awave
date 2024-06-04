"use client";
import React, { useEffect } from "react";

import CIcon from "@coreui/icons-react";
import { cilMediaPlay } from "@coreui/icons";
import { MD_BTN_SIZE, SongProp } from "../utils/utils";

const SongPlayer = ({
  song,
  bgColor,
  musicVol,
  playerName,
  duration,
  durationRef,
  isPlaying,
  setIsPlaying,
  playerRef,
  nextSong,
  setNewPlayer,
}: SongPlayerProps) => {
  useEffect(() => {
    playerRef.current?.volume(musicVol);
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      const timeRemaining =
        durationRef.current - (playerRef.current?.seek() ?? 0);
      //   console.log("Time left:  ", timeRemaining);

      if (timeRemaining < 9 && isPlaying) {
        console.log("Play next song.");
        // Tell parent to play the next Song.
        nextSong(playerName);
      }
    }, 1000); // 1000 milliseconds = 1 second

    // Clear the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const play = () => {
    if (playerRef.current && !playerRef.current.playing()) {
      const id = playerRef.current.play();
      setIsPlaying(true);
      console.log(`Playing: ${song.name}`, playerRef.current.playing());
    }
  };

  const pause = () => {
    if (playerRef.current) {
      playerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const loadSong = (song: SongProps) => {
    console.log("Loading song: ", song);
    setNewPlayer(playerName, song, false);
  };

  const onDrop = (e: any) => {
    e.preventDefault();
    const dragType = e.dataTransfer.getData("type");
    console.log("Drag type: ", dragType, typeof dragType);
    if (["0", "1"].indexOf(dragType) == -1) return;

    try {
      const draggedSong = JSON.parse(
        e.dataTransfer.getData("song")
      ) as SongProps;
      console.log("draggedSong:", draggedSong);
      loadSong(draggedSong);
    } catch (err) {
      console.log("erro getting dragged song: ", err);
    }
  };

  const onDragOver = (e: any) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  return (
    <div
      className={`p-8 justify-center items-center flex h-full whitespace-nowrap text-center  text-ellipsis ${bgColor}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div>
        <div className="w-full justify-center items-center">
          <div className="h-[42px] mb-2">
            {isPlaying ? (
              <CIcon
                icon={cilMediaPlay}
                height={MD_BTN_SIZE}
                width={MD_BTN_SIZE}
                className="text-center w-full"
                color="#61DAFB"
              />
            ) : (
              <p className="font-extralight">Up next...</p>
            )}
          </div>
          <p>
            {song.name.slice(0, 26)}
            {song.name.length > 26 ? "..." : ""}
          </p>
          <p>
            <span className="text-rose-700 font-bold">
              {" "}
              {song.album?.slice(0, 15)}
              {song.album && song.album.length > 15 ? "..." : ""}{" "}
            </span>
            {song.album ? ` - ` : ``}
            <span className="text-cyan-400 font-bold">
              {" "}
              {song.artist?.slice(0, 20)}{" "}
              {song.artist && song.artist.length > 15 ? "..." : ""}
            </span>
            {song.artist ? `  ` : ``}
            <span className="text-emerald-400 font-bold"> ({duration}) </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SongPlayer;
