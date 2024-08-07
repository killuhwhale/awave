type Setlist = {
  order: number;
  title: string;
  songs: SongProps[];
};

type SongProps = {
  name: string;
  fileName: string;
  album?: string;
  artist?: string;
  order?: number;
};

interface Matches {
  items: number[];
  marks: string[];
}

type filterOptions = {
  case?: boolean;
  mark?: boolean;
  prefix?: string;
  suffix?: string;
  word: boolean;
  limit?: number;
};
