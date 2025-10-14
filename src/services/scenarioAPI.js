import { api } from "./axios";

// 시나리오 목록 조회
export async function getScenarios(params = {}, signal) {
  const { page = 0, size = 10, sort = "id,desc"} = params;
  const res = await api.get("scenarios", {
    signal,
    params: { page, size, sort },
  });
  return res;
}

// 시나리오 단건 조회
export async function getScenario(id, signal) {
  const res = await api.get(`scenarios/${id}`, { signal });
  return res?.data?.data ?? res?.data;
}

// 시나리오 생성
export async function createScenario(payload) {
  const res = await api.post('scenarios?userId=1', payload);
  return res?.data?.data ?? res?.data;
}

// 테스트 생성
export async function createScenarioTest(payload) {
  const res = await api.post('scenarios/tests', payload);
  return res?.data?.data ?? res?.data;
}

// 테스트 리스트 목록 조회
export async function getScenarioTests(params = {}, signal) {
  const { page = 0, size = 10, sort = "id,desc"} = params;
  const res = await api.get("scenarios/tests", {
    signal,
    params: { page, size, sort },
  });
  return res;
}

// 테스트 결과 
export async function getScenarioTestResults(params = {}, signal) {
  const { page = 0, size = 10, sort = "id,desc"} = params;
  console.log(params);
  const res = await api.get("scenarios/tests/results", {
    signal,
    params: { page, size, sort },
  });
  return res?.data?.data ?? res?.data;
}