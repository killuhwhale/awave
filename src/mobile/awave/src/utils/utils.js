import { Platform } from 'react-native';

let requestPermissions,  RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, registerGlobals;

if (Platform.OS === 'web') {

  // Web-specific imports
  ({ RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } = require('react-native-webrtc-web-shim'));
  requestPermissions = async () => {
    return true
  }
}

function rtcMsg(partyName, secretCode, rtcData){
    return {
        cmd: 1337,
        cmdType: 1337,
        partyName,
        secretCode,
        setlist: -1,
        volAmount: -1,
        clientName: "controller",
        ...rtcData,
    }
}





  export {rtcMsg, requestPermissions, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, registerGlobals }