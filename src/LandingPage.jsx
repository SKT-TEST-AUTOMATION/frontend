import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function LandingPage() {
  const services = [
    {
      id: "uiux",
      title: "UI/UX 검증",
      icon: "devices",
      description: "사용자 경험과 인터페이스의 완성도를 높이는 전문 테스트 서비스입니다.",
      primary: true,
    },
    {
      id: "data",
      title: "데이터 정합성 검증",
      icon: "data_check",
      description: "데이터의 일관성과 정확성을 보장하여 서비스 신뢰도를 향상시킵니다.",
      primary: false,
      action: () => alert("해당 서비스는 준비 중입니다."),
    },
  ];

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="relative flex min-h-screen w-full max-w-[100vw] overflow-x-hidden flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div className="pointer-events-none absolute -top-10 -left-12 h-28 w-28 rounded-3xl bg-blue-200/50 dark:bg-blue-900/30 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-3xl bg-cyan-200/50 dark:bg-cyan-900/30 blur-2xl" aria-hidden />
      {/* 상단 그라데이션 */}
      <div className="absolute top-0 h-1.5 w-full bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400" />

      <main className="flex w-full max-w-[100vw] overflow-x-hidden flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="relative w-full max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/70 backdrop-blur-md shadow-lg">
            <div className="px-8 py-10 text-center">
              <h1 className="font-black tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-gray-900 dark:text-white">
                Q-One
              </h1>
              <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 sm:text-2xl">
                The All-in-One QA Platform
              </p>

              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-col rounded-xl border border-gray-200 bg-white dark:bg-gray-800 p-6 text-left transition-all duration-300 sm:hover:scale-105 sm:hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3879fa]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 grid place-items-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 shadow-sm animate-[float_3s_ease-in-out_infinite]">
                        <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-sky-300">
                          {service.icon}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {service.title}
                      </h3>
                    </div>
                    <p className="mt-3 flex-grow text-gray-600 dark:text-gray-300">
                      {service.description}
                    </p>
                    {service.primary ? (
                      <Link
                        to="/dashboard"
                        className="mt-6 block text-center rounded-lg px-6 py-3 text-base font-bold bg-[#3879fa] text-white hover:shadow-lg hover:shadow-[#3879fa]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3879fa]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                      >
                        바로 시작하기
                      </Link>
                    ) : (
                      <button
                        aria-disabled
                        disabled
                        className="mt-6 w-full rounded-lg px-6 py-3 text-base font-bold border border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500"
                      >
                        준비 중
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <a href="#more-services" className="absolute bottom-10 flex cursor-pointer flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <span className="material-symbols-outlined animate-bounce">keyboard_arrow_down</span>
          <span>더 많은 QA 서비스 보기</span>
        </a>
        <section id="more-services" className="mt-24" />
        <style>{`
          @keyframes float {
            0% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
            100% { transform: translateY(0); }
          }
        `}</style>
      </main>
    </div>
  );
}