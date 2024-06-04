type Setlist = {
  order: number;
  title: string;
};

type SongProps = {
  name: string;
  fileName: string;
  album?: string;
  artist?: string;
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
