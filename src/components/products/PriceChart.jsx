import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { formatPrice } from "@/lib/affiliateUtils";
import { motion } from "framer-motion";

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

function EmptyState({ count }) {
  const pct = Math.min(Math.round((count / 90) * 100), 100);
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-3 rounded-xl bg-muted/40 text-center px-6">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <TrendingUp className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-sm">Prishistorik byggs upp</p>
        <p className="text-xs text-muted-foreground mt-1">
          Vi samlar prisdata varje dag. Kom tillbaka om några dagar för att se pristrenden!
        </p>
      </div>
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{count} av 90 dagar insamlade</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// Animated dot for the latest data point
function PulseDot(props) {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="hsl(152, 60%, 42%)" />
      <circle cx={cx} cy={cy} r={8} fill="hsl(152, 60%, 42%)" fillOpacity={0.2}>
        <animate attributeName="r" values="5;11;5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="fill-opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

export default function PriceChart({ priceHistory, lowestPrice }) {
  const chartData = [...priceHistory]
    .sort((a, b) => new Date(a.checked_at || a.created_date) - new Date(b.checked_at || b.created_date))
    .map((entry) => ({
      date: new Date(entry.checked_at || entry.created_date).getTime(),
      dateLabel: format(new Date(entry.checked_at || entry.created_date), "d MMM", { locale: sv }),
      price: entry.price,
    }));

  const count = chartData.length;

  if (count <= 1) return <EmptyState count={count} />;

  const minPrice = Math.min(...chartData.map((d) => d.price)) * 0.95;
  const maxPrice = Math.max(...chartData.map((d) => d.price)) * 1.05;
  const lastIndex = chartData.length - 1;

  return (
    <div className="space-y-2">
      {count >= 2 && count < 7 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span>📊</span>
          <span>Historik samlas in — <strong>{count} av 90 dagar</strong> klara. Grafen blir mer användbar med mer data.</span>
        </div>
      )}
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
              dot={(props) => props.index === lastIndex ? <PulseDot key="pulse" {...props} /> : null}
              activeDot={{ r: 4, fill: "hsl(152, 60%, 42%)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}