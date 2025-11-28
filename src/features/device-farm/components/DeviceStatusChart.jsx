import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function DeviceStatusChart({ devices }) {
  const stats = React.useMemo(() => {
    let available = 0;
    let busy = 0;
    let offline = 0;

    devices.forEach((d) => {
      if (d.available) available++;
      else if (d.busy) busy++;
      else offline++;
    });

    return [
      { name: "Available", value: available, color: "#10b981" }, // Emerald 500
      { name: "Busy", value: busy, color: "#f59e0b" }, // Amber 500
      { name: "Offline", value: offline, color: "#94a3b8" }, // Slate 400
    ].filter((i) => i.value > 0);
  }, [devices]);

  if (devices.length === 0) return null;

  return (
    <div className="h-24 w-24 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={stats}
            cx="50%"
            cy="50%"
            innerRadius={25}
            outerRadius={40}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {stats.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            itemStyle={{ fontSize: "12px", fontWeight: 600 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
