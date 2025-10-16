import { api } from "./axios";

// 등록된 디바이스 목록 조회
export async function getDevices(params = {}, signal) {
  const { page = 0, size = 10, sort = "id,desc"} = params;
  const res = await api.get("devices", {
    signal,
    params: { page, size, sort },
  });
  return res;
}

// 디바이스 등록
export async function createDevice(payload) {
  const res = await api.post('devices', payload);
  return res?.data?.data ?? res?.data;
}