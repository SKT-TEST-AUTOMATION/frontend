import { createBrowserRouter } from 'react-router-dom';
import Layout from './layout/Layout';
import DasbordPage from './features/dashbord/pages/DasbordPage';
import ScenarioListPage from './features/scenario/pages/ScanarioListPage';
import ScenarioDetailPage from './features/scenario/pages/ScenarioDetailPage';
import TestResultListPage from './features/testresult/pages/TestResultListPage';
import TestCaseCreatePage from './features/testcase/pages/TestCaseCreatePage';
import TestCaseDetailPage from './features/testcase/pages/TestCaseDetailPage';
import TestCaseListPage from './features/testcase/pages/TestCaseListPage';
import ScenarioCreatePage from './features/scenario/pages/ScenarioCreatePage';
import NotFoundPage from './NotFoundPage';
import DeviceFarmPage from './features/device-farm/DeviceFarmPage';
import ScenarioTestListPage from './features/runs/pages/ScenarioTestListPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />, // 공통 레이아웃
    children: [
      { index: true, element: <DasbordPage /> },        // /
      { path: 'dashboard', element: <DasbordPage /> },  // /dashboard
      { path: 'testcases',
        children: [
          { index: true, element: <TestCaseListPage /> },
          { path: ':testCaseId/detail', element: <TestCaseDetailPage /> },
          { path: 'new', element: <TestCaseCreatePage /> }
        ]
      },
      { path: 'scenarios',
        children: [
          { index: true, element: <ScenarioListPage /> },
          { path: ':scenarioId/detail', element: <ScenarioDetailPage /> },
          { path: 'new', element: <ScenarioCreatePage /> }
        ]
      },
      {
        path: 'runs',
        children: [
          { index: true, element: <ScenarioTestListPage /> },
        ]
      },
      { path: '/results', element: <TestResultListPage /> },
      { path: 'registry/devices', element: <DeviceFarmPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
