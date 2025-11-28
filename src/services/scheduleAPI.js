import { api } from "./axios";


// 예약 목록 조회
export async function getTestSchedules(params = {}, signal) {
  const { page = 0, size = 10, sort = "id,desc", status, targetDate} = params;
  const res = await api.get("scenarios/test-schedules", {
    signal,
    params: { status, targetDate, page, size, sort },
  });
  return res;
}

// 예약 상세 조회
export async function getTestSchedule(id, signal) {
  const res = await api.get(`scenarios/test-schedules/${id}`, { signal });
  return res?.data?.data ?? res?.data;
}

// 테스트 스케줄 생성
export async function createSchedule(id, payload) {
  const res = await api.post(`scenarios/test-schedules/${id}?userId=1`, payload);
  return res?.data?.data ?? res?.data;
}

// 테스트 스케줄 상태 변경
export async function updateScheduleStatus(id, status) {
  const res = await api.patch(`scenarios/test-schedules/${id}/status/toggle?userId=1`, {
    status: status
  });
  return res?.data?.data ?? res?.data;
}

// 테스트 스케줄 삭제
export async function deleteSchedule(id) {
  const res = await api.delete(`scenarios/test-schedules/${id}?userId=1`);
  return res?.data?.data ?? res?.data;
}

