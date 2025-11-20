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

// 테스트 케이스 업데이트
export async function updateTestcase(id, payload) {
  const res = await api.put(`testcases/${id}?userId=1`, payload);
  return res?.data?.data ?? res?.data;
}

export async function deleteTestcase(id) {
  const res = await api.delete(`testcases/${id}?userId=1`);
  return res?.data?.data ?? res?.data;
}

// 테스트케이스 엑셀 업로드
export async function uploadTestcaseExcel(id, { file, sheetName, filename, edited = false } = {}, signal) {
  const fd = new FormData();
  // 파일명 결정: 명시적 filename > 시트명.xlsx > edited.xlsx
  const safeName = filename || (sheetName ? `${sheetName}.xlsx` : `edited.xlsx`);
  fd.append("file", file, safeName);
  if (sheetName) fd.append("sheetName", sheetName);
  fd.append("edited", String(!!edited));

  const res = await api.post(`testcases/${id}/excel?userId=1`, fd, {
    signal,
    // axios가 boundary를 자동으로 설정하므로 명시 지정 불필요하지만, 명시해도 무방
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res?.data?.data ?? res?.data;
}

// 테스트케이스 엑셀(blob) 가져오기
export async function getTestcaseExcel(id, signal) {
  const res = await api.get(`testcases/${id}/excel`, { signal, responseType: 'blob' });
  // 파일명 추출 (Content-Disposition)
  let filename = undefined;
  const cd = res?.headers?.['content-disposition'] || res?.headers?.get?.('content-disposition');
  if (cd && /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.test(cd)) {
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    filename = decodeURIComponent(m[1] || m[2] || '');
  }
  return { blob: res?.data, filename };
}
