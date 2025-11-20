import axios from 'axios';

export const api = axios.create({ 
  baseURL: '/api/v1/',
  timeout : 15000,
});

export function toErrorMessage(err, fallback = "요청에 실패했습니다.") {
  if (err?.code === "ERR_CANCELED") return "요청이 취소되었습니다.";
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.response?.status) return `${err.response.status} ${err.response.statusText}`;
  return err?.message || fallback;
}

export function normalizePage(res) {
  const data = res?.data?.data || res;
  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const size = data?.size ?? (data.content? data.content.length : 10);
  const page = data?.page ?? 0;
  return { data, content, totalElements, totalPages, size, page };
}
