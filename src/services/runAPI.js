import { api } from "./axios";

// 테스트 실행
export async function runScenarioTest(id, payload) {
  const res = await api.post(`scenarios/tests/${id}/run?userId=1`, payload);
  return res?.data?.data ?? res?.data;
}

// 테스트 결과 - 테스트 케이스 결과
export async function getScenarioTestCaseResults(id) {
  const res = await api.get(`scenarios/tests/results/${id}/testcases`);
  return res?.data?.data ?? res?.data;
}