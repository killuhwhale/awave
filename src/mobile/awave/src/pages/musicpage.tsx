import React from "react";
import { ScrollView, Text, TouchableHighlight, View } from "react-native";

import SongList from "@root/comps/SongList";

type MusicPageProps = {
  sendSongToPlayer: (song: SongProps) => void;
  currentSetlist: Setlist;
  setCurrentSetlist: React.Dispatch<React.SetStateAction<Setlist>>;
  setlists: Setlist[];
  sendLoadSetlist: () => void;
};

const MusicPage: React.FC<MusicPageProps> = ({
  sendSongToPlayer,
  currentSetlist,
  setCurrentSetlist,
  setlists,
  sendLoadSetlist,
}) => {
  return (
    <View
      style={{
        flex: 1,
        gap: 10,
        marginBottom: "10%",
      }}
    >
      <View style={{ flex: 2, padding: 8 }}>
        <SongList sendSongToPlayer={sendSongToPlayer} />
      </View>
      <View style={{ flex: 1, padding: 8 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontSize: 24, color: "white" }}>Setlist</Text>
            <Text style={{ fontSize: 16, color: "white" }}>
              Current Setlist: {currentSetlist?.title}
            </Text>
          </View>

          <ScrollView style={{ flex: 1, marginHorizontal: 8 }}>
            <View style={{ flex: 1, flexDirection: "column" }}>
              {setlists.map((sl, idx) => {
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
              })}
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
