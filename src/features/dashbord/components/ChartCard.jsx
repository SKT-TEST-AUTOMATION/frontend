export default function ChartCard({ title, children, menu }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>

        {menu && (
          <button className="text-gray-400 hover:text-gray-600">
            •••
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
