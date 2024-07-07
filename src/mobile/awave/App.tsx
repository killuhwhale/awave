import React, { StyleSheet, View } from "react-native";

import Main from "./src/pages/main";

export default function App() {
  return (
    <View style={styles.container}>
      <Main />
    </View>
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
