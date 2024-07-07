import CONFIG from "../../../config.json";

export const SM_BTN_SIZE = 28;
export const MD_BTN_SIZE = 36;
export const PLAYERNAME_LEFT = "p1";
export const PLAYERNAME_RIGHT = "p2";

interface Matches {
  items: number[];
  marks: string[];
}

export type filterOptions = {
  case?: boolean;
  mark?: boolean;
  prefix?: string;
  suffix?: string;
  word: boolean;
  limit?: number;
};

export function rtcMsg(partyName: string, secretCode: string, rtcData: any) {
  return {
    cmd: 1337,
    cmdType: 1337,
    partyName,
    secretCode,
    setlist: -1,
    volAmount: -1,
    ...rtcData,
  };
}

function cleanSongSource(songSrc: string): string {
  return encodeURIComponent(songSrc);
}

export const DEFAULT_SONG = {
  name: "Track 8",
  src: `http://${CONFIG["host"]}:3001/${cleanSongSource("Track 8.wav")}`,
} as SongProps;

export function SongProp(fileName: string, artist: string) {
  let name = fileName.split(".").slice(0, -1).join(".");

  const songName = name.split("/").slice(-1)[0];
  return {
    name: songName,
    fileName: fileName,
    artist,
    src: `http://${CONFIG["host"]}:3001/${encodeURIComponent(fileName)}`,
  } as SongProps;
}

export const getSongs = async () => {
  let songs = [] as SongProps[];
  try {
    const url = `http://${CONFIG["host"]}:3001/`;

    console.log("URL: ", url);

    // console.log("songData", songData);
    const songData = await (await fetch(url)).json();

    for (const key of Object.keys(songData)) {
      const fileName = key;
      const artist = songData[key];
      songs.push(SongProp(fileName, artist));
    }
    console.log("Songs from disk: ", songs);
  } catch (err) {
    console.log("Error gettings all songs: ", err);
  }
  return songs;
};

export function isGoodSecret(secret: string, userSecret: string) {
  return secret === userSecret;
}

const makePrefix = (color: string) => {
  return `<span style='color: ${color};'>`;
};

const getPrefix = (idx: number): string => {
  switch (idx % 4) {
    case 0:
      return makePrefix("#ef4444"); // red
    case 1:
      return makePrefix("#4ade80"); // green
    case 2:
      return makePrefix("#60a5fa"); // blue
    case 3:
      return makePrefix("#fef08a"); // yellow
    default:
      return makePrefix("white");
  }
};

// https://gist.github.com/vpalos/4334557
export const filter = (
  query: string,
  items: string[],
  options: filterOptions
) => {
  // option producer
  function option(name: string, value: string | number | boolean) {
    options = options || {};
    return typeof options[name as keyof filterOptions] !== "undefined"
      ? options[name as keyof filterOptions]
      : value;
  }

  // prepare options
  const ignoreCase = true;
  const enableMarking = option("mark", true);
  const markSuffix = "</span>";
  const matchWholeWords = true;
  const limit = option("limit", 0);

  // prepare query
  query = ignoreCase ? query.toLowerCase() : query;
  query = query.replace(/\s+/g, matchWholeWords ? " " : "");
  query = query.replace(/(^\s+|\s+$)/g, "");
  const queryList = query.split(matchWholeWords ? " " : "");

  const ql = queryList.length;

  // prepare results
  const matches: Matches = {
    items: [],
    marks: [],
  };

  let markNum = 0; // Tracks each mark to change style dynamically

  // search itemIndex  itemsCount
  for (
    let itemIndex = 0, itemsCount = items.length;
    itemIndex < itemsCount;
    itemIndex++
  ) {
    // prepare text

    if (
      !items ||
      !items[itemIndex] ||
      items === undefined ||
      items[itemIndex] === undefined
    )
      continue;

    const text = ignoreCase
      ? items[itemIndex]!.toLowerCase()
      : items[itemIndex];

    let mark = "";

    // traverse
    let textIndex = 0;
    let wordIndex = 0;
    let wordLength = 0;
    let queryIndex = 0;
    for (queryIndex = 0; queryIndex < ql; queryIndex++) {
      if (!queryList || !queryList[queryIndex]) continue;

      wordLength = queryList[queryIndex]!.length;
      wordIndex = text!.indexOf(queryList[queryIndex]!, textIndex);
      if (wordIndex === -1) {
        break;
      }
      if (enableMarking) {
        if (wordIndex > 0) {
          mark += items[itemIndex]!.slice(textIndex, wordIndex);
        }

        mark += `${getPrefix(markNum)}${items[itemIndex]!.slice(
          wordIndex,
          wordIndex + wordLength
        )}${markSuffix}`;

        markNum += 1;
      }
      textIndex = wordIndex + wordLength;
    }

    // capture
    if (queryIndex == ql) {
      if (enableMarking) {
        mark += items[itemIndex]!.slice(textIndex);
        matches.marks.push(mark);
      }
      if (matches.items.push(itemIndex) === limit && limit) {
        break;
      }
    }
  }

  // ready
  return matches;
};

// https://www.freecodecamp.org/news/javascript-debounce-example/
// eslint-disable-next-line @typescript-eslint/ban-types
export const debounce = (func: Function, timeout = 300) => {
  let timer: NodeJS.Timeout;
  return (...args: string[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
};
