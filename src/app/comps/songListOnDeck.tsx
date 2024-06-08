"use client";
import React, { useState, useEffect, useRef } from "react";

import CIcon from "@coreui/icons-react";
import { cilX } from "@coreui/icons";
import { PLAYERNAME_LEFT, PLAYERNAME_RIGHT } from "../utils/utils";

const SongListOnDeck = ({
  songs,

  onDragOver,
  onDrop,
  onDragStartRearrangeDeck,
  onDragOverRearrangeDeck,
  onDropRearrangeDeck,
  confirmRemoveOnDeckSong,
  addOnDeckToNewSetlist,
  currentPlayerNameRef,
  setNewMultiPlayer,
  playRequestedSong,
}: SongListOnDeckProps) => {
  const [setlistName, setSetlistName] = useState("");

  const loadSongFromTouch = (song: SongProps) => {
    if (playRequestedSong) {
      playRequestedSong(song);
    }
  };

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleTouchStart = (event: any, song: SongProps) => {
    timeoutRef.current = setTimeout(() => {
      console.log("Playing song handleTouchStart: ", song.name);
      loadSongFromTouch(song);
    }, 3000);
  };

  const handleTouchEnd = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleDoubleClick = (song: SongProps) => {
    console.log("Playing song handleDoubleClick: ", song.name);
    loadSongFromTouch(song);
  };

  return (
    <div className="w-full h-full pl-4 pr-4 items-center flex flex-col ">
      <div className="flex w-full justify-between">
        <div className="flex content-center items-center">
          <p>On deck </p>
        </div>
        {addOnDeckToNewSetlist ? (
          <div className="flex">
            <input
              placeholder="New setlist name"
              value={setlistName}
              onChange={(ev) => setSetlistName(ev.target.value)}
            />
            <button
              className="text-cyan-400 hover:text-cyan-700 p-2"
              onClick={() => {
                if (setlistName) {
                  addOnDeckToNewSetlist(setlistName);
                }
              }}
            >
              + Create new setlist
            </button>
          </div>
        ) : (
          <></>
        )}
      </div>

      <div
        className="h-1/6 w-full bg-slate-500 flex justify-center items-center"
        onDragOver={(e) => {
          onDragOver(e);
          onDragOverRearrangeDeck(e);
        }}
        onDrop={(e) => {
          onDrop(e, 0);
          onDropRearrangeDeck(e, 0);
        }}
      >
        <p className="text-center justify-center items-center  text-sm text-slate-700 tracking-wide">
          Drop Zone - Next Song
        </p>
      </div>
      <div className="h-4/6 overflow-y-auto flex flex-col w-full ">
        {songs?.map((song, idx) => {
          return song.name.startsWith("--") ? (
            <div key={`${idx}_mt`}></div>
          ) : (
            <div
              className="group flex justify-between  border-b-1 border border-neutral-500"
              onClick={() => {}}
              key={`${idx}_rmondeck`}
            >
              <div
                className="p-4 w-11/12 hover:bg-slate-600 "
                key={`SLOD_${song.src}`}
                draggable
                onDragStart={(e) => {
                  onDragStartRearrangeDeck(e, song, idx);
                }}
                onDragOver={(e) => {
                  onDragOver(e);
                  onDragOverRearrangeDeck(e);
                }}
                onDrop={(e) => {
                  onDrop(e, idx);
                  onDropRearrangeDeck(e, idx);
                }}
                // onTouchStart={(e) => handleTouchStart(e, song)}
                // onTouchEnd={(e) => handleTouchEnd()}
                onDoubleClick={(e) => handleDoubleClick(song)}
              >
                <p className="text-slate-300">{song.name}</p>
                <p>{song.artist}</p>
              </div>
              <div className="w-1/12 justify-center content-center flex items-center align-middle">
                <CIcon
                  icon={cilX}
                  size="xl"
                  onClick={() => confirmRemoveOnDeckSong(song)}
                  className=" hidden group-hover:block"
                  color="#be123c"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="h-1/6 w-full bg-slate-500 flex justify-center items-center"
        onDragOver={(e) => {
          onDragOver(e);
          onDragOverRearrangeDeck(e);
        }}
        onDrop={(e) => {
          onDrop(e, songs.length);
          onDropRearrangeDeck(e, songs.length);
        }}
      >
        <p className="text-center justify-center items-center text-sm text-slate-700 tracking-wide">
          Drop Zone - Last Song
        </p>
      </div>
    </div>
  );
};

export default SongListOnDeck;
