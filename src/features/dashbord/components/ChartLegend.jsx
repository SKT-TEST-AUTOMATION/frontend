export default function ChartLegend({ items, centered }) {
  return (
    <div
      className={`flex gap-6 text-sm ${centered ? "justify-center" : ""}`}
    >
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-600">{item.name}</span>
        </div>
      ))}
    </div>
  );
}
