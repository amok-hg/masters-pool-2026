export const SHEET_ID = "1Q4WvbjPUNQ9nDUYBIMFewKTnxm4l22YyAFtwWarNIc8";

export type EntryRow = {
  name: string;
  total: number | null;
  picks: string[];
  scores: (number | null)[];
};

export type SheetData = {
  lastUpdated: string | null;
  leaderboard: { name: string; total: number | null }[];
  entries: EntryRow[];
};

function parseScore(val: string): number | null {
  const v = val.trim();
  if (!v || v === "#N/A" || v === "N/A" || v === "-" || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function csvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function isDataRow(cols: string[]): boolean {
  const name = cols[1]?.trim() ?? "";
  if (!name) return false;
  // Must have at least one pick in cols D-I to be a real entry row
  const hasPicks = [cols[3], cols[4], cols[5], cols[6], cols[7], cols[8]]
    .some((v) => v?.trim());
  return hasPicks;
}

function sheetCsvUrl(sheetName: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

export async function fetchSheetData(): Promise<SheetData> {
  const res = await fetch(sheetCsvUrl("Leaderboard"), {
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const text = await res.text();
  return parseSheetCSV(text);
}

export function parseSheetCSV(text: string): SheetData {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));

  let lastUpdated: string | null = null;
  const entries: EntryRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = csvLine(lines[i]);

    if (i === 1) {
      const val = cols[2]?.trim();
      if (val && val !== "#N/A") lastUpdated = val;
    }

    // Only parse rows from index 23 onwards that have actual pick data
    if (i >= 23 && isDataRow(cols)) {
      const name = cols[1].trim();
      const picks = [cols[3], cols[4], cols[5], cols[6], cols[7], cols[8]].map(
        (v) => v?.trim() ?? ""
      );
      const scores = [cols[9], cols[10], cols[11], cols[12], cols[13], cols[14]].map(
        (v) => parseScore(v ?? "")
      );
      entries.push({
        name,
        total: parseScore(cols[2] ?? ""),
        picks,
        scores,
      });
    }
  }

  const leaderboard = entries
    .map(({ name, total }) => ({ name, total }))
    .sort((a, b) => {
      if (a.total === null && b.total === null) return 0;
      if (a.total === null) return 1;
      if (b.total === null) return -1;
      return a.total - b.total;
    });

  return { lastUpdated, leaderboard, entries };
}
