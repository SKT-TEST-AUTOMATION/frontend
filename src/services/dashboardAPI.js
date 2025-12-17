import { api } from "./axios";

// 오늘 수행된 테스트
export async function getTodayRunsResults(id, signal) {
  const res = await api.get(`dashboards/today/runs/results`, { signal });
  return res?.data?.data ?? res?.data;
}

// 현재 실행 중인 테스트
export async function getActiveRuns(id, signal) {
  const res = await api.get(`dashboards/today/runs/running`, { signal });
  return res?.data?.data ?? res?.data;
}

// 오늘 실행 예정인 테스트
export async function getTodaySchedulesToRun(id, signal) {
  const res = await api.get(`dashboards/today/runs/schedules`, { signal });
  return res?.data?.data ?? res?.data;
}

// 일별 테스트 실행 히트맵
// params: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", scenarioTestIds?: number[] }
export async function getScenarioTestHeatMap(params, signal) {
  const res = await api.get(`dashboards/tests/heatmap`, {
    params,
    paramsSerializer: {
      // scenarioTestIds를 ?scenarioTestIds=1&scenarioTestIds=2 형태로 보냄
      indexes: null,
    },
    signal,
  });
  return res?.data?.data ?? res?.data;
}

// 특정 테스트의 특정 날짜 실행 리스트
export async function getScenarioTestRunsAtDate(id, params, signal) {
  const res = await api.get(`dashboards/tests/${id}`, {
    params,
    signal
  });
  return res?.data?.data ?? res?.data;
}