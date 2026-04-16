import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { formatPrice } from "@/lib/affiliateUtils";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs text-muted-foreground">{data.dateLabel}</p>
      <p className="font-bold text-sm">{formatPrice(data.price)}</p>
    </div>
  );
}

export default function PriceChart({ priceHistory, lowestPrice, highestPrice }) {
  const chartData = priceHistory
    .sort((a, b) => new Date(a.checked_at || a.created_date) - new Date(b.checked_at || b.created_date))
    .map((entry) => ({
      date: new Date(entry.checked_at || entry.created_date).getTime(),
      dateLabel: format(new Date(entry.checked_at || entry.created_date), "d MMM", { locale: sv }),
      price: entry.price,
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Ingen prishistorik ännu
      </div>
    );
  }

  const minPrice = Math.min(...chartData.map((d) => d.price)) * 0.95;
  const maxPrice = Math.max(...chartData.map((d) => d.price)) * 1.05;

  return (
    <div className="h-64 sm:h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${Math.round(v)}`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          {lowestPrice && (
            <ReferenceLine
              y={lowestPrice}
              stroke="hsl(152, 60%, 42%)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke="hsl(152, 60%, 42%)"
            strokeWidth={2.5}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "hsl(152, 60%, 42%)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}