import React from "react";

export default function SparklineChart({ priceHistory, width = 80, height = 30 }) {
  if (!priceHistory || priceHistory.length < 3) return null;

  const sorted = [...priceHistory].sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at));
  const prices = sorted.map(h => h.price);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const trend = prices[prices.length - 1] < prices[0] ? "down" : prices[prices.length - 1] > prices[0] ? "up" : "flat";
  const color = trend === "down" ? "#16a34a" : trend === "up" ? "#dc2626" : "#9ca3af";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
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