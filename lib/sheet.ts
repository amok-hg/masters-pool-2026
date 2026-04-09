export const SHEET_ID = "1Q4WvbjPUNQ9nDUYBIMFewKTnxm4l22YyAFtwWarNIc8";

export type EntryRow = {
  name: string;
  total: number | null;
  picks: string[];   // 6 golfer names, cols D–I
  scores: (number | null)[]; // 6 scores, cols J–O
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

function csvLine(line: string): string[] {
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

function sheetCsvUrl(sheetName: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

export async function fetchSheetData(): Promise<SheetData> {
  const res = await fetch(sheetCsvUrl("Leaderboard"), {
    next: { revalidate: 1800 }, // 30 min server cache
  });

  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);

  const text = await res.text();
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));

  let lastUpdated: string | null = null;
  const leaderboard: { name: string; total: number | null }[] = [];
  const entries: EntryRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = csvLine(lines[i]);

    // Row 2 (index 1): last updated timestamp in col C (index 2)
    if (i === 1) {
      const val = cols[2]?.trim();
      if (val && val !== "#N/A") lastUpdated = val;
    }

    // Rows 5–15 (index 4–14): leaderboard — col B = name, col C = total
    if (i >= 4 && i <= 14) {
      const name = cols[1]?.trim();
      if (name) {
        leaderboard.push({ name, total: parseScore(cols[2] ?? "") });
      }
    }

    // Rows 24–34 (index 23–33): individual entries
    // Col B = name, Col C = total, Cols D–I = picks, Cols J–O = scores
    if (i >= 23 && i <= 33) {
      const name = cols[1]?.trim();
      if (name) {
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
  }

  // Sort leaderboard: nulls last, then ascending
  leaderboard.sort((a, b) => {
    if (a.total === null && b.total === null) return 0;
    if (a.total === null) return 1;
    if (b.total === null) return -1;
    return a.total - b.total;
  });

  return { lastUpdated, leaderboard, entries };
}
