"use client";
import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  useLayoutEffect,
} from "react";
import { debounce, filter, filterOptions } from "../utils/utils";

const SongListSearchable = ({ songs, onDragStart }: SongListSearchProps) => {
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

  return (
    <div className="w-full h-full p-4 items-center flex flex-col ">
      <div className="">
        <p>All Songs </p>
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
            <p
              key={`SLS_${song.src}`}
              className="p-4 hover:bg-slate-600 border-b-1 border border-neutral-500"
              draggable
              onDragStart={(e) => onDragStart(e, song)}
              dangerouslySetInnerHTML={{
                __html:
                  curDecorName && curDecorName.length > 0
                    ? curDecorName
                    : `${song.name} - ${song.src} `,
              }}
            ></p>
          );
        })}
      </div>
    </div>
  );
};

export default SongListSearchable;
