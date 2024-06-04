import React, {
  ChangeEvent,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import {
  Button,
  ScrollView,
  Text,
  TextInput,
  TouchableHighlight,
  View,
} from "react-native";

import { collection, getDocs, getFirestore } from "firebase/firestore/lite";
import fbApp from "@root/firebase/firebaseApp";

import AsyncStorage from "@react-native-async-storage/async-storage";

import config from "@root/utils/config";
import { debounce, filter } from "@root/utils/helpers";

const db = getFirestore(fbApp);

const SongList: React.FC<{ sendSongToPlayer(song: SongProps): void }> = ({
  sendSongToPlayer,
}) => {
  const [songs, setSongs] = useState<SongProps[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const collectionPath = `music/${config["deviceName"]}/songs`;
    const getSongs = async () => {
      try {
        const songs = [] as SongProps[];
        const songRes = await getDocs(collection(db, collectionPath));
        songRes.docs.forEach((doc) => songs.push(doc.data() as SongProps));
        console.log("Songs:", songs);
        setSongs(songs);
      } catch (err) {
        console.log("err getting songs", err);
      }
    };

    getSongs()
      .then((res) => console.log(res))
      .catch((err) => console.log("err", err));
  }, []);

  const [filteredSongIdxs, setFilteredSongIdxs] = useState<number[]>([]);
  const [
    filteredSongNamesDecoratedStings,
    setFilteredSongNamesDecoratedStings,
  ] = useState<Map<string, string>>(new Map());

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

  return (
    <View style={{ flex: 15 }}>
      <View style={{ padding: 16 }}>
        <TextInput
          style={{
            width: "100%",
            backgroundColor: "black",
            color: "white",
            padding: 4,
          }}
          placeholder="Search"
          onChange={(ev) => {
            const data = ev.target as unknown as any;
            console.log("text: ", data.value);
            debFilterText(data.value);
          }}
        />
      </View>
      <ScrollView style={{ flex: 1, width: "100%" }}>
        {filteredSongs ? (
          filteredSongs.map((song, i) => {
            return (
              <View
                key={`${i}_songlist_song_${song.name}`}
                style={{
                  backgroundColor: "#2563eb",
                  padding: 8,
                  marginBottom: 3,
                }}
              >
                <TouchableHighlight
                  style={{ width: "100%", height: "100%" }}
                  onPress={() => {
                    console.log("Sending song to player: ", song);
                    sendSongToPlayer(song);
                  }}
                >
                  <Text style={{ color: "white" }}>{song.name}</Text>
                </TouchableHighlight>
              </View>
            );
          })
        ) : (
          <></>
        )}
      </ScrollView>
    </View>
  );
};

export default SongList;
