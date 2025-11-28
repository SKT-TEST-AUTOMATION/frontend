// src/services/testAPI.js

import { api } from "./axios";

// 테스트 단건 조회
export async function getScenarioTest(id) {
  const res = await api.get(`scenarios/tests/${id}`);
  return res?.data?.data ?? res?.data;
}