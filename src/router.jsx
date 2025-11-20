import { createBrowserRouter } from "react-router-dom";
import Layout from "./layout/Layout";
import DashboardPage from "./features/dashbord/pages/DashboardPage.jsx";
import ScenarioListPage from "./features/scenario/pages/ScanarioListPage";
import ScenarioDetailPage from "./features/scenario/pages/ScenarioDetailPage";
import TestResultListPage from "./features/testresult/pages/TestResultListPage";
import TestCaseCreatePage from "./features/testcase/pages/TestCaseCreatePage";
import TestCaseDetailPage from "./features/testcase/pages/TestCaseDetailPage";
import TestCaseListPage from "./features/testcase/pages/TestCaseListPage";
import ScenarioCreatePage from "./features/scenario/pages/ScenarioCreatePage";
import NotFoundPage from "./NotFoundPage";
import DeviceFarmPage from "./features/device-farm/DeviceFarmPage";
import ScenarioTestListPage from "./features/runs/pages/ScenarioTestListPage";
import LandingPage from "./LandingPage";
import TestCaseListPageDummy from "./features/testcase/pages/TestCaseListPageDummy";
import ScenarioListPageDummy from "./features/scenario/pages/ScenarioListPageDummy";
import DeviceFarmPageDummy from "./features/device-farm/DeviceFarmPageDummy";
import TestScheduleListPage from "./features/runs/pages/TestScheduleListPage";
import TestScheduleDetailPage from './features/runs/pages/TestScheduleDetailPage.jsx';

export const routes = [
  { path: "/", element: <LandingPage /> },
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/dashboard", children: [
          {
            index: true, element: <DashboardPage />
          },
        ],
      },
      { path: "testcases", children: [
          { index: true, element: <TestCaseListPage /> },
          { path: "dummy", element: <TestCaseListPage /> },
          { path: ":testCaseId/detail", element: <TestCaseDetailPage /> },
          { path: "new", element: <TestCaseCreatePage /> },
          { path: ":testCaseId/edit", element: <TestCaseCreatePage /> }
        ]},
      { path: "scenarios", children: [
          { index: true, element: <ScenarioListPage /> },
          { path: ":scenarioId/detail", element: <ScenarioDetailPage /> },
          { path: "new", element: <ScenarioCreatePage /> },
          { path: ":scenarioId/edit", element: <ScenarioCreatePage /> }
        ]},
      { path: "runs", children: [
          { index: true, element: <ScenarioTestListPage /> },
          { path : "batches", element: <TestScheduleListPage /> },
          { path : "batches/:scheduleId", element: <TestScheduleDetailPage /> }
        ]},
      { path: "results", element: <TestResultListPage /> },
      { path: "registry/devices", element: <DeviceFarmPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/frontend",
    element: <Layout />,
    children: [
      { path: "testcases", children: [
          { index: true, element: <TestCaseListPageDummy /> },
          { path: ":testCaseId/detail", element: <TestCaseDetailPage /> },
          { path: "new", element: <TestCaseCreatePage /> },
          { path: ":testCaseId/edit", element: <TestCaseCreatePage /> }
        ]},
      { path: "scenarios", children: [
          { index: true, element: <ScenarioListPageDummy /> },
          { path: ":scenarioId/detail", element: <ScenarioDetailPage /> },
          { path: "new", element: <ScenarioCreatePage /> },
          { path: ":scenarioId/edit", element: <ScenarioCreatePage /> }
        ]},
      { path: "runs", children: [
          { index: true, element: <ScenarioTestListPage /> }
        ]},
      { path: "results", element: <TestResultListPage /> },
      { path: "registry/devices", element: <DeviceFarmPageDummy /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
