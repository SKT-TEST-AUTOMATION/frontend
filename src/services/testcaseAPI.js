import { api } from "./axios";

// 목록 조회
export async function getTestcases(params = {}, signal) {
  const { page = 0, size = 10, sort = "id,desc"} = params;
  const res = await api.get("testcases", {
    signal,
    params: { page, size, sort },
  });
  return res?.data?.data ?? res?.data;
}

// 단건 조회
export async function getTestcase(id, signal) {
  const res = await api.get(`testcases/${id}`, { signal });
  return res?.data?.data ?? res?.data;
}

// 테스트 케이스 생성
export async function createTestcase(payload) {
  const res = await api.post('testcases?userId=1', payload);
  return res?.data?.data ?? res?.data;
}
