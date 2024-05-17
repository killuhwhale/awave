export type WSMessage = {
  cmd: number;
  cmdType: number;
  partyName: string;
  secretCode: string;
  setlist: number;
  volAmount: number;
  rtcType?: string;
  candidate?: RTCIceCandidate;
  answer?: RTCSessionDescription;
  offer?: RTCSessionDescription;
};

export type RTCSessionDescription = {
  type: string;
  sdp: string;
};

export type RTCIceCandidate = {
  address: string;
  candidate: string;
  component: string;
  foundation: string;
  port: number;
  priority: number;
  protocol: string;
  relatedAddress: string;
  relatedPort: number;
  sdpMLineIndex: number;
  sdpMid: string;
  tcpType: string;
  type: string;
  usernameFragment: string;
};
