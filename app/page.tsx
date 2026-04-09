import { fetchSheetData } from "@/lib/sheet";
import Leaderboard from "./leaderboard";

export const revalidate = 1800; // 30 min server-side cache

export default async function Home() {
  let data;
  try {
    data = await fetchSheetData();
  } catch {
    data = { lastUpdated: null, leaderboard: [], entries: [] };
  }

  return <Leaderboard data={data} />;
}
