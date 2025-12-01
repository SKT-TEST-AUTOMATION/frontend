import { useEffect, useMemo, useRef, useState } from 'react';
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
  primary: [{ label: '대시보드', href: '/dashboard', icon: 'space_dashboard' }],
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
  ],
  registry: [
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

export default function Sidebar({
                                  open,               // 모바일 드로어 열림 여부
                                  onClose,
                                  user = {},
                                  nav: navProp,       // AppShell에서 내려주는 nav (선택)
                                  collapsed = false,  // 데스크톱에서 접힘 여부
                                  onToggleCollapse,   // 데스크톱에서 토글하는 핸들러 (TopBar에서 호출 예정)
                                }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // nav: prop 이 있으면 사용, 없으면 기본 네비
  const nav = useMemo(buildDefaultNav, []);

  // 섹션 접힘 상태 (효과들보다 위에 선언! TDZ 회피)
  const [isOpen, setIsOpen] = useState({
    testCase: true,
    run: false,
    runResult: false,
    registry: false,
  });

  const toggleSection = (key) =>
    setIsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const goHome = () => {
    navigate('/');
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
    const openSection = isOpen[sectionKey] ?? false;   // 펼침/접힘
    const active = isSectionActive(sectionKey);        // 경로 기준 선택 상태

    const baseWrap =
      'group flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900';

    const activeWrap =
      'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30';
    const neutralWrap =
      'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

    return (
      <div className="mt-2">
        <button
          type="button"
          aria-expanded={openSection}
          aria-controls={`${sectionKey}-section`}
          className={[baseWrap, active ? activeWrap : neutralWrap].join(' ')}
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="flex items-center">
            {meta.icon && <SectionIcon name={meta.icon} active={active} />}
            <span>{meta.title}</span>
          </span>
          <Chevron open={openSection} />
        </button>

        {openSection && (
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

  // ── 스크롤 섀도/상태 영속화/경로 기반 자동 펼침 ──
  const navRef = useRef(null);
  const [scroll, setScroll] = useState({ atTop: true, atBottom: false });

  // localStorage에서 열림 상태 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem('qone.sidebar.isOpen');
      if (raw) setIsOpen((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch (_) {}
  }, []);

  // 열림 상태 저장
  useEffect(() => {
    try {
      localStorage.setItem('qone.sidebar.isOpen', JSON.stringify(isOpen));
    } catch (_) {}
  }, [isOpen]);

  // 현재 경로에 해당하는 섹션 자동 펼침
  useEffect(() => {
    const keys = ['testCase', 'run', 'runResult', 'registry'];
    for (const key of keys) {
      const items = nav?.[key] ?? [];
      const active = items.some((it) => pathname === it.href || pathname.startsWith(it.href + '/'));
      if (active) {
        setIsOpen((prev) => ({ ...prev, [key]: true }));
        break;
      }
    }
  }, [pathname, nav]);

  // 스크롤 위치에 따른 섀도 표시
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      setScroll({ atTop, atBottom });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const content = useMemo(
    () => (
      <div className="flex h-full flex-col min-h-0 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-700/60 shadow-lg">
        {/* Brand (리디자인) */}
        <div
          className="relative flex cursor-pointer items-center gap-3 px-5 h-16 flex-none border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60"


        >

          <div className="min-w-0"           onClick={goHome}
               onKeyDown={onBrandKeyDown}           role="button"
               tabIndex={0}
               aria-label="랜딩 화면으로 이동">
            <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-none whitespace-nowrap">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500">Q-One</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none whitespace-nowrap">
              QA Test Management
            </p>
          </div>

          {/* 데스크톱 접기/펼치기 버튼 (옵션) */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="ml-auto hidden lg:flex items-center justify-center rounded-full w-10 h-10  border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={collapsed ? '사이드바 펼치기' : '사이드바 숨기기'}
            >
              <span className="material-symbols-outlined text-base">
                {collapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          )}
        </div>

        {/* Nav (스크롤 섀도 포함) */}
        <div className="relative flex-1 min-h-0">
          <nav ref={navRef} className="px-3 py-4 space-y-3 overflow-y-auto overscroll-contain h-full">
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

          {/* Scroll shadows */}
          <div
            className={[
              'pointer-events-none absolute top-0 left-0 right-0 h-6',
              'bg-gradient-to-b from-white/90 to-transparent dark:from-slate-900/90',
              'transition-opacity',
              scroll.atTop ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
          />
          <div
            className={[
              'pointer-events-none absolute bottom-0 left-0 right-0 h-6',
              'bg-gradient-to-t from-white/90 to-transparent dark:from-slate-900/90',
              'transition-opacity',
              scroll.atBottom ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
          />
        </div>

        {/* User Profile Footer */}
        <div className="p-4 flex-none border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-semibold shadow-lg">
                {getInitials(user?.name ?? user?.firstName)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                {user?.name ?? 'User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.title ?? 'QA Engineer'}
              </p>
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
    [isOpen, pathname, scroll, user, collapsed] // collapsed 추가(접기 버튼 라벨)
  );

  return (
    <>
      {/* Desktop: 접힘/펼침 애니메이션 */}
      <aside
        className={[
          'relative hidden shrink-0 lg:block transition-[width] duration-300',
          collapsed ? 'w-0' : 'w-64',
        ].join(' ')}
      >
        <div className="sticky top-0 h-dvh overflow-hidden">
          <div
            className={[
              'h-full transition-transform duration-300',
              collapsed ? '-translate-x-full' : 'translate-x-0',
            ].join(' ')}
          >
            {content}
          </div>
        </div>
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
