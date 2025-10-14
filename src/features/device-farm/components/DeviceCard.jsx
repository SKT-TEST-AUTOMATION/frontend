

export default function DeviceCard({ d, onDetail, onSave }) {
  const dotClass = d.available ? "bg-green-500" : d.busy ? "bg-gray-400" : "bg-gray-300";
  const statusText = d.available ? "available" : d.busy ? "in use" : "offline";

  const shortUdid = d.udid.length > 10 ? d.udid.slice(0, 8) + "..." : d.udid;

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm p-4 w-72">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold leading-tight">{d.name}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass}`} />
          <span>{statusText}</span>
        </div>
      </div>

      <dl className="mt-3 text-sm text-gray-700 space-y-1">
        <div className="flex justify-between"><dt className="text-gray-500">UDID</dt><dd className="font-medium">{shortUdid}</dd></div>
        <div className="flex justify-between"><dt className="text-gray-500">Platform</dt><dd className="font-medium">{d.platform}</dd></div>
        <div className="flex justify-between"><dt className="text-gray-500">Appium Port</dt><dd className="font-medium">{d.appiumPort}</dd></div>
        <div className="flex justify-between"><dt className="text-gray-500">System Port</dt><dd className="font-medium">{d.systemPort ?? "-"}</dd></div>
      </dl>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onDetail?.(d)}
          className="flex-1 rounded-lg bg-blue-600 text-white py-2 hover:bg-blue-700"
        >
          상세 보기
        </button>
        <button
          disabled={!d.available}
          onClick={() => onSave?.(d)}
          className={`rounded-lg px-3 py-2 border ${d.available ? "border-blue-600 text-blue-600 hover:bg-blue-50" : "border-gray-200 text-gray-400 cursor-not-allowed"}`}
          title={d.available ? "이 단말 저장" : "사용 불가 상태"}
        >
          저장
        </button>
      </div>
    </div>
  );
}
