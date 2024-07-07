import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  View,
  VirtualizedList,
} from "react-native";

import { debounce, filter } from "@root/utils/helpers";

const LoadingSpinner = () => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
};

const SongList: React.FC<{
  sendSongToPlayer(song: SongProps): void;
  songs: SongProps[];
}> = ({ sendSongToPlayer, songs }) => {
  const songsRef = useRef<SongProps[] | null>(songs);
  const filteredSongIdxsRef = useRef<number[]>(
    Array.from(Array(songsRef.current.length).keys())
  );
  const itemsPerPage = 20;

  const [songState, setSongState] = useState(false);

  useEffect(() => {
    songsRef.current = songs;
    filteredSongIdxsRef.current = Array.from(
      Array(songsRef.current.length).keys()
    );
  }, [songs]);

  useLayoutEffect(() => {
    if (!songsRef.current) return;
    filteredSongIdxsRef.current = Array.from(
      Array(songsRef.current.length).keys()
    );
  }, [songsRef.current]);

  const [searchByArtist, setSearchByArtist] = useState(false);

  const filterText = (searchTerm: string): void => {
    console.log("Filtering: ", searchTerm);
    if (!searchTerm) {
      // reset to all results
      filteredSongIdxsRef.current = Array.from(
        Array(songsRef.current.length).keys()
      );
      return setSongState(!songState);
    }

    // Updates filtered data.
    const stringData = songsRef.current?.map((song: SongProps) => {
      if (searchByArtist) return song.artist ?? song.name;
      return song.name;
    });

    // console.log("Filter text: ", searchTerm, stringData);
    const options: filterOptions = {
      word: false,
    };
    const { items, marks } = filter(searchTerm, stringData, options);
    filteredSongIdxsRef.current = items;
    console.log("Setting song search state update");
    setSongState(!songState);
  };

  const debFilterText = debounce(filterText, 350);

  const renderRow = ({ item, index }) => {
    const song = item as SongProps;
    return (
      <View
        style={{
          backgroundColor: "#2563eb",
          padding: 8,
          marginBottom: 7,
          borderRadius: 16,
        }}
      >
        <TouchableHighlight
          style={{ width: "100%" }}
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
  };

  const cState = songState ? " " : "";
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
          placeholderTextColor="white"
          placeholder={
            searchByArtist ? "Search by Artist" : "Search by Song Name"
          }
          onChange={(ev) => {
            const data = ev.nativeEvent.text;
            debFilterText(data);
          }}
        />
      </View>

      <View style={{ flex: 5, width: "100%" }}>
        {songsRef.current && filteredSongIdxsRef.current ? (
          <VirtualizedList<SongProps>
            data={filteredSongIdxsRef.current}
            windowSize={itemsPerPage}
            keyExtractor={(item, index) =>
              `${index}_songlist_song_${songsRef.current[item[index]]}`
            }
            getItemCount={() => {
              return filteredSongIdxsRef.current
                ? filteredSongIdxsRef.current.length
                : 0;
            }}
            getItem={(item, index) => {
              return songsRef.current[item[index]] as SongProps;
            }}
            renderItem={renderRow}
            initialNumToRender={itemsPerPage}
          />
        ) : (
          <LoadingSpinner />
        )}
      </View>
    </View>
  );
};

export default SongList;
