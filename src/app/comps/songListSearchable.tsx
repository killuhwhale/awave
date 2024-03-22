"use client";
import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  useLayoutEffect,
} from "react";
import { UilPlayCircle, UilPauseCircle } from "@iconscout/react-unicons";
import { debounce, filter, filterOptions } from "../utils/utils";

const SongListSearchable = ({
  songs,
  title,
  hidden,
  onDragStart,
  setNewPlayer,
  leftSong,
  leftPlayerRef,
  isLeftPlaying,
}: SongListSearchProps) => {
  const [filteredSongIdxs, setFilteredSongIdxs] = useState<number[]>([]);
  const [
    filteredSongNamesDecoratedStings,
    setFilteredSongNamesDecoratedStings,
  ] = useState<Map<string, string>>(new Map());

  const [searchTerm, setSearchTerm] = useState("");

  useLayoutEffect(() => {
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

  const filteredSongs = songs.filter(
    (_, i: number) => filteredSongIdxs.indexOf(i) >= 0
  );

  const downloadSetlist = () => {
    const jsonString = JSON.stringify(
      {
        title,
        songs: songs.map((song) => {
          const obj = { ...song } as any;
          delete obj["src"];
          return obj;
        }),
      },
      null,
      2
    );

    // Create a Blob with the JSON content
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create a URL for the blob
    const blobURL = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger the download
    const anchorElement = document.createElement("a");
    anchorElement.href = blobURL;
    anchorElement.download = `${title}_setlist.json`;

    // Append the anchor element to the body, click it, and then remove it
    document.body.appendChild(anchorElement); // Required for Firefox
    anchorElement.click();
    document.body.removeChild(anchorElement);

    // Release the blob URL
    URL.revokeObjectURL(blobURL);
  };

  return (
    <div
      className={`w-full h-full p-4 items-center flex flex-col ${
        hidden ? "hidden" : ""
      }`}
    >
      <div className="">
        <p>{title} </p>
        <p className="cursor-pointer" onClick={downloadSetlist}>
          Download
        </p>
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
        {filteredSongs.map((song) => {
          const curDecorName = filteredSongNamesDecoratedStings.get(song.name);
          return (
            <div
              draggable
              onDragStart={(e) => onDragStart(e, song)}
              className="flex justify-between hover:bg-slate-600 border-b-1 border border-neutral-500 items-center"
            >
              <p
                key={`SLS_${song.src}`}
                className="p-4 "
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
                    <UilPauseCircle
                      className="mr-4 hover:text-emerald-700 cursor-pointer"
                      size="40"
                      onClick={() => {
                        setNewPlayer(song);
                      }}
                    />
                  ) : (
                    <UilPlayCircle
                      className="mr-4 hover:text-emerald-700 cursor-pointer"
                      size="40"
                      onClick={() => {
                        setNewPlayer(song);
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
    </div>
  );
};

export default SongListSearchable;
