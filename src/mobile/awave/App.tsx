import { StatusBar } from "expo-status-bar";
import React, { StyleSheet, Text, View } from "react-native";

import Main from "./src/pages/main";
import { StrictMode } from "react";

export default function App() {
  return (
    <StrictMode>
      <View style={styles.container}>
        <Main />
      </View>
    </StrictMode>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    backgroundColor: "#1e2122",
    color: "#ffffff",
    textDecorationColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
