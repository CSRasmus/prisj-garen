import React from "react";

export default function SparklineChart({ priceHistory, width = 80, height = 30 }) {
  if (!priceHistory || priceHistory.length < 3) return null;

  // Prefer live buybox prices when we have enough; fall back to all (incl. weekly avg) otherwise
  const sortedAll = [...priceHistory].sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at));
  const live = sortedAll.filter(h => h.source !== "easyparser_historical");
  const sorted = live.length >= 3 ? live : sortedAll;
  const prices = sorted.map(h => h.price);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  // Bug 7 fix: add 2px padding in viewBox so stroke edges aren't clipped
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * innerW;
    const y = pad + innerH - ((p - min) / range) * innerH;
    return `${x},${y}`;
  }).join(" ");

  const trend = prices[prices.length - 1] < prices[0] ? "down" : prices[prices.length - 1] > prices[0] ? "up" : "flat";
  const color = trend === "down" ? "#16a34a" : trend === "up" ? "#dc2626" : "#9ca3af";

  return (
    // Bug 7 fix: overflow-hidden instead of overflow-visible
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-hidden">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}