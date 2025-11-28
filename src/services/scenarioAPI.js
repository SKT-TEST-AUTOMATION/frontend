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

// 시나리오 수정
export async function updateScenario(id, payload) {
  const res = await api.put(`scenarios/${id}?userId=1`, payload);
  return res?.data?.data ?? res?.data;
}

export async function deleteScenario(id) {
  const res = await api.delete(`scenarios/${id}?userId=1`);
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

export async function deleteScenarioTest(id) {
  const res = await api.delete(`scenarios/tests/${id}?userId=1`);
  return res?.data?.data ?? res?.data;
}

// 시나리오 엑셀 업로드
export async function uploadScenarioExcel(id, { file, sheetName, filename, edited = false } = {}, signal) {
  const fd = new FormData();
  // 파일명 결정: 명시적 filename > 시트명.xlsx > edited.xlsx
  const safeName = filename || (sheetName ? `${sheetName}.xlsx` : `edited.xlsx`);
  fd.append("file", file, safeName);
  if (sheetName) fd.append("sheetName", sheetName);
  fd.append("edited", String(!!edited));

  const res = await api.post(`scenarios/${id}/excel?userId=1`, fd, {
    signal,
    // axios가 boundary를 자동으로 설정하므로 명시 지정 불필요하지만, 명시해도 무방
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res?.data?.data ?? res?.data;
}
