import { PermissionsAndroid } from 'react-native';

export function rtcMsg(partyName, secretCode, rtcData){
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



const requestPermissions = async () => {
    try {
        return await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Allow Microphone?',
              message:
                'Allows you to use this phone as a microphone for Awave!',
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


  export { requestPermissions }