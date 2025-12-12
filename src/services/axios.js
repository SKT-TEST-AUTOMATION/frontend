import axios from 'axios';

export const api = axios.create({ 
  baseURL: '/api/v1/',
  timeout : 15000,
});

export function toErrorMessage(err, fallback = "요청에 실패했습니다.") {
  // axios cancel
  if (err?.code === "ERR_CANCELED") return "요청이 취소되었습니다.";

  // 1) axios 응답 데이터 우선
  let payload = err?.response?.data ?? err?.data ?? err;

  // 2) Error 객체의 message가 "Error: {...json...}" 형태인 경우
  if (payload instanceof Error && typeof payload.message === "string") {
    payload = payload.message;
  }

  // 3) 문자열이면 JSON 파싱 시도 ("Error: " 접두사 제거 포함)
  if (typeof payload === "string") {
    const s = payload.trim();
    const jsonLike = s.startsWith("Error:") ? s.replace(/^Error:\s*/, "") : s;
    try {
      payload = JSON.parse(jsonLike);
    } catch {
      // JSON 아니면 그냥 문자열을 메시지로 사용
      return s || fallback;
    }
  }

  // 4) 메시지 후보들(프로젝트/서버 포맷별로 확장 가능)
  const msg =
    payload?.error?.message ||
    payload?.message ||
    err?.error?.message ||
    err?.message ||
    err?.response?.data?.error?.message;

  if (msg) return msg;

  // 5) 상태코드 fallback
  if (err?.response?.status) {
    return `${err.response.status} ${err.response.statusText ?? ""}`.trim();
  }

  return fallback;
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
