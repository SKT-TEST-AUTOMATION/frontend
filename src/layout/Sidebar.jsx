import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function Chevron({ open }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-block select-none text-sm',
        'transition-transform duration-200 ease-in-out',
        open ? 'rotate-180' : 'rotate-0',
      ].join(' ')}
    >
      ⌄
    </span>
  );
}

export default function Sidebar({ open, onClose, nav, user }) {
  const navigate = useNavigate();
  const [isTestCaseOpen, setIsTestCaseOpen] = useState(true);
  const [isRunOpen, setIsRunOpen] = useState(false);

  const goHome = () => {
    const fallback = '/dashboard';
    const target = nav?.primary?.[0]?.href ?? fallback;
    navigate(target);
    onClose?.();
  };

  const onBrandKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goHome();
    }
  };

  const navLinkClass = (isActive) =>
    [
      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 outline-none',
      'focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
      isActive
        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400',
    ].join(' ');

  const subLinkClass = (isActive) =>
    [
      'block px-3 py-2 text-sm rounded-md transition-all duration-200 outline-none',
      'focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
      isActive
        ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20'
        : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800',
    ].join(' ');

  // 공통 렌더: 인디케이터를 isActive로 제어
  const renderWithIndicator = (label, isActive) => (
    <span className="relative">
      {label}
      <span
        className={[
          'absolute -left-3 top-1/2 w-0.5 h-4 -translate-y-1/2 rounded-full bg-blue-500 transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </span>
  );

  const content = useMemo(
    () => (
      <div className="flex h-full w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-700/60 shadow-lg">
        {/* Brand */}
        <div
          className="flex cursor-pointer items-center px-6 h-16 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700"
          onClick={goHome}
          onKeyDown={onBrandKeyDown}
          role="button"
          tabIndex={0}
          aria-label="대시보드로 이동"
        >
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Q-One</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">QA Test Management</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
          <div className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            메인 메뉴
          </div>

          {/* 1) 상단 단일 링크들 (primary) */}
          {(nav?.primary ?? []).map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end
              onClick={onClose}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              {({ isActive }) => renderWithIndicator(item.label, isActive)}
            </NavLink>
          ))}

          {/* 2) 테스트 케이스 관리 (드롭다운) */}
          {nav?.testCase?.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                aria-expanded={isTestCaseOpen}
                aria-controls="tc-section"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
                onClick={() => setIsTestCaseOpen((v) => !v)}
              >
                <span>테스트 케이스 관리</span>
                <Chevron open={isTestCaseOpen} />
              </button>

              {isTestCaseOpen && (
                <div id="tc-section" className="mt-2 ml-6 space-y-1 border-l-2 border-slate-100 dark:border-slate-700 pl-4">
                  {/* 목록 경로에는 end 적용 */}
                  <NavLink to="/testcases" end onClick={onClose} className={({ isActive }) => subLinkClass(isActive)}>
                    {({ isActive }) => renderWithIndicator('케이스 목록', isActive)}
                  </NavLink>
                  <NavLink to="/testcases/new" onClick={onClose} className={({ isActive }) => subLinkClass(isActive)}>
                    {({ isActive }) => renderWithIndicator('케이스 등록', isActive)}
                  </NavLink>
                  <NavLink to="/scenarios" end onClick={onClose} className={({ isActive }) => subLinkClass(isActive)}>
                    {({ isActive }) => renderWithIndicator('시나리오 목록', isActive)}
                  </NavLink>
                  <NavLink to="/scenarios/new" onClick={onClose} className={({ isActive }) => subLinkClass(isActive)}>
                    {({ isActive }) => renderWithIndicator('시나리오 등록', isActive)}
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* 3) 테스트 실행 관리 (드롭다운) */}
          {nav?.run?.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                aria-expanded={isRunOpen}
                aria-controls="run-section"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/50"
                onClick={() => setIsRunOpen((v) => !v)}
              >
                <span>테스트 실행 관리</span>
                <Chevron open={isRunOpen} />
              </button>

              {isRunOpen && (
                <div id="run-section" className="mt-2 ml-6 space-y-1 border-l-2 border-slate-100 dark:border-slate-700 pl-4">
                  <NavLink to="/runs" end onClick={onClose} className={({ isActive }) => subLinkClass(isActive)}>
                    {({ isActive }) => renderWithIndicator('테스트 실행', isActive)}
                  </NavLink>
                  <NavLink to="/batches" end onClick={onClose} className={({ isActive }) => subLinkClass(isActive)}>
                    {({ isActive }) => renderWithIndicator('테스트 배치', isActive)}
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* 4) 하단 단일 링크들 (singles) */}
          {nav?.singles?.length > 0 && (
            <div className="mt-4 space-y-2">
              {nav.singles.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end
                  onClick={onClose}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  {({ isActive }) => renderWithIndicator(item.label, isActive)}
                </NavLink>
              ))}
            </div>
          )}

          {/* 구분선 */}
          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3 my-2" />
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-semibold shadow-lg">
                {user.firstName}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">QA Engineer</p>
            </div>
            <button
              type="button"
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
              aria-label="메뉴 더보기"
            >
              <span className="material-symbols-outlined text-slate-400 text-lg">more_vert</span>
            </button>
          </div>
        </div>
      </div>
    ),
    [isTestCaseOpen, isRunOpen, nav]
  );

  return (
    <>
      {/* Desktop */}
      <aside className="relative hidden shrink-0 lg:block">
        <div className="sticky top-0 h-dvh">{content}</div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-64 transform shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="사이드바"
      >
        {content}
      </aside>
    </>
  );
}
