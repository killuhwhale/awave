import { collection, Firestore, getDocs } from "firebase/firestore/lite";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableHighlight, View } from "react-native";
// import SQLite from "react-native-sqlite-storage";

import SongList from "@root/comps/SongList";
import config from "@root/utils/config";

type MusicPageProps = {
  db: Firestore;
  sendSongToPlayer: (song: SongProps) => void;
  sendLoadSetlist: () => void;
  partyName: string;
  secretCode: string;
};

const MusicPage: React.FC<MusicPageProps> = ({
  db,
  sendSongToPlayer,
  sendLoadSetlist,
  partyName,
  secretCode,
}) => {
  const [setlists, setSetlists] = useState<Setlist[]>([] as Setlist[]);
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);

  useEffect(() => {
    getUserMusic()
      .then(() => console.log("Got user music"))
      .catch((err) => {
        console.log("Err getting users music: ", err);
      });
  }, [partyName, secretCode]);

  const getUserMusic = async () => {
    let setlists;
    let allSongs;

    try {
      setlists = await getSetlists();
    } catch (err) {
      console.log("Error getting setlists", err);
    }

    try {
      allSongs = await getAllSongs();
    } catch (err) {
      console.log("Error getting allSongs", err);
    }

    console.log("All songs undefined: ", allSongs === undefined);
    console.log("All setlists undefined: ", setlists === undefined);

    let combinedSetlist = [
      {
        order: -1,
        songs: allSongs,
        title: "All Songs",
      } as Setlist,
    ];

    if (setlists) {
      combinedSetlist.push(...setlists);
    }

    setSetlists(combinedSetlist);
    setCurrentSetlist(combinedSetlist[0]);
  };

  const getSetlists = async (): Promise<Setlist[]> => {
    if (!partyName) return;

    const setListPath = `setlists/${partyName}/setlists`;
    console.log("loading setlists: ", setListPath);

    const setlistDocs = await getDocs(collection(db, setListPath));
    const allSetlists = [] as Setlist[];

    setlistDocs.docs.forEach(async (fbdoc) => {
      const setListSongs = (
        await getDocs(
          collection(db, `setlists/${partyName}/setlists/${fbdoc.id}/songs`)
        )
      ).docs.map((songDoc) => songDoc.data());
      allSetlists.push({ ...fbdoc.data(), songs: setListSongs } as Setlist);
    });

    allSetlists.sort((a, b) => (a.order > b.order ? 1 : -1));
    return allSetlists;
  };

  const getAllSongs = async (): Promise<SongProps[]> => {
    const collectionPath = `music/${config["deviceName"]}/songs`;
    try {
      const startTime = global.performance.now();
      // If I want to use this, I should store the date of the last time the music was updated in firebase and also store the last time the data was fetched.
      // Check these two dates each time, when firebase says data is newer than local date, delete table, create table, fetch and insert songs, update local date.

      // Database method //
      // initializeDatabase();
      // const numSongsInTable = await songsTableExist();

      // if (numSongsInTable > 0) {
      //   console.log(
      //     "Songs already fetched from FB and inserted, not getting again."
      //   );
      //   // Load first page of songs from DB
      //   const res = await loadAllSongs();
      //   const endTime = global.performance.now();
      //   console.log("Loading from DB took: ", endTime - startTime);
      //   return res;
      // }

      // console.log("Gathering songs...");
      const songRes = await getDocs(collection(db, collectionPath));

      const fetchedSongs: SongProps[] = songRes.docs.flatMap((doc) => {
        const songChunk = JSON.parse(doc.data().songs) as {
          [key: string]: SongProps;
        };
        // console.log("Chunk: ", songChunk);
        return Object.values(songChunk);
      });
      console.log("Fetched songs: ", fetchedSongs.length);
      // insertSongs(fetchedSongs);

      const endTime = global.performance.now();
      console.log(
        "Loading from Firebase and inserting took: ",
        endTime - startTime
      );
      return fetchedSongs;

      // console.log("Got songs from FB successfully.");
    } catch (err) {
      console.log("Error getting songs", err);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        gap: 10,
        marginBottom: "10%",
      }}
    >
      <View style={{ flex: 2, padding: 8 }}>
        {currentSetlist ? (
          <SongList
            key={`cslsl_${currentSetlist.title}`}
            sendSongToPlayer={sendSongToPlayer}
            songs={currentSetlist.songs}
          />
        ) : (
          <></>
        )}
      </View>
      <View style={{ flex: 2 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontSize: 24, color: "white" }}>Setlist</Text>
            <Text style={{ fontSize: 16, color: "white" }}>
              Current Setlist: {currentSetlist?.title}
            </Text>
          </View>

          <ScrollView style={{ flex: 2, marginHorizontal: 8 }}>
            <View style={{ flex: 1, flexDirection: "column" }}>
              {!setlists ? (
                <></>
              ) : (
                setlists.map((sl, idx) => {
                  return (
                    <View
                      key={`sl_${idx}`}
                      style={{
                        flex: 1,
                        width: "100%",
                        marginRight: 8,
                        marginBottom: 3,
                        borderRadius: 16,
                        backgroundColor:
                          currentSetlist?.title === sl.title
                            ? "#075985"
                            : "#020617",
                        padding: 8,
                      }}
                    >
                      <TouchableHighlight
                        onPress={() => setCurrentSetlist(sl)}
                        style={{
                          height: "100%",
                          width: "100%",
                          justifyContent: "center",
                          alignContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color:
                              sl.order == currentSetlist?.order
                                ? "white"
                                : "grey",
                            textAlign: "center",
                          }}
                        >
                          {sl.title}
                        </Text>
                      </TouchableHighlight>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          <View
            style={{
              width: "100%",
              flex: 1,
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <View style={{ width: "80%", marginTop: 8 }}>
              <TouchableHighlight
                onPress={sendLoadSetlist}
                underlayColor="blue"
                style={{
                  marginTop: 6,
                  backgroundColor: "#020617",
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: "#3f3f46",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    padding: 8,
                  }}
                >
                  Load Current Setlist
                </Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default MusicPage;

// const sqlDB = SQLite.openDatabase({ name: "songs.db", location: "default" });

// const initializeDatabase = () => {
//   // dropTable();
//   createTable();
// };

// const createTable = () => {
//   return new Promise((res, rej) => {
//     sqlDB.transaction((tx) => {
//       tx.executeSql(
//         `CREATE TABLE IF NOT EXISTS Songs (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           name TEXT,
//           artist TEXT,
//           fileName TEXT,
//           songorder INTEGER,
//           UNIQUE(fileName)
//         );`,
//         [],
//         () => {
//           console.log("Table created successfully");
//           res("");
//         },
//         (error) => {
//           console.log("Error creating table: ", error);
//           rej();
//         }
//       );
//     });
//   });
// };

// const dropTable = () => {
//   return new Promise((res, rej) => {
//     sqlDB.transaction((tx) => {
//       tx.executeSql(
//         `DROP TABLE Songs;`,
//         [],
//         () => res(console.log("Old table SONGS dropped")),
//         (error) => rej(console.error("Error dropping table:", error))
//       );
//     });
//   });
// };

// // Call this function to insert all songs
// const insertSongs = (songs) => {
//   try {
//     sqlDB.transaction((tx) => {
//       songs.forEach((song) => {
//         tx.executeSql(
//           `INSERT INTO Songs (name, artist, fileName, songorder) VALUES (?, ?, ?, ?);`,
//           [song.name, song.artist ?? "", song.fileName, song.order ?? 0],
//           (tx, results) => {
//             // console.log("Song inserted");
//           },
//           (error) => {
//             console.log("Error inserting song: ", song, error);
//           }
//         );
//       });
//     });
//   } catch (err) {
//     console.log("Error inserting: ", err);
//   }
// };

// const loadAllSongs = () => {
//   return new Promise<any>((resolve, reject) => {
//     try {
//       sqlDB.transaction((tx) => {
//         tx.executeSql(
//           `SELECT name FROM Songs;`,
//           [],
//           (tx, results) => {
//             console.log("results: ", Object.keys(results));
//             console.log("results: ", Object.keys(results.rows));
//             const rows = [];
//             for (let i = 0; i < results.rows.length; i++) {
//               rows.push(results.rows.item(i));
//             }
//             console.log("Loaded songs: ", rows.length);
//             resolve(rows);
//           },
//           (error) => {
//             console.error("Error checking table existence: ", error);
//             reject();
//           }
//         );
//       });
//     } catch (err) {
//       console.log("LoadAllSongs error: ", err);
//       reject(err);
//     }
//   });
// };

// const songsTableExist = () => {
//   return new Promise<number>((resolve, reject) => {
//     sqlDB.transaction((tx) => {
//       tx.executeSql(
//         `SELECT name FROM Songs;`,
//         [],
//         (tx, results) => {
//           if (results.rows.length > 0) {
//             resolve(results.rows.length);
//           } else {
//             resolve(results.rows.length);
//           }
//         },
//         (error) => {
//           console.error("Error checking table existence: ", error);
//           reject(0);
//         }
//       );
//     });
//   });
// };
