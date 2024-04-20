"use client";
import React, {
  useState,
  useEffect,
  ChangeEvent,
  useRef,
  useCallback,
} from "react";
import { Howl } from "howler";
import SongPlayer from "./../comps/SongPlayer";
import SongList from "./../comps/songListSearchable";
import SongListSearchable from "./../comps/songListSearchable";
import SongListOnDeck from "./../comps/songListOnDeck";
import config from "../../../config.json";
import {
  UilPlayCircle,
  UilPauseCircle,
  UilSkipForwardAlt,
  UilArrowLeft,
  UilArrowRight,
} from "@iconscout/react-unicons";
import ActionCancelModal from "./../comps/modals/ActionCancelModal";

/**
 *
 *  wma does not work!
 *   MetalMan.wma
 *
 */

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

const Home = () => {
  const leftPlayerRef = useRef<Howl | null>();
  const [leftSong, setLeftSong] = useState<SongProps | null>(null);
  const [leftMusicVolume, setLeftMusicVolume] = useState(50);
  const [leftDuration, setLeftDuration] = useState(0);
  const leftDurationRef = useRef(0);
  const [isLeftPlaying, setIsLeftPlaying] = useState(false);

  const setNewPlayer = (newSong: SongProps) => {
    console.log("Attempting Loading new song and player");
    console.log(newSong.src, leftSong?.src);

    if (!newSong) return;

    if (newSong.src === leftSong?.src) {
      if (leftPlayerRef.current?.playing()) {
        setIsLeftPlaying(false);
        return leftPlayerRef.current?.pause();
      } else if (!leftPlayerRef.current?.playing()) {
        setIsLeftPlaying(true);
        return leftPlayerRef.current?.play();
      }
    }

    if (leftPlayerRef.current) {
      leftPlayerRef.current.pause();
      setIsLeftPlaying(false);
      leftPlayerRef.current.unload();
    }

    const newPlayer = new Howl({
      src: newSong.src,
      html5: true, // Allows playing from a file/blob
    });

    newPlayer?.once("load", function () {
      const dur = newPlayer.duration();

      setLeftDuration(dur);
      leftPlayerRef.current = newPlayer;
      leftDurationRef.current = dur;
    });

    newPlayer.play();
    setLeftSong(newSong);
    setIsLeftPlaying(true);
  };

  const [onDeckSongs, setOnDeckSongs] = useState([] as SongProps[]);
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

  useEffect(() => {}, []);

  // useEffect(() => {}, [leftSong.src, rightSong.src]);

  const masterPlay = () => {
    if (leftPlayerRef.current && !leftPlayerRef.current?.playing()) {
      setIsLeftPlaying(true);
      leftPlayerRef.current?.play();
      console.log("Master Play Left");
    }
  };

  const masterPause = () => {
    if (leftPlayerRef.current && leftPlayerRef.current?.playing()) {
      setIsLeftPlaying(false);
      leftPlayerRef.current?.pause();
      console.log("Master Pause Left");
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

  const [setlistFileNames, setSetlistFileNames] = useState<Setlists>();

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
    songs: allSongs,
    order: 0,
  };

  const combinedSetlists = [
    allSongsSetlist,
    ...(setlistFileNames?.files ?? ([] as Setlist[])),
  ];

  const addOnDeckToNewSetlist = (title: string) => {
    if (onDeckSongs.length > 0) {
      console.log("Adding onDeck to setlistFileNames");
      const newSetlists = [
        ...(setlistFileNames?.files ?? ([] as Setlist[])),
        { title, songs: onDeckSongs },
      ] as Setlist[];
      setSetlistFileNames({ files: newSetlists });
      setOnDeckSongs([]);
    }
  };

  const [rmSetlist, setRmSetlist] = useState<number>(0);
  const removeSetlist = () => {
    console.log("Removing setlist: ", rmSetlist);
    if (rmSetlist !== 0) {
      const setlists = setlistFileNames?.files ?? ([] as Setlist[]);
      const newSetlist = {
        files: [
          ...setlists.slice(0, rmSetlist - 1), // mins 1 because we manually add allsongs to index 0
          ...setlists.slice(rmSetlist, setlists.length),
        ],
      };
      console.log("NewSetList after remove: ", setlists, newSetlist);
      setSetlistFileNames(newSetlist);
      setShowRemoveSetlist(false);
      setCurSetListIdx(0);
    }
  };

  const [showRemoveSetlist, setShowRemoveSetlist] = useState(false);

  return (
    <div
      id="pageRoot"
      className="flex min-h-screen h-screen max-h-screen  flex-col items-center justify-between ml-8 mr-8"
    >
      <div className="flex flex-col justify-center  w-full h-1/6 max-h-1/6 min-h-1/6 ">
        <div className="flex w-full justify-center items-center space-x-24 h-3/6">
          {isLeftPlaying ? (
            <UilPauseCircle size="120" color="#61DAFB" onClick={masterPause} />
          ) : (
            <UilPlayCircle size="120" color="#61DAFB" onClick={masterPlay} />
          )}
        </div>
      </div>

      <div className="flex  items-center justify-center w-full space-x-12 max-h-5/6 min-h-5/6 h-5/6">
        <div className=" bg-neutral-800 text-rose-700 text-sm  w-1/2  rounded-md font-bold h-full">
          <SongListOnDeck
            songs={onDeckSongs}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragStartRearrangeDeck={onDragStartRearrangeDeck}
            onDragOverRearrangeDeck={onDragOverRearrangeDeck}
            onDropRearrangeDeck={onDropRearrangeDeck}
            confirmRemoveOnDeckSong={confirmRemoveOnDeckSong}
            addOnDeckToNewSetlist={addOnDeckToNewSetlist}
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
                {combinedSetlists.map((setlist: Setlist, idx: number) => {
                  return (
                    <div
                      key={`${idx}_setlist`}
                      className={`flex items-center ${
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
                        {setlist.title}
                      </p>
                      {setlist.title !== "All Songs" ? (
                        <div
                          className="w-[15px] h-[15px] bg-red-500"
                          onClick={() => {
                            setRmSetlist(idx);
                            setShowRemoveSetlist(true);
                          }}
                        ></div>
                      ) : (
                        <></>
                      )}
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
                  setNewPlayer={setNewPlayer}
                  leftPlayerRef={leftPlayerRef}
                  leftSong={leftSong}
                  isLeftPlaying={isLeftPlaying}
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
        isOpen={showRemoveSetlist}
        message={`Are you sure you want to remove "${
          setlistFileNames?.files[rmSetlist - 1]?.title
        }"`}
        onAction={removeSetlist}
        actionText="Remove"
        onClose={() => {
          setShowRemoveSetlist(false);
        }}
        key={`rmSL_${setlistFileNames?.files[rmSetlist - 1]?.title}`}
        note={`${setlistFileNames?.files[rmSetlist - 1]?.title}`}
        btnStyle="bg-rose-700 text-slate-200"
      />
    </div>
  );
};

export default Home;
