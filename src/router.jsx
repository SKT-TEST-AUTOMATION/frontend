import { createBrowserRouter } from 'react-router-dom';
import Layout from './layout/Layout';
import DasbordPage from './features/dashbord/pages/DasbordPage';
import ScenarioListPage from './features/scenario/pages/ScanarioListPage';
import ScenarioDetailPage from './features/scenario/pages/ScenarioDetailPage';
import TestResultListPage from './features/testresult/pages/TestResultListPage';
import TestCaseCreatePage from './features/testcase/pages/TestCaseCreatePage';
import TestCaseDetailPage from './features/testcase/pages/TestCaseDetailPage';
import TestCaseListPage from './features/testcase/pages/TestCaseListPage';

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
          { path: ':scenarioId/detail', element: <ScenarioDetailPage /> }
        ]
      },
      { path: 'runs/results', element: <TestResultListPage /> },
      { path: '*', element: <div className="p-6">404 Not Found</div> },
    ],
  },
]);
