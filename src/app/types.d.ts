type CmdMsg = {
  cmd: number;
  cmdType: number;
  partyName: string;
  secretCode: string;
  setlist: number;
  volAmount: number;
};

type SongProps = {
  name: string;
  album?: string;
  artist?: string;
  src: string;
};

type SongListSearchProps = {
  songs: SongProps[];
  title: string;
  hidden: boolean;
  onDragStart(e: any, song: SongProps): void;
  setNewPlayer?(newSong: SongProps): void;
  leftPlayerRef?: React.MutableRefObject<Howl | null | undefined>;
  leftSong?: SongProps | null;
  isLeftPlaying?: boolean;
  confirmLoadSetlist?(): void;
};

type SongListOnDeckProps = {
  songs: SongProps[];

  onDragOver(e: any): void;
  onDrop(e: any, dropIndex: number): void;
  onDragStartRearrangeDeck(e: any, song: SongProps, startIndex: number): void;
  onDragOverRearrangeDeck(e: any): void;
  onDropRearrangeDeck(e: any, dropIndex: number): void;
  confirmRemoveOnDeckSong: (rmSong: SongProps) => void;
  addOnDeckToNewSetlist?(title: string): void;
  setNewPlayer?(newSong: SongProps): void;
};

type SongPlayerProps = {
  playerName: string;
  song: SongProps;
  bgColor: string;
  musicVol: number;
  playerRef: React.MutableRefObject<Howl | null | undefined>;
  duration: number;
  durationRef: React.MutableRefObject<number>;

  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;

  nextSong(playerName: string): void;
};

type Setlist = {
  title: string;
  order: number;
  songs: SongProps[];
};
type Setlists = {
  files: Setlist[];
};
