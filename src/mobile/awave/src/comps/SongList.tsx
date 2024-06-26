import React, {
  ChangeEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Button,
  FlatList,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  View,
  VirtualizedList,
} from "react-native";

import SQLite from "react-native-sqlite-storage";
import { collection, getDocs, getFirestore } from "firebase/firestore/lite";
import fbApp from "@root/firebase/firebaseApp";

import config from "@root/utils/config";
import { debounce, filter } from "@root/utils/helpers";

const sqlDB = SQLite.openDatabase({ name: "songs.db", location: "default" });
const db = getFirestore(fbApp);

const initializeDatabase = () => {
  // dropTable();
  createTable();
};

const createTable = () => {
  return new Promise((res, rej) => {
    sqlDB.transaction((tx) => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS Songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          artist TEXT,
          fileName TEXT,
          songorder INTEGER,
          UNIQUE(fileName)
        );`,
        [],
        () => {
          console.log("Table created successfully");
          res("");
        },
        (error) => {
          console.log("Error creating table: ", error);
          rej();
        }
      );
    });
  });
};

const dropTable = () => {
  return new Promise((res, rej) => {
    sqlDB.transaction((tx) => {
      tx.executeSql(
        `DROP TABLE Songs;`,
        [],
        () => res(console.log("Old table SONGS dropped")),
        (error) => rej(console.error("Error dropping table:", error))
      );
    });
  });
};

// Call this function to insert all songs
const insertSongs = (songs) => {
  try {
    sqlDB.transaction((tx) => {
      songs.forEach((song) => {
        tx.executeSql(
          `INSERT INTO Songs (name, artist, fileName, songorder) VALUES (?, ?, ?, ?);`,
          [song.name, song.artist ?? "", song.fileName, song.order ?? 0],
          (tx, results) => {
            // console.log("Song inserted");
          },
          (error) => {
            console.log("Error inserting song: ", song, error);
          }
        );
      });
    });
  } catch (err) {
    console.log("Error inserting: ", err);
  }
};

const loadAllSongs = () => {
  return new Promise<any>((resolve, reject) => {
    try {
      sqlDB.transaction((tx) => {
        tx.executeSql(
          `SELECT name FROM Songs;`,
          [],
          (tx, results) => {
            console.log("results: ", Object.keys(results));
            console.log("results: ", Object.keys(results.rows));
            const rows = [];
            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }
            console.log("Loaded songs: ", rows.length);
            resolve(rows);
          },
          (error) => {
            console.error("Error checking table existence: ", error);
            reject();
          }
        );
      });
    } catch (err) {
      console.log("LoadAllSongs error: ", err);
      reject(err);
    }
  });
};

const getPaginatedSongs = (page, itemsPerPage, callback) => {
  const offset = page * itemsPerPage;
  sqlDB.transaction((tx) => {
    tx.executeSql(
      `SELECT * FROM Songs LIMIT ? OFFSET ?;`,
      [itemsPerPage, offset],
      (tx, results) => {
        const rows = results.rows;
        let songs = [];
        for (let i = 0; i < rows.length; i++) {
          songs.push(rows.item(i));
        }
        console.log("Setting loaded songs");
        callback(songs);
      },
      (error) => {
        console.log("Error fetching songs: ", error);
      }
    );
  });
};

const searchSongs = (query, callback) => {
  // `SELECT * FROM Songs WHERE name LIKE ? OR artist LIKE ?;`,
  sqlDB.transaction((tx) => {
    tx.executeSql(
      `SELECT * FROM Songs WHERE name LIKE ?;`,
      [`%${query}%`],
      (tx, results) => {
        const rows = results.rows;
        let songs = [];
        for (let i = 0; i < rows.length; i++) {
          songs.push(rows.item(i));
        }
        callback(songs);
      },
      (error) => {
        console.log("Error searching songs: ", error);
      }
    );
  });
};

const songsTableExist = () => {
  return new Promise<number>((resolve, reject) => {
    sqlDB.transaction((tx) => {
      tx.executeSql(
        `SELECT name FROM Songs;`,
        [],
        (tx, results) => {
          if (results.rows.length > 0) {
            resolve(results.rows.length);
          } else {
            resolve(results.rows.length);
          }
        },
        (error) => {
          console.error("Error checking table existence: ", error);
          reject(0);
        }
      );
    });
  });
};

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

const SongList: React.FC<{ sendSongToPlayer(song: SongProps): void }> = ({
  sendSongToPlayer,
}) => {
  const songsRef = useRef<SongProps[] | null>(null);
  const [fetchedSongs, setFetchedSongs] = useState(false);

  const itemsPerPage = 20;

  useEffect(() => {
    if (songsRef.current && songsRef.current.length > 0) return;
    const collectionPath = `music/${config["deviceName"]}/songs`;
    const getSongs = async () => {
      try {
        initializeDatabase();
        const numSongsInTable = await songsTableExist();

        if (numSongsInTable > 0) {
          console.log(
            "Songs already fetched from FB and inserted, not getting again."
          );
          // Load first page of songs from DB
          songsRef.current = await loadAllSongs(); // TODO get all songs from DB
          filteredSongIdxsRef.current = Array.from(
            Array(songsRef.current.length).keys()
          );
          console.log("setting setFetchedSongs True! Done!");
          setFetchedSongs(true);
          return;
        }

        // console.log("Gathering songs...");
        const songRes = await getDocs(collection(db, collectionPath));
        console.log("songsRes", songRes);
        const fetchedSongs: SongProps[] = songRes.docs.flatMap((doc) => {
          const songChunk = JSON.parse(doc.data().songs) as {
            [key: string]: SongProps;
          };
          // console.log("Chunk: ", songChunk);
          return Object.values(songChunk);
        });
        console.log("Fetched songs: ", fetchedSongs.length);
        insertSongs(fetchedSongs);
        songsRef.current = fetchedSongs;
        filteredSongIdxsRef.current = Array.from(
          Array(songsRef.current.length).keys()
        );
        console.log("setting setFetchedSongs True! Done!");
        setFetchedSongs(true);

        // console.log("Got songs from FB successfully.");
      } catch (err) {
        console.log("Error getting songs", err);
      }
    };

    console.log("GatheringSongs");
    const startTime = global.performance.now();
    getSongs()
      .then(() => {
        const endTime = global.performance.now();
        const timeTaken = endTime - startTime;
        console.log(`GatheringSongs took: ${timeTaken} ms`);
      })
      .catch((err) => console.log("err", err));
  }, []);

  const filteredSongIdxsRef = useRef<number[]>([]);
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
      return;
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
            const data = ev.nativeEvent.text;
            debFilterText(data);
          }}
        />
      </View>

      <View style={{ flex: 5, width: "100%" }}>
        {songsRef.current && filteredSongIdxsRef.current && fetchedSongs ? (
          <VirtualizedList<SongProps>
            data={filteredSongIdxsRef.current}
            windowSize={itemsPerPage}
            keyExtractor={(item, index) =>
              `${index}_songlist_song_${songsRef.current[item[index]]}`
            }
            getItemCount={() => filteredSongIdxsRef.current.length}
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
