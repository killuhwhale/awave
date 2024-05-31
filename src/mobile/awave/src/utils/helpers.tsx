class Commands {
  cmds = {
    play: 1,
    pause: 2,
    next: 3,
    volup: 4,
    voldown: 5,
    loadSetlist: 6,
    reset: 420,
  };

  PLAY = "play";
  PAUSE = "pause";
  NEXT = "next";
  VOLUP = "volup";
  VOLDOWN = "voldown";
  LOADSETLIST = "loadSetlist";
  RESET = "reset";
}

const CMD = new Commands();
export default CMD;
