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