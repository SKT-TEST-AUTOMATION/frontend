import { api } from './axios';

export async function getTestFailCodes() {
  const res = await api.get("/meta/test-fail-codes");
  return res?.data?.data ?? res?.data;
}