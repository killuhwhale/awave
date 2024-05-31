import { PermissionsAndroid } from 'react-native';
import {RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, registerGlobals} from "react-native-webrtc"



const requestPermissions = async () => {
  try {
      return await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Allow Microphone?',
            message:
              'Allows you to use this phone as a microphone for AWave!',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          },
        );
  } catch (err) {
    console.warn(err);
  }
  return false
};

function rtcMsg(partyName, secretCode, rtcData){
    return {
        cmd: 1337,
        cmdType: 1337,
        partyName,
        secretCode,
        setlist: -1,
        volAmount: -1,
        clientType: "controller",
        ...rtcData,
    }
}

export {rtcMsg, requestPermissions, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, registerGlobals }