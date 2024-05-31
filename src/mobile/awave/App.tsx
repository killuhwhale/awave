import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

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
    flex: 1,
    height: "100%",
    backgroundColor: "#1e2122",
    color: "#ffffff",
    textDecorationColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
