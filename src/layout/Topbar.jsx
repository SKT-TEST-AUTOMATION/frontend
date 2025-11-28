import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ onMenuClick, sidebarCollapsed }) {
  const userRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = () => {
      if (!userRef.current) return;
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header className="sticky top-0 z-10 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 sm:px-6">
      {/* 좌측: 햄버거 (모바일: 항상, 데스크톱: 접혀 있을 때만) */}
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          aria-label="사이드바 토글"
          className={[
            // 기본 스타일
            "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/80 bg-white/80 text-gray-600 shadow-sm hover:bg-gray-100 dark:border-gray-700/60 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-700",
            // 데스크톱(>=lg)에서만 조건부 숨김
            sidebarCollapsed ? "" : "lg:hidden",
          ].join(" ")}
        >
          <span className="material-symbols-outlined leading-none text-[22px]">
            menu
          </span>
        </button>
      </div>

      {/* 우측: 액션들 */}
      <div className="ml-auto flex items-center gap-2">
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="알림"
        >
          <span className="material-symbols-outlined leading-none text-[22px] text-gray-600 dark:text-gray-400">
            notifications
          </span>
        </button>
      </div>
    </header>
  );
}
