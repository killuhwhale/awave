import React, {
  ChangeEvent,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import {
  Button,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  View,
  VirtualizedList,
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

  useEffect(() => {
    const collectionPath = `music/${config["deviceName"]}/songs`;
    const getSongs = async () => {
      try {
        const songs = [] as SongProps[];
        const songRes = await getDocs(collection(db, collectionPath));
        songRes.docs.forEach((doc) => {
          const songChunk = JSON.parse(
            (doc.data() as Map<string, string>)["songs"]
          ) as Map<string, string>;
          console.log("songChunk", songChunk);

          songs.push(...Object.values(songChunk));
        });
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

  const [searchByArtist, setSearchByArtist] = useState(false);

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
    const stringData = songs.map((song: SongProps) => {
      if (searchByArtist) return song.artist ?? song.name;
      return song.name;
    });

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
      <Text style={{ color: "white", fontWeight: "bold", fontSize: 36 }}>
        Music
      </Text>
      <View style={{ padding: 16, alignItems: "center" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Text
            onPress={() => setSearchByArtist(!searchByArtist)}
            style={{
              color: searchByArtist ? "white" : "#60a5fa",
              marginLeft: 8,
              fontWeight: "bold",
              marginRight: 8,
            }}
          >
            Song
          </Text>

          <Switch
            value={searchByArtist}
            onValueChange={setSearchByArtist}
            trackColor={{ false: "white", true: "white" }}
            ios_backgroundColor="white"
            thumbColor={searchByArtist ? "#3b82f6" : "#60a5fa"}
          />

          <Text
            onPress={() => setSearchByArtist(!searchByArtist)}
            style={{
              color: searchByArtist ? "#3b82f6" : "white",
              marginLeft: 8,
              fontWeight: "bold",
              marginRight: 8,
            }}
          >
            Artist
          </Text>
        </View>

        <TextInput
          style={{
            backgroundColor: "black",
            color: "white",
            padding: 8,
            width: "75%",
            borderRadius: 8,
          }}
          placeholder={
            searchByArtist ? "Search by Artist" : "Search by Song Name"
          }
          onChange={(ev) => {
            const data = ev.target as unknown as any;
            console.log("text: ", data.value);
            debFilterText(data.value);
          }}
        />
      </View>

      <View style={{ flex: 5, width: "100%" }}>
        {filteredSongs ? (
          <VirtualizedList<SongProps>
            data={filteredSongs}
            initialNumToRender={12}
            renderItem={({ item, index }) => {
              const song = item as SongProps;
              return (
                <View
                  style={{
                    backgroundColor: "#2563eb",
                    padding: 8,
                    marginBottom: 8,
                    borderRadius: 8,
                  }}
                >
                  <TouchableHighlight
                    style={{ width: "100%", height: "100%" }}
                    onPress={() => {
                      console.log("Sending song to player: ", song);
                      sendSongToPlayer(song);
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        marginLeft: 8,
                        fontWeight: "bold",
                      }}
                    >
                      {song.name}

                      <Text
                        style={{
                          color: "grey",
                          marginLeft: 8,
                          fontWeight: "bold",
                        }}
                      >
                        {song.artist ? ` - ${song.artist}` : ""}
                      </Text>
                    </Text>
                  </TouchableHighlight>
                </View>
              );
            }}
            keyExtractor={(item, index) =>
              `${index}_songlist_song_${item.name}`
            }
            getItemCount={() => filteredSongs.length}
            getItem={(item, index) => {
              return filteredSongs[index] as SongProps;
            }}
          />
        ) : (
          <></>
        )}
      </View>
      <ScrollView style={{ flex: 1, width: "100%" }}>
        {/* {filteredSongs ? (
          filteredSongs.map((song, i) => {
            return (
              <View
                key={`${i}_songlist_song_${song.name}`}
                style={{
                  backgroundColor: "#2563eb",
                  padding: 8,
                  marginBottom: 8,
                  borderRadius: 8,
                }}
              >
                <TouchableHighlight
                  style={{ width: "100%", height: "100%" }}
                  onPress={() => {
                    console.log("Sending song to player: ", song);
                    sendSongToPlayer(song);
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      marginLeft: 8,
                      fontWeight: "bold",
                    }}
                  >
                    {song.name}
                  </Text>
                </TouchableHighlight>
              </View>
            );
          })
        ) : (
          <></>
        )} */}
      </ScrollView>
    </View>
  );
};

export default SongList;
