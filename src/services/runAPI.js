import { api } from "./axios";

// 테스트 실행
export async function runScenarioTest(id, payload) {
  const res = await api.post(`scenarios/tests/${id}/run?userId=1`, payload);
  return res?.data?.data ?? res?.data;
}

