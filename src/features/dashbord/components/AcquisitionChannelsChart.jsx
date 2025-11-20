import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import ChartCard from "./ChartCard";
import ChartLegend from "./ChartLegend";

const data = [
  { month: "Jan", direct: 45, referral: 20, organic: 25, social: 15 },
  { month: "Feb", direct: 50, referral: 22, organic: 28, social: 18 },
  { month: "Mar", direct: 48, referral: 21, organic: 26, social: 17 },
  { month: "Apr", direct: 52, referral: 23, organic: 25, social: 16 },
  { month: "May", direct: 40, referral: 18, organic: 22, social: 14 },
  { month: "Jun", direct: 47, referral: 19, organic: 24, social: 15 },
  { month: "Jul", direct: 55, referral: 25, organic: 27, social: 17 },
  { month: "Aug", direct: 53, referral: 23, organic: 26, social: 16 },
];

export default function AcquisitionChannelsChart() {
  const legends = [
    { name: "Direct", color: "#1E3AFC" },
    { name: "Referral", color: "#3B82F6" },
    { name: "Organic Search", color: "#60A5FA" },
    { name: "Social", color: "#93C5FD" },
  ];

  return (
    <ChartCard title="Acquisition Channels">
      <ChartLegend items={legends} />

      <div className="mt-4 w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="month" tick={{ fill: "#94A3B8" }} />
            <YAxis tick={{ fill: "#94A3B8" }} />
            <Tooltip />

            <Bar dataKey="direct" stackId="a" fill="#1E3AFC" radius={[4, 4, 0, 0]} />
            <Bar dataKey="referral" stackId="a" fill="#3B82F6" />
            <Bar dataKey="organic" stackId="a" fill="#60A5FA" />
            <Bar dataKey="social" stackId="a" fill="#93C5FD" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
