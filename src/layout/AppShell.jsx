import { useState, useMemo } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

export default function AppShell({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 전체 네비 구성 AppShell에서 관리
  const nav = useMemo(
    () => ({
      primary: [
        { label: '대시보드', href: '/dashboard' },
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

  return (
    <>
    <style
      dangerouslySetInnerHTML={{
        __html: `
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');
    .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
    `,
      }}
    />

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
        nav={nav}
        user={user}
      />

      {/* 본문 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setSidebarOpen(true)} user={user} />
        <main className="flex-grow p-6">{children}</main>
      </div>
    </div>
    </>
  );
}
