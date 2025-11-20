
export default function EvidenceModal({ open, images, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-4xl w-[92vw] max-h-[85vh] overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">오류 증거</h3>
          <button
            className="inline-flex items-center px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={onClose}
            title="닫기"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        {(!images || images.length === 0) ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">표시할 증거가 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((src, idx) => (
              <div key={`${src}-${idx}`} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800">
                <img
                  src={src}
                  alt={`evidence-${idx+1}`}
                  className="w-full h-auto object-contain max-h-[60vh]"
                  onError={(e) => { e.currentTarget.alt = '이미지를 불러올 수 없습니다.'; }}
                  loading="lazy"
                />
                <div className="px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">{src}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}