import { fetchSheetData } from "@/lib/sheet";
import Leaderboard from "./leaderboard";

// No cache - always fetch fresh on each request
export const revalidate = 0;

export default async function Home() {
  let data;
  try {
    data = await fetchSheetData();
  } catch {
    data = { lastUpdated: null, leaderboard: [], entries: [] };
  }
  return <Leaderboard data={data} />;
}
