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


/**
 * 실행 리포트 조회
 *
 * 시도 순서:
 *  1) GET runs/{runId}/report
 *  2) 실패 시 GET run-results/{runId}
 *
 * 반환값:
 *  - 백엔드가 { meta, steps, rawLines } 를 data 또는 data.data 로 감싼 형태라고 가정
 */
export async function getRunReport(runId, signal) {
  if (!runId && runId !== 0) {
    throw new Error("runId is required");
  }

  const tryPaths = [`runs/${runId}/report`, `run-results/${runId}`];

  let lastError;
  for (const path of tryPaths) {
    try {
      const res = await api.get(path, {
        signal,
        withCredentials: true,
      });
      // 공통 응답 규칙 준수
      return res?.data?.data ?? res?.data;
    } catch (err) {
      lastError = err;
      // 다음 후보 path로 계속 진행
    }
  }
  throw lastError ?? new Error("Failed to load run report");
}

/**
 * 실행 로그 SSE 오픈
 *
 * - EventSource 인스턴스를 반환하고, 호출 측에서 onmessage/onerror 등을 붙여 사용
 * - axios 인스턴스(api)의 baseURL 을 재사용하여 /events/runs/{runId}/logs 구성
 */
export function openRunLogStream(runId) {
  if (!runId && runId !== 0) {
    throw new Error("runId is required");
  }

  const baseURL = api?.defaults?.baseURL ?? "";
  const base = String(baseURL).replace(/\/$/, ""); // 끝 슬래시 제거
  const url = `${base}/events/runs/${runId}/logs`;

  return new EventSource(url, { withCredentials: true });
}