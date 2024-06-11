"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

import { Howl } from "howler";
import fbApp from "../utils/firebase";
import SongListSearchable from "./../comps/songListSearchable";
import SongListOnDeck from "./../comps/songListOnDeck";
import config from "../../../config.json";

import CIcon from "@coreui/icons-react";
import {
  cilMediaPlay,
  cilMediaPause,
  cilArrowLeft,
  cilArrowRight,
  cilX,
} from "@coreui/icons";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
} from "firebase/firestore/lite";
import { User, getAuth, signInAnonymously } from "firebase/auth";

import ActionCancelModal from "./../comps/modals/ActionCancelModal";
import { DEFAULT_SONG, MD_BTN_SIZE, getSongs } from "../utils/utils";

/**
 *
 *  wma does not work!
 *   MetalMan.wma
 *
 */

const db = getFirestore(fbApp);
const auth = getAuth(fbApp);
const host = config["host"];
const partyName = config["partyName"];

const Home = () => {
  const leftPlayerRef = useRef<Howl | null>();
  const [leftSong, setLeftSong] = useState<SongProps | null>(null);
  // const [leftMusicVolume, setLeftMusicVolume] = useState(50);
  const [leftDuration, setLeftDuration] = useState(0);
  const leftDurationRef = useRef(0);
  const [isLeftPlaying, setIsLeftPlaying] = useState(false);

  const [user, setUser] = useState<User | null>(null);

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
        .then((creds) => {
          console.log("Signing in res: ", creds);
          setUser(creds.user);
        })
        .catch((err) => {
          console.log("Error signing in!");
        });
    }
    return () => unsub();
  }, [user]);

  const setNewPlayer = (newSong: SongProps) => {
    console.log(
      "Attempting Loading new song and player",
      leftPlayerRef.current?.state()
    );
    console.log(newSong, leftSong?.src);

    if (!newSong) return;

    if (
      newSong.src === leftSong?.src &&
      leftPlayerRef &&
      leftPlayerRef.current
    ) {
      console.log("Requested same song, Not starting new player!");

      if (leftPlayerRef.current?.playing()) {
        console.log("Pausing because audio is playing");
        setIsLeftPlaying(false);
        return leftPlayerRef.current?.pause();
      } else if (!leftPlayerRef.current?.playing()) {
        console.log("Resuming");
        setIsLeftPlaying(true);
        return leftPlayerRef.current?.play();
      }
    }

    if (leftPlayerRef.current && leftPlayerRef.current.state() === "loaded") {
      console.log("Stopping current player and resetting");
      leftPlayerRef.current.pause();
      setIsLeftPlaying(false);
      leftPlayerRef.current.unload();
      leftPlayerRef.current = null;
    }

    const newPlayer = new Howl({
      src: newSong.src,
      html5: true, // Allows playing from a file/blob
    });
    leftPlayerRef.current = newPlayer;
    console.log("Loading new song", leftPlayerRef.current.state());

    leftPlayerRef.current.once("load", () => {
      const dur = newPlayer.duration();
      console.log("new Song loaded", dur);
      setLeftDuration(dur);
      leftDurationRef.current = dur;

      try {
        console.log("pressin play");
        leftPlayerRef?.current?.play();
        setLeftSong(newSong);
        setIsLeftPlaying(true);
      } catch (err) {
        console.log("Error playing new song: ", err);
      }
    });
  };

  const [onDeckSongs, setOnDeckSongs] = useState([] as SongProps[]);
  const [allSongs, setAllSongs] = useState<SongProps[] | null>(null);

  useEffect(() => {
    getSongs().then((songs) => {
      console.log("Init load for songs!!");
      setAllSongs(songs);
      allSongsSetlistRef.current.songs = songs;
    });
  }, []);

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

  const allSongsSetlistRef = useRef({
    title: "All Songs",
    songs: allSongs,
    order: 0,
  });

  const addOnDeckToNewSetlist = (title: string) => {
    if (onDeckSongs.length > 0) {
      console.log("Adding onDeck to setlistFileNames");
      const newSetlists = [
        ...(setlistFileNames ?? ([] as Setlist[])),
        { title, songs: onDeckSongs },
      ] as Setlist[];
      setSetlistFileNames(newSetlists);
      setOnDeckSongs([]);
    }
  };

  useEffect(() => {
    const setListPath = `setlists/${partyName}/setlists`;
    console.log("loading setlists: ", setListPath);
    const _ = async () => {
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

          return {
            title: doc.id,
            order: idx,
            songs: allSongs,
          } as Setlist;
        })
      );

      console.log("Setting setlists: ", allSetlists);
      allSetlists.sort((a, b) => (a.order > b.order ? 1 : -1));

      setSetlistFileNames([allSongsSetlistRef.current, ...allSetlists]);
      // setlistsRef.current = allSetlists;
    };
    _().then(() => {});
  }, []);

  const [rmSetlist, setRmSetlist] = useState("");

  const removeSetlist = async () => {
    console.log("Removing setlist: ", rmSetlist, setlistFileNames);

    if (rmSetlist && rmSetlist != "All Songs") {
      const setlists = setlistFileNames ?? ([] as Setlist[]);

      // Get setlist index by name

      let slIdx = 1; // skip "All Songs"
      let c = 1;
      for (const sl of setlists) {
        if (sl.title === rmSetlist) {
          slIdx = c;
        }
        c++;
      }
      console.log("Removing setlist idx: ", slIdx);
      const newSetlist = [
        ...setlists.slice(0, slIdx - 1), // mins 1 because we manually add allsongs to index 0
        ...setlists.slice(slIdx, setlists.length),
      ];
      console.log("NewSetList after remove: ", setlists, newSetlist);

      // Delete collection at `setlists/${partyName}/setlists/${setlistName}/songs`;
      // Delete doc at `setlists/${partyName}/setlists/${setlistName}`;
      const setListPath = `setlists/${partyName}/setlists/${rmSetlist}/songs`;
      const setListDocPath = `setlists/${partyName}/setlists/${rmSetlist}`;
      const songCollection = collection(db, setListPath);
      const setlistDoc = doc(db, setListDocPath);
      const songDocs = await getDocs(songCollection);

      try {
        const songDocDeletePromises = [] as Promise<void>[];
        songDocs.docs.forEach((doc) => {
          songDocDeletePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(songDocDeletePromises);
        await deleteDoc(setlistDoc);
      } catch (err) {
        console.log("Error removing setlist from firebase: ", err);
      }

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
            <CIcon
              icon={cilMediaPause}
              width={MD_BTN_SIZE * 2}
              color="#61DAFB"
              onClick={masterPause}
            />
          ) : (
            <CIcon
              icon={cilMediaPlay}
              width={MD_BTN_SIZE * 2}
              color="#61DAFB"
              onClick={masterPlay}
            />
          )}
        </div>
      </div>

      <div className="flex  items-center justify-center w-full space-x-12 max-h-5/6 min-h-5/6 h-5/6">
        <div className=" bg-neutral-800 text-rose-700 text-sm  w-1/2  rounded-md font-bold h-full">
          <SongListOnDeck
            createSetlistPage={true}
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
              <CIcon
                icon={cilArrowLeft}
                size="xl"
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
                {setlistFileNames ? (
                  setlistFileNames.map((setlist: Setlist, idx: number) => {
                    return (
                      <div
                        key={`${idx}_setlist`}
                        className={`flex items-center ${
                          idx === curSetListIdx
                            ? "text-rose-700"
                            : "text-neutral-400"
                        } p-4 border-b-2 ${
                          idx === curSetListIdx
                            ? "border-rose-700"
                            : "border-neutral-400"
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
                        <div>
                          {setlist.title !== "All Songs" ? (
                            <CIcon
                              icon={cilX}
                              size="xl"
                              color="#be123c"
                              onClick={() => {
                                setRmSetlist(setlist.title);
                                setShowRemoveSetlist(true);
                              }}
                            />
                          ) : (
                            <></>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <></>
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
                size="xl"
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
            {setlistFileNames ? (
              setlistFileNames.map((setlist: Setlist, idx: number) => {
                return !setlist.songs ? (
                  <></>
                ) : (
                  <SongListSearchable
                    hidden={idx !== curSetListIdx}
                    key={`${setlist.title}_setlist_${idx}`}
                    title={setlist.title}
                    songs={setlist.songs}
                    onDragStart={onDragStart}
                    setNewPlayer={setNewPlayer}
                    masterPause={masterPause}
                    leftPlayerRef={leftPlayerRef}
                    leftSong={leftSong}
                    isLeftPlaying={isLeftPlaying}
                  />
                );
              })
            ) : (
              <></>
            )}
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
        message={`Are you sure you want to remove "${rmSetlist}"`}
        onAction={removeSetlist}
        actionText="Remove"
        onClose={() => {
          setShowRemoveSetlist(false);
        }}
        key={`rmSL_${rmSetlist}`}
        note={`${rmSetlist}`}
        btnStyle="bg-rose-700 text-slate-200"
      />
    </div>
  );
};

export default Home;
