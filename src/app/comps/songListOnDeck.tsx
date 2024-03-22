"use client";
import React, { useState, useEffect, useRef } from "react";
import { UilMultiply } from "@iconscout/react-unicons";

const SongListOnDeck = ({
  songs,

  onDragOver,
  onDrop,
  onDragStartRearrangeDeck,
  onDragOverRearrangeDeck,
  onDropRearrangeDeck,
  confirmRemoveOnDeckSong,
  addOnDeckToNewSetlist,
}: SongListOnDeckProps) => {
  const [setlistName, setSetlistName] = useState("");
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
        {songs.map((song, idx) => {
          return (
            <div
              className="group flex justify-between  border-b-1 border border-neutral-500"
              onClick={() => confirmRemoveOnDeckSong(song)}
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
              >
                <p>{song.name}</p>
                <p>{song.src}</p>
              </div>
              <div className="w-1/12 justify-center content-center flex items-center align-middle">
                <UilMultiply
                  onClick={() => confirmRemoveOnDeckSong(song)}
                  className=" hidden group-hover:block"
                  size="35"
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
