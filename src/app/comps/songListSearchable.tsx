"use client";
import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  useLayoutEffect,
} from "react";

import { MD_BTN_SIZE, debounce, filter, filterOptions } from "../utils/utils";
import CIcon from "@coreui/icons-react";
import {
  cilMediaPause,
  cilMediaPlay,
  cilVerticalAlignBottom,
  cilVerticalAlignTop,
  cilX,
} from "@coreui/icons";

import CONFIG from "../../../config.json";

import {
  getFirestore,
  setDoc,
  collection,
  doc,
  deleteDoc,
} from "firebase/firestore/lite";
import fbApp from "../utils/firebase";
import ActionCancelModal from "./modals/ActionCancelModal";

const db = getFirestore(fbApp);

const SongListSearchable = ({
  songs,
  title,
  hidden,
  onDragStart,
  setNewPlayer,
  leftSong,
  leftPlayerRef,
  isLeftPlaying,
  confirmLoadSetlist,
  masterPause,
}: SongListSearchProps) => {
  const [filteredSongIdxs, setFilteredSongIdxs] = useState<number[]>([]);
  const [
    filteredSongNamesDecoratedStings,
    setFilteredSongNamesDecoratedStings,
  ] = useState<Map<string, string>>(new Map());

  // const [searchTerm, setSearchTerm] = useState("");

  useLayoutEffect(() => {
    if (!songs) return;
    setFilteredSongIdxs(
      Array.from(Array(songs.length).keys()).map((idx) => idx)
    );

    const packageNameMarks = new Map<string, string>();
    songs.forEach((song: SongProps) => {
      packageNameMarks.set(song.name ?? "", song.name ?? "");
    });
    setFilteredSongNamesDecoratedStings(packageNameMarks);
  }, [songs]);

  const filterText = (searchTerm: string): void => {
    console.log("Filtering: ", searchTerm);
    if (!searchTerm) {
      // reset to all results
      setFilteredSongIdxs(
        Array.from(Array(songs.length).keys()).map((idx) => idx)
      );
      const songNameMarks = new Map<string, string>();

      songs.forEach((song: SongProps) => {
        songNameMarks.set(song.name ?? "", song.name ?? "");
      });
      setFilteredSongNamesDecoratedStings(songNameMarks);
      return;
    }

    // Updates filtered data.
    const stringData = songs.map((song: SongProps) => song.name);
    // console.log("Filter text: ", searchTerm, stringData);
    const options: filterOptions = {
      word: false,
    };
    const { items, marks } = filter(searchTerm, stringData, options);
    // console.log("Filter results: ", marks);
    setFilteredSongIdxs(items);
    const songNameMarks = new Map<string, string>();
    items.forEach((filterIdx: number, idx: number) => {
      const app = songs[filterIdx];
      songNameMarks.set(app?.name ?? "", marks[idx] ?? "");
    });

    setFilteredSongNamesDecoratedStings(songNameMarks);
  };

  const debFilterText = debounce(filterText, 350);

  const filteredSongs = songs?.filter(
    (_, i: number) => filteredSongIdxs.indexOf(i) >= 0
  );

  const downloadSetlist = async () => {
    const setListCollection = collection(
      db,
      `setlists/${CONFIG["partyName"]}/setlists`
    );

    setDoc(doc(setListCollection, title), { title });

    const setListSongsCollection = collection(
      db,
      `setlists/${CONFIG["partyName"]}/setlists/${title}/songs`
    );

    const addDocPromises = songs.map((song) => {
      return setDoc(doc(setListSongsCollection, song.fileName), song);
    });

    try {
      await Promise.all(addDocPromises);
    } catch (err) {
      console.log("Error adding setlist: ", err);
    }
  };

  useEffect(() => {
    console.log("SongListSearchable setlist change", title);
  }, [title]);

  const [rmSong, setRmSong] = useState<SongProps | null>(null);
  const [showRmSong, setShowRmSong] = useState(false);

  const removeSong = async () => {
    if (!rmSong) return;
    const setlistName = title;
    const partyName = CONFIG["partyName"];
    console.log("Removing sonf from setlist", rmSong, setlistName);
    const songPath = `setlists/${CONFIG["partyName"]}/setlists/${setlistName}/songs/${rmSong.fileName}`;
    const songDoc = doc(db, songPath);
    try {
      let songIdx = -1;
      let c = 0;
      // Find song in songs and remove it
      for (const song of songs) {
        if (song.name === rmSong.name) {
          songIdx = c;
        }
        c++;
      }

      if (songIdx >= 0) {
        const removedSong = songs.splice(songIdx, 1);
        console.log("removedSong: ", removedSong);
      }

      await deleteDoc(songDoc);
      setShowRmSong(false);
    } catch (err) {
      console.log("Error removing song from setlist", err);
    }
  };

  return (
    <div
      className={`w-full h-full p-4 items-center flex flex-col ${
        hidden ? "hidden" : ""
      }`}
    >
      <div className="flex flex-col w-full justify-center">
        <p className="text-center">{title} </p>
        <div className="flex w-full justify-start">
          {confirmLoadSetlist ? (
            <div
              onClick={confirmLoadSetlist}
              className="cursor-pointer flex items-center"
            >
              <CIcon
                icon={cilVerticalAlignBottom}
                width={MD_BTN_SIZE * 1.5}
                className="bg-emerald-400 hover:bg-emerald-700 text-slate-200 font-bold pl-1 pr-1"
              />
              <p className="pl-2">Load</p>
            </div>
          ) : (
            <div
              onClick={downloadSetlist}
              className="cursor-pointer flex items-center"
            >
              <CIcon
                icon={cilVerticalAlignTop}
                width={MD_BTN_SIZE * 1.5}
                className="bg-emerald-400 hover:bg-emerald-700 text-slate-200 font-bold pl-1 pr-1"
              />
              <p className="pl-2">Upload To Firebase</p>
            </div>
          )}
        </div>
      </div>
      <div className="w-full flex justify-center m-4">
        <input
          type="text"
          placeholder="Search Song"
          className="w-3/4 bg-color-slate-300 text-neutral-500 pl-4 pt-1 pb-1"
          onChange={(ev: ChangeEvent<HTMLInputElement>) =>
            debFilterText(ev.target.value)
          }
        />
      </div>

      <div className="overflow-y-auto flex flex-col w-full p-1">
        {filteredSongs?.map((song, idx) => {
          const curDecorName = filteredSongNamesDecoratedStings.get(song.name);
          return song.name.startsWith("--") ? (
            <div key={`${idx}_mt`}></div>
          ) : (
            <div
              key={song.src}
              draggable
              onDragStart={(e) => onDragStart(e, song)}
              className="flex justify-between hover:bg-slate-600 border-b-1 border border-neutral-500 items-center"
            >
              <p
                key={`SLS_${song.src}`}
                className="p-4 "
                onClick={() => {
                  if (title === "All Songs") return;
                  setRmSong(song);
                  setShowRmSong(true);
                }}
                style={{ width: "100%" }}
                dangerouslySetInnerHTML={{
                  __html:
                    curDecorName && curDecorName.length > 0
                      ? curDecorName
                      : `${song.name} - ${song.src} `,
                }}
              ></p>
              {setNewPlayer ? (
                <div>
                  {isLeftPlaying &&
                  leftPlayerRef &&
                  leftPlayerRef?.current?.playing() &&
                  leftSong &&
                  leftSong.src === song.src ? (
                    <CIcon
                      icon={cilMediaPause}
                      width={MD_BTN_SIZE * 0.75}
                      className="mr-4 hover:text-emerald-700 cursor-pointer"
                      onClick={() => {
                        // setNewPlayer(song);
                        if (masterPause) masterPause();
                      }}
                    />
                  ) : (
                    <CIcon
                      icon={cilMediaPlay}
                      width={MD_BTN_SIZE * 0.75}
                      className="mr-4 hover:text-emerald-700 cursor-pointer"
                      onClick={() => {
                        // if (masterPause) masterPause();
                        setNewPlayer(song);

                        // if (leftPlayerRef) leftPlayerRef?.current?.play();
                      }}
                    />
                  )}
                </div>
              ) : (
                <></>
              )}
            </div>
          );
        })}
      </div>

      <ActionCancelModal
        isOpen={showRmSong}
        message={`Are you sure you want to remove "${rmSong?.name}" from ${title}`}
        onAction={removeSong}
        actionText="Remove"
        onClose={() => {
          setShowRmSong(false);
        }}
        key={`rmSL_${rmSong?.name}`}
        note={`${rmSong?.fileName}`}
        btnStyle="bg-rose-700 text-slate-200"
      />
    </div>
  );
};

export default SongListSearchable;
