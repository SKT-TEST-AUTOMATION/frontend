import { Link, useLocation, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] w-full grid place-items-center p-6">
      <div className="relative w-full max-w-xl">
        <div className="pointer-events-none absolute -top-10 -left-12 h-28 w-28 rounded-3xl bg-blue-200/50 dark:bg-blue-900/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-3xl bg-cyan-200/50 dark:bg-cyan-900/30 blur-2xl" />

        <div className="relative overflow-hidden rounded-3xl border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/70 backdrop-blur-md shadow-lg">
          {/* 상단 라인 */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400" />

          <div className="px-8 py-9 text-center">
            {/* 아이콘 버블 */}
            <div className="mx-auto mb-5 h-20 w-20 grid place-items-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 shadow-sm animate-[float_3s_ease-in-out_infinite]">
              <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-sky-300 select-none">
                explore_off
              </span>
            </div>

            <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              페이지를 찾을 수 없습니다.
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              주소가 변경되었거나 삭제되었을 수 있어요.
            </p>

            {/* 현재 경로 뱃지 */}
            <p className="mt-3 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-900/50 px-3 py-1 font-mono text-gray-700 dark:text-gray-200">
                <span className="text-gray-400">path</span>
                
                <span>{pathname}</span>
              </span>
            </p>

            {/* 액션 버튼 */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                이전 페이지
              </button>

              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-300/70"
              >
                <span className="material-symbols-outlined text-base">home</span>
                홈으로
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              문제가 계속되면 관리자에게 문의해주세요.
            </p>
          </div>
        </div>
      </div>

      {/* keyframes: float */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
