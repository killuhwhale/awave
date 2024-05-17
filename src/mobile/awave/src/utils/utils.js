
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// const ws = new WebSocket('wss://yourdomain.com:8080');
// const peerConnection = new RTCPeerConnection({
//     iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
// });




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

// ws.onmessage = function (message) {
//     const data = JSON.parse(message.data);
//     switch (data.type) {
//     case 'offer':
//         handleOffer(data.offer);
//         break;
//     case 'answer':
//         handleAnswer(data.answer);
//         break;
//     case 'candidate':
//         handleCandidate(data.candidate);
//         break;
//     }
// };

// peerConnection.onicecandidate = function (event) {
//     if (event.candidate) {
//     ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
//     }
// };

// peerConnection.ontrack = function (event) {
//     remoteVideo.srcObject = event.streams[0];
// };

// navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//     .then(stream => {
//     localVideo.srcObject = stream;
//     stream.getTracks().forEach(track => {
//         peerConnection.addTrack(track, stream);
//     });
//     })
//     .catch(error => console.error('Stream error: ', error));

// function handleOffer(offer) {
//     peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
//     peerConnection.createAnswer()
//     .then(answer => {
//         peerConnection.setLocalDescription(answer);
//         ws.send(JSON.stringify({ type: 'answer', answer: answer }));
//     })
//     .catch(error => console.error('Answer error: ', error));
// }

// function handleAnswer(answer) {
//     peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
// }

// function handleCandidate(candidate) {
//     peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
// }

// // Example: Send an offer to connect
// function sendOffer() {
//     peerConnection.createOffer()
//     .then(offer => {
//         peerConnection.setLocalDescription(offer);
//         ws.send(JSON.stringify({ type: 'offer', offer: offer }));
//     })
//     .catch(error => console.error('Offer error: ', error));
// }