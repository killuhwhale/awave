import { Text, TouchableHighlight } from "react-native";

export const CTLBTN: React.FC<{ fn: any; text: string }> = ({ fn, text }) => {
  return (
    <TouchableHighlight
      style={{
        width: "45%",
        marginRight: 5,
        marginTop: 4,
        marginBottom: 4,
        padding: 8,
        borderRadius: 12,
        backgroundColor: "#0ea5e9",
        justifyContent: "center",
        alignItems: "center",
      }}
      onPress={fn}
    >
      <Text style={{ color: "white" }}> {text} </Text>
    </TouchableHighlight>
  );
};
