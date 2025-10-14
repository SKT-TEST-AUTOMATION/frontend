import { useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

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

// 섹션/대시보드용 아이콘 (활성 시 블루, 비활성 시 뉴트럴)
function SectionIcon({ name, active }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'material-symbols-outlined',
        'shrink-0 mr-2 text-lg transition-colors duration-200',
        active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500',
      ].join(' ')}
    >
      {name}
    </span>
  );
}

const getInitials = (name = '') => {
  const p = String(name).trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'U';
  if (p.length === 1) return p[0].slice(0, 1).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const buildDefaultNav = () => ({
  primary: [{ label: '대시보드', href: '/dashboard', icon: 'space_dashboard' }], // 대시보드 아이콘
  testCase: [
    { label: '케이스 목록', href: '/testcases' },
    { label: '케이스 등록', href: '/testcases/new' },
    { label: '시나리오 목록', href: '/scenarios' },
    { label: '시나리오 등록', href: '/scenarios/new' },
  ],
  run: [
    { label: '테스트 실행', href: '/runs' },
    { label: '테스트 배치', href: '/runs/batches' },
  ],
  runResult: [
    { label: '테스트 결과 목록', href: '/results' },
    { label: '이슈 관리', href: '/results/issues' },
    { label: '결과 보고서', href: '/results/reports' },
  ],
  registry: [
    // { label: '테스트 레지스트리', href: '/registry' },
    { label: '디바이스 관리', href: '/registry/devices' },
  ],
});

// 제목/아이콘만 보유 (색상은 활성/비활성에 따라 런타임 결정)
const SECTION_META = {
  testCase:  { title: '테스트 케이스 관리', icon: 'assignment' },
  run:       { title: '테스트 실행 관리',   icon: 'play_circle' },
  runResult: { title: '테스트 결과 관리',   icon: 'analytics' },
  registry:  { title: '테스트 레지스트리',  icon: 'devices' },
};

export default function Sidebar({ open, onClose, user = {} }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const nav = useMemo(buildDefaultNav, []);

  const [isOpen, setIsOpen] = useState({
    testCase: true,
    run: false,
    runResult: false,
    registry: false,
  });

  const toggleSection = (key) =>
    setIsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

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

  // 현재 경로가 섹션 하위에 속하는지(선택 여부)
  const isSectionActive = (sectionKey) => {
    const items = nav?.[sectionKey] ?? [];
    return items.some((it) => pathname === it.href || pathname.startsWith(it.href + '/'));
  };

  // ── 상위 메뉴(섹션 헤더/대시보드) 공통 톤 ──
  const topBase =
    'group flex items-center px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900';

  const topActive =
    'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30';

  const topNeutral =
    'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

  // 드롭다운 내부 링크: 선택 시 블루
  const subLinkClass = (isActive) =>
    [
      'block px-3 py-2 text-sm rounded-md transition-all duration-200 outline-none',
      'focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
      isActive
        ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20'
        : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800',
    ].join(' ');

  // 좌측 인디케이터 : 선택 시만 표시
  const renderWithIndicator = (content, isActive) => (
    <span className="relative flex items-center">
      {content}
      <span
        className={[
          'absolute -left-3 top-1/2 w-0.5 h-4 -translate-y-1/2 rounded-full bg-blue-500 transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </span>
  );

  // 드롭다운 섹션(1레벨 헤더): 선택 시 블루, 비선택 시 뉴트럴
  const DropdownSection = ({ sectionKey }) => {
    const items = nav?.[sectionKey] ?? [];
    if (!items.length) return null;

    const meta = SECTION_META[sectionKey] ?? { title: sectionKey };
    const open = isOpen[sectionKey] ?? false;         // 펼침/접힘
    const active = isSectionActive(sectionKey);        // 경로 기준 선택 상태

    const baseWrap =
      'group flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900';

    // 요구사항: 선택 시 기존 CSS 유지, 비선택 시 뉴트럴
    const activeWrap =
      'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30';
    const neutralWrap =
      'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

    return (
      <div className="mt-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${sectionKey}-section`}
          className={[baseWrap, active ? activeWrap : neutralWrap].join(' ')}
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="flex items-center">
            {meta.icon && <SectionIcon name={meta.icon} active={active} />}
            <span>{meta.title}</span>
          </span>
          <Chevron open={open} />
        </button>

        {open && (
          <div
            id={`${sectionKey}-section`}
            className="mt-2 ml-6 space-y-1 border-l-2 border-slate-100 dark:border-slate-700 pl-4"
          >
            {items.map((it) => (
              <NavLink
                key={it.href}
                to={it.href}
                end
                onClick={onClose}
                className={({ isActive }) => subLinkClass(isActive)}
              >
                {({ isActive }) => renderWithIndicator(it.label, isActive)}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

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

          {/* 대시보드(Primary) — 아이콘 포함, 선택 시 블루/비선택 시 뉴트럴 */}
          {(nav?.primary ?? []).map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end
              onClick={onClose}
              className={({ isActive }) => [topBase, isActive ? topActive : topNeutral].join(' ')}
            >
              {({ isActive }) =>
                renderWithIndicator(
                  <span className="flex items-center">
                    {item.icon && <SectionIcon name={item.icon} active={isActive} />}
                    <span>{item.label}</span>
                  </span>,
                  isActive
                )
              }
            </NavLink>
          ))}

          {/* 드롭다운 섹션들 */}
          <DropdownSection sectionKey="testCase" />
          <DropdownSection sectionKey="run" />
          <DropdownSection sectionKey="runResult" />
          <DropdownSection sectionKey="registry" />

          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3 my-2" />
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-semibold shadow-lg">
                {getInitials(user?.name ?? user?.firstName)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.title ?? 'QA Engineer'}</p>
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
    [isOpen, pathname]
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
