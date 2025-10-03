import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ onMenuClick }) {
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
      {/* 좌측: 햄버거 (모바일) */}
      <div className="flex items-center">
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/80 bg-white/80 text-gray-600 shadow-sm hover:bg-gray-100 lg:hidden dark:border-gray-700/60 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-700"
          onClick={onMenuClick}
          aria-label="사이드바 열기"
        >
          <span className="material-symbols-outlined leading-none text-[22px]">menu</span>
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

        {/* 유저 메뉴 (주석 유지하되 아이콘 정렬만 통일) */}
        {/* <div className="relative" ref={userRef}>
          <button
            onClick={() => setOpenUser((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200/80 bg-white/80 px-3 text-gray-700 shadow-sm transition hover:bg-gray-100 dark:border-gray-700/60 dark:bg-gray-800/60 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-haspopup="menu"
            aria-expanded={openUser}
          >
            <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-full w-7 h-7 flex items-center justify-center text-white font-semibold text-sm leading-none">
              김
            </div>
            <span className="hidden sm:inline text-sm leading-none">{user?.name || '김지수'}</span>
            <span className="material-symbols-outlined leading-none text-[18px]">expand_more</span>
          </button>

          {openUser && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 p-1.5 shadow-2xl backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-800/80"
            >
              <button
                role="menuitem"
                onClick={() => { setOpenUser(false); navigate('/profile'); }}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                프로필
              </button>
              <button
                role="menuitem"
                onClick={() => { setOpenUser(false); navigate('/settings'); }}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                설정
              </button>
              <div className="my-1 border-t border-gray-200/80 dark:border-gray-700/60" />
              <button
                role="menuitem"
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                로그아웃
              </button>
            </div>
          )}
        </div> */}
      </div>
    </header>
  );
}
