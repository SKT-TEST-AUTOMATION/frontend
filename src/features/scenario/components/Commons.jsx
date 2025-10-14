export function Field({ label, required, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </div>
      {children}
    </label>
  );
}

export function SkeletonScenarioDetail() {
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-3 animate-pulse" />
        </div>
        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
          <div className="md:col-span-2 space-y-2">
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="px-6 py-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </>
  );
}

export function CaseSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
