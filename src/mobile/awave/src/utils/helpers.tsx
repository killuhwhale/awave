class Commands {
  cmds = {
    play: 1,
    pause: 2,
    next: 3,
    volup: 4,
    voldown: 5,
    loadSetlist: 6,
    sendSong: 7,
    reset: 420,
  };

  PLAY = "play";
  PAUSE = "pause";
  NEXT = "next";
  VOLUP = "volup";
  VOLDOWN = "voldown";
  LOADSETLIST = "loadSetlist";
  RESET = "reset";
  SENDSONG = "sendSong";
}

const CMD = new Commands();

const debounce = (fn, timeout = 500) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, timeout);
  };
};

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

/*
 * A generic search algorithm designed for filtering (very) large lists of strings; when an input string
 * contains all the parts (words or characters; whitespace is ignored) of the query, spread-out over the text
 * then the string is considered to be a match. It works with the way internet browsers (e.g. Firefox, Google
 * Chrome) filter address-bar suggestions on user input. It is also quite fast; on my i7 laptop, filtering
 *     1) a list of ~23000 items takes around 50ms (yes, milliseconds!);
 *     2) a list of ~1 million text items took under 1 second.
 * It works both in NodeJS as well as in browser environments (so far I only tested FF and GC).
 *
 * It has two functioning modes:
 * 1) word-mode: each (whitespace-separated) word in the input query must be found **whole** in the text:
 *     e.g. "foo bar" will match "123foo456bar789" but not "f oo ba r";
 * 2) charater-mode: the input query is matched per-character (whitespace is completely ignored):
 *     e.g. "foo bar" will match "f o o b a r" and even "-f.oo-ba.r-".
 */

// https://gist.github.com/vpalos/4334557
export const filter = (
  query: string,
  items: string[],
  options: filterOptions
) => {
  // option producer
  function option(name: string, value: string | number | boolean) {
    options = options || ({} as filterOptions);
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

export { CMD, debounce };
