import { useState, useMemo, useEffect } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

export default function AppShell({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);      // 모바일 드로어
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // 데스크톱 접힘

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // 전체 네비 구성 AppShell에서 관리
  const nav = useMemo(
    () => ({
      primary: [
        { label: '대시보드', href: '/dashboard', icon: 'space_dashboard' },
      ],
      testCase: [
        { label: '케이스 목록', href: '/testcases' },
        { label: '케이스 등록', href: '/testcases/new' },
        { label: '시나리오 목록', href: '/scenarios' },
        { label: '시나리오 등록', href: '/scenarios/new' },
      ],
      run: [
        { label: '테스트 실행', href: '/runs' },
        { label: '테스트 배치', href: '/batches' },
      ],
      runResult: [
        { label: '테스트 결과 목록', href: '/runs/results' },
        { label: '이슈 관리', href: '/runs/issues' },
        { label: '결과 보고서', href: '/runs/reports' },
      ],
      registry : [
        { label: '테스트 레지스트리', href: '/registry' },
        { label: '단말 관리', href: '/registry/devices' },
      ],
      singles: [
        { label: '테스트 결과 관리', href: '/runs/results' },
        { label: '테스트 레지스트리', href: '/registry' },
      ],
    }),
    []
  );

  const handleMenuClick = () => {
    // 간단한 브레이크포인트 분기 (lg = 1024px 기준)
    if (window.innerWidth < 1024) {
      // 모바일: 드로어 열기
      setSidebarOpen(true);
    } else {
      // 데스크톱: 사이드바 접기/펼치기
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-800 font-sans text-gray-900 dark:text-gray-100">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        nav={nav}
        user={user}
      />

      {/* 본문 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={handleMenuClick} user={user} sidebarCollapsed={sidebarCollapsed}/>
        <main className="flex-grow p-6">{children}</main>
      </div>
    </div>
  );
}
