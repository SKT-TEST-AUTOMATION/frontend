// src/services/testAPI.js

import { api } from "./axios";

// 테스트 단건 조회
export async function getScenarioTest(id) {
  const res = await api.get(`scenarios/tests/${id}`);
  return res?.data?.data ?? res?.data;
}

// 테스트 상세 조회
export async function getScenarioTestDetail(id) {
  const res = await api.get(`scenarios/tests/results/${id}/detail`);
  return res?.data?.data ?? res?.data;
}

// 테스트의 최근 N회 실행 이력(run) 조회
export async function getRecentScenarioTestRuns(id, topN, signal) {
  const topNParam = topN || 10;
  const res = await api.get(`scenarios/tests/${id}/recent?topN=${topNParam}`, { signal });
  return res?.data?.data ?? res?.data;
}

// 테스트 코멘트 작성
export async function updateScenarioTestRunComment(id, payload) {
  const res = await api.put(`scenarios/tests/results/${id}/comment`, payload);
  return res?.data?.data ?? res?.data;
}

// 테스트 케이스 실패 결과 코드 & 코멘트 수정
export async function updateTestCaseResultFailMeta(id, { testFailCode, failComment }) {
  const res = await api.put(`scenarios/tests/results/testcases/${id}/fail-meta`,
    { testFailCode, failComment }
  );
  return res?.data?.data ?? res?.data;
}