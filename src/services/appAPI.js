import { api } from "./axios";

// 엡 등록
export async function createApp(payload) {
  const res = await api.post('apps', payload);
  return res?.data?.data ?? res?.data;
}

// 엡 업데이트
export async function updateApp(id, payload) {
  const res = await api.put(`apps/${id}`, payload);
  return res?.data?.data ?? res?.data;
}

// 앱 목록 조회
export async function getApps(params = {}, signal) {
  const { page = 0, size = 10, sort = "id,desc"} = params;
  const res = await api.get("apps", {
    signal,
    params: { page, size, sort },
  });
  return res?.data?.data ?? res?.data;
}
