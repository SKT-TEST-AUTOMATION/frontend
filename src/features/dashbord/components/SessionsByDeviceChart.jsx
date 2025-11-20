import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ChartCard from "./ChartCard";
import ChartLegend from "./ChartLegend";

const data = [
  { name: "Desktop", value: 65 },
  { name: "Mobile", value: 25 },
  { name: "Tablet", value: 10 },
];

const COLORS = ["#1E3AFC", "#3B82F6", "#93C5FD"];

export default function SessionsByDeviceChart() {
  const legends = [
    { name: "Desktop", color: COLORS[0] },
    { name: "Mobile", color: COLORS[1] },
    { name: "Tablet", color: COLORS[2] },
  ];

  return (
    <ChartCard title="Sessions By Device" menu>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend items={legends} centered />
    </ChartCard>
  );
}
