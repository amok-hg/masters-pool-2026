"use client";

import { useState, useEffect, useCallback } from "react";
import type { SheetData, EntryRow } from "@/lib/sheet";
import { csvLine, parseSheetCSV, SHEET_ID } from "@/lib/sheet";

const REFRESH_MS = 15 * 60 * 1000;
const TIER_LABELS = ["T1", "T2", "T3", "T4", "T5", "T6"];

function fmt(n: number | null): string {
  if (n === null) return "–";
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}
function scoreClass(n: number | null) {
  if (n === null) return "";
  if (n < 0) return "score-under";
  if (n > 0) return "score-over";
  return "score-even";
}
function rankLabel(r: number) {
  if (r === 1) return "🥇";
  if (r === 2) return "🥈";
  if (r === 3) return "🥉";
  return `${r}`;
}

// Which 4 of 6 picks are counting (lowest scores, null treated as +8)
function countingIndices(scores: (number | null)[]): Set<number> {
  const withIdx = scores.map((s, i) => ({ s: s ?? 8, i }));
  withIdx.sort((a, b) => a.s - b.s);
  return new Set(withIdx.slice(0, 4).map((x) => x.i));
}

async function fetchLive(): Promise<SheetData | null> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Leaderboard&t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    return parseSheetCSV(text);
  } catch {
    return null;
  }
}

export default function Leaderboard({ data: initial }: { data: SheetData }) {
  const [data, setData] = useState<SheetData>(initial);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    const fresh = await fetchLive();
    if (fresh) {
      setData(fresh);
      setLastFetch(new Date());
    }
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const { leaderboard, entries, lastUpdated } = data;
  const hasScores = leaderboard.some((r) => r.total !== null);
  const entryCount = leaderboard.length;
  const pot = entryCount * 25;

  // Assign ranks with tie handling
  let rank = 1;
  const ranked = leaderboard.map((row, i) => {
    if (i > 0 && row.total !== leaderboard[i - 1].total) rank = i + 1;
    return { ...row, rank };
  });

  const displayTime = lastUpdated
    ? `Sheet updated ${lastUpdated}`
    : `Fetched ${lastFetch.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  return (
    <>
      {/* ── Header ── */}
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-logo">
            ⛳ Masters Pool <span>2026</span>
          </div>
          {hasScores && (
            <div className="live-badge">
              <div className="live-dot" />
              Live
            </div>
          )}
        </div>
      </header>

      <div className="page">
        {/* ── Hero ── */}
        <div className="hero fade-up">
          <div className="hero-eyebrow">Augusta National · April 9–12, 2026</div>
          <h1 className="hero-title">Leaderboard</h1>
          <div className="hero-meta">
            <div className="hero-stat">
              <span className="hero-stat-val">{entryCount}</span>
              <span className="hero-stat-lbl">Players</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-val">${pot}</span>
              <span className="hero-stat-lbl">Total Pot</span>
            </div>
            {pot > 0 && [60, 30, 10].map((pct, i) => (
              <div className="hero-stat" key={i}>
                <span className="hero-stat-val">${Math.floor(pot * pct / 100)}</span>
                <span className="hero-stat-lbl">{["1st", "2nd", "3rd"][i]} Place</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Last updated ── */}
        <div className="last-updated fade-up s2">
          <span>{displayTime}</span>
          <span style={{ color: "#bbb" }}>· auto-refreshes every 15 min</span>
        </div>

        {/* ── Pre-tournament state ── */}
        {!hasScores && (
          <div className="fade-up s3" style={{
            background: "var(--green-50)",
            border: "1px solid var(--green-200)",
            borderRadius: 10,
            padding: "28px 24px",
            textAlign: "center",
            marginBottom: 32,
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>🏌️</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "var(--green-800)", marginBottom: 6 }}>
              Tournament starts Thursday April 9
            </p>
            <p style={{ fontSize: ".85rem", color: "var(--ink-4)" }}>
              Scores will appear here once the first round begins.
            </p>
          </div>
        )}

        {/* ── Leaderboard table ── */}
        {leaderboard.length > 0 && (
          <div className="fade-up s3">
            <table className="lb-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Player</th>
                  <th className="right" style={{ width: 80 }}>Score</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {ranked.map((row, i) => {
                  const isExpanded = expanded.has(row.name);
                  const entry = entries.find((e) => e.name === row.name);
                  const stagger = `s${Math.min(i + 4, 11)}`;

                  return (
                    <>
                      <tr
                        key={row.name}
                        className={`lb-row fade-up ${stagger} ${isExpanded ? "expanded" : ""} ${row.rank === 1 && hasScores ? "rank-1" : ""}`}
                        onClick={() => toggleExpand(row.name)}
                      >
                        <td className="lb-rank">{hasScores ? rankLabel(row.rank) : "–"}</td>
                        <td className="lb-name">{row.name}</td>
                        <td className={`lb-score ${scoreClass(row.total)}`}>
                          {fmt(row.total)}
                        </td>
                        <td className={`lb-chevron ${isExpanded ? "open" : ""}`}>▾</td>
                      </tr>

                      {isExpanded && entry && (
                        <tr key={`${row.name}-expand`} className="expand-row">
                          <td colSpan={4}>
                            <PicksGrid entry={entry} hasScores={hasScores} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Rules reminder ── */}
        <div className="fade-up" style={{
          background: "var(--green-50)",
          border: "1px solid var(--green-200)",
          borderRadius: 8,
          padding: "14px 18px",
          fontSize: ".8rem",
          color: "var(--ink-3)",
          lineHeight: 1.6,
        }}>
          <strong style={{ color: "var(--green-800)" }}>Scoring:</strong> Best 4 of 6 golfer scores count.
          Missed cut = +8. Lowest combined score wins. $25 entry · 60/30/10 prize split.
        </div>
      </div>

      <footer className="site-footer">
        Masters Pool 2026 · scores refresh every 15 min · data via Google Sheets
      </footer>
    </>
  );
}

function PicksGrid({ entry, hasScores }: { entry: EntryRow; hasScores: boolean }) {
  const counting = countingIndices(entry.scores);

  return (
    <div className="expand-inner">
      {entry.picks.map((pick, i) => {
        const score = entry.scores[i];
        const isCounting = counting.has(i);

        return (
          <div
            key={i}
            className={`pick-card ${hasScores ? (isCounting ? "counting" : "dropped") : ""}`}
          >
            <div className="pick-left">
              <div className="pick-tier">{TIER_LABELS[i]}</div>
              <div className="pick-name">{pick || "–"}</div>
              {hasScores && isCounting && (
                <div className="pick-counting-label">counting</div>
              )}
            </div>
            {hasScores && (
              <div className={`pick-score font-mono ${scoreClass(score)}`}>
                {fmt(score)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
