type CmdMsg = {
  cmd: number;
  cmdType: number;
  partyName: string;
  secretCode: string;
  setlist: string;
  volAmount: number;
  clientType?: string;
  song?: SongProps;
};

type SongProps = {
  name: string;
  fileName: string;
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
  masterPause?(): void;
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

  setNewPlayer(playerName: string, newSong: SongProps, init?: boolean): void;
  nextSong(playerName: string): void;
};

type Setlist = {
  title: string;
  order: number;
  songs: SongProps[] | null;
};
type Setlists = Setlist[];
