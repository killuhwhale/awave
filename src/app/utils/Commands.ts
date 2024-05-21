interface IndexedObject {
  [key: string]: string; // Index signature
}

class Commands {
  PLAY = "play";
  PAUSE = "pause";
  NEXT = "next";
  VOLUP = "volup";
  VOLDOWN = "voldown";
  LOADSETLIST = "loadSetlist";

  getCmd: IndexedObject = {
    "1": this.PLAY,
    "2": this.PAUSE,
    "3": this.NEXT,
    "4": this.VOLUP,
    "5": this.VOLDOWN,
    "6": this.LOADSETLIST,
  };
}

export default Commands;
