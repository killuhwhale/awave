import React from "react";

import {
  Button,
  ScrollView,
  Text,
  TextInput,
  TouchableHighlight,
  View,
  Platform,
} from "react-native";

import { CTLBTN } from "@root/comps/CTLBTN";

type ControlPageProps = {
  partyName: string;
  setPartyName: React.Dispatch<React.SetStateAction<string>>;
  updatePartyName: (...args: any[]) => void;
  secretCode: string;
  setSecretCode: React.Dispatch<React.SetStateAction<string>>;
  updateSecretCode: (...args: any[]) => void;
  isOnCall: boolean;
  hangUp: () => Promise<void>;
  callMusicPlayer: () => Promise<void>;
  sendPlay: () => void;
  sendPause: () => void;
  sendNext: () => void;
  sendVolDown: () => void;
  sendVolUp: () => void;
  adminCode: string;
  setAdminCode: React.Dispatch<React.SetStateAction<string>>;
  resetPlayer: () => void;
};

const ControlPage: React.FC<ControlPageProps> = ({
  partyName,
  setPartyName,
  updatePartyName,
  secretCode,
  setSecretCode,
  updateSecretCode,
  isOnCall,
  hangUp,
  callMusicPlayer,
  sendPlay,
  sendPause,
  sendNext,
  sendVolDown,
  sendVolUp,
  adminCode,
  setAdminCode,
  resetPlayer,
}) => {
  const onCallColor = isOnCall ? "#9f1239" : "#166534";
  const onCallText = isOnCall ? "Connected" : "Not Connected";
  return (
    <ScrollView id="mainscroll" contentContainerStyle={{ flexGrow: 1 }}>
      <View
        id="row1"
        style={{
          flex: 2,
          flexDirection: "column",
          padding: 8,
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            color: "white",
            marginBottom: 12,
            fontWeight: "bold",
          }}
        >
          Connection Details
        </Text>

        <View style={{ flex: 1, flexDirection: "row", padding: 8 }}>
          <View style={{ flex: 1, flexDirection: "column" }}>
            <Text
              style={{
                textAlign: "center",
                color: "white",
                fontWeight: "bold",
                marginBottom: 8,
              }}
            >
              Party Name
            </Text>
            <View style={{ alignItems: "center" }}>
              <TextInput
                style={{
                  backgroundColor: "black",
                  color: "white",
                  padding: 8,
                  width: "75%",
                  borderRadius: 8,
                }}
                placeholderTextColor="white"
                placeholder="Party Name"
                value={partyName}
                onChange={(ev) => {
                  setPartyName(ev.nativeEvent.text);
                  updatePartyName(ev.nativeEvent.text, secretCode);
                }}
              />
            </View>
          </View>

          <View style={{ flex: 1, flexDirection: "column" }}>
            <Text
              style={{
                textAlign: "center",
                color: "white",
                marginBottom: 8,
                fontWeight: "bold",
              }}
            >
              Secret
            </Text>
            <View style={{ alignItems: "center" }}>
              <TextInput
                style={{
                  backgroundColor: "black",
                  color: "white",
                  padding: 8,
                  width: "75%",
                  borderRadius: 8,
                }}
                placeholderTextColor="white"
                placeholder="Secret Code"
                value={secretCode}
                onChange={(ev) => {
                  setSecretCode(ev.nativeEvent.text);
                  updateSecretCode(partyName, ev.nativeEvent.text);
                }}
              />
            </View>
          </View>
        </View>
      </View>

      <View
        id="row2"
        style={{ flex: 3, padding: 8, marginTop: 8, marginBottom: 8 }}
      >
        <Text style={{ fontSize: 24, color: "white", fontWeight: "bold" }}>
          Microphone
        </Text>
        <View
          style={{
            backgroundColor: onCallColor,
            borderRadius: 12,
            justifyContent: "center",
            alignContent: "center",
            alignItems: "center",
            padding: 12,
            margin: 12,
            marginLeft: 24,
            width: "10%",
          }}
        >
          {isOnCall ? <></> : <></>}
        </View>

        {isOnCall ? (
          <View
            style={{
              backgroundColor: "#be123c",
              marginHorizontal: 24,
            }}
          >
            <TouchableHighlight onPress={hangUp} style={{ borderRadius: 8 }}>
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  padding: 12,
                }}
              >
                Hang Up
              </Text>
            </TouchableHighlight>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#0284c7",
              marginHorizontal: 24,
              borderRadius: 8,
            }}
          >
            <TouchableHighlight
              onPress={callMusicPlayer}
              style={{ borderRadius: 8 }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  padding: 12,
                }}
              >
                Call
              </Text>
            </TouchableHighlight>
          </View>
        )}
      </View>

      <View
        id="row3"
        style={{
          flex: 4,
          width: "100%",
          padding: 8,
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 24, color: "white", fontWeight: "bold" }}>
          Controls
        </Text>
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <CTLBTN fn={sendPlay} text="Play" />
          <CTLBTN fn={sendPause} text="Pause" />
        </View>
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <CTLBTN fn={sendPause} text="Pause" />
          <CTLBTN fn={sendNext} text="Next" />
        </View>
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <CTLBTN fn={sendVolDown} text="Vol Down" />
          <CTLBTN fn={sendVolUp} text="Vol Up" />
        </View>
      </View>

      {Platform.OS == "web" ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ flex: 1, flexDirection: "column" }}>
            <Text
              style={{
                textAlign: "center",
                color: "white",
                marginTop: 150,
              }}
            >
              Admin
            </Text>
            <TextInput
              style={{
                width: "100%",
                backgroundColor: "black",
                color: "white",
                padding: 4,
              }}
              placeholderTextColor="white"
              placeholder="Admin Code"
              value={adminCode}
              onChange={(ev) => {
                setAdminCode(ev.nativeEvent.text);
              }}
            />
            <Button title="Reset Player" onPress={resetPlayer} />
          </View>
        </View>
      ) : (
        <View></View>
      )}
    </ScrollView>
  );
};

export default ControlPage;
