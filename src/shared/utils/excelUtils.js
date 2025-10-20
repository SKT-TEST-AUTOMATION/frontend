// SheetJS(xlsx) 기반 엑셀 읽기 유틸. 업로드 파일에서 시트 목록/미리보기(AOA)를 반환합니다.
// 설치: npm i xlsx

import * as XLSX from "xlsx";

/**
 * 엑셀 파일을 읽어 시트 목록과 시트별 미리보기 데이터를 반환합니다.
 * @param {File|Blob|ArrayBuffer} file 업로드 파일
 * @param {Object} opts 옵션
 * @param {number} opts.maxRows 미리보기 최대 행수 (기본 100)
 * @param {boolean} opts.trimCells 셀 앞뒤 공백 제거 (기본 true)
 * @returns {Promise<{sheets:string[], previewBySheet:Record<string,string[][]>, headerBySheet:Record<string,string[]>}>}
 */
export async function readExcelFile(file, opts = {}) {
  const { maxRows = 100, trimCells = true } = opts;

  // 파일 타입/크기 기본 검증
  if (file instanceof File) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new Error("xlsx 파일만 지원합니다.");
    }
    const MAX = 10 * 1024 * 1024; // 10MB 기본 제한 (서버 제한과 맞출 것)
    if (file.size > MAX) throw new Error("파일 크기가 10MB를 초과합니다.");
  }

  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false, cellNF: false, cellText: false });

  const sheetNames = wb.SheetNames || [];
  if (!sheetNames.length) throw new Error("시트를 찾을 수 없습니다.");

  const previewBySheet = {};
  const headerBySheet = {};

  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;

    // 시트를 AOA(Array of Arrays)로 파싱
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    const preview = (aoa || []).slice(0, Math.max(1, maxRows));

    // 문자열화 + 트리밍 (보안/표현 일관성)
    const normalized = preview.map((row) =>
      (row || []).map((cell) => {
        const v = cell == null ? "" : String(cell);
        return trimCells ? v.trim() : v;
      })
    );

    previewBySheet[name] = normalized;
    headerBySheet[name] = normalized[0] || [];
  }

  return {
    sheets: sheetNames,
    previewBySheet,
    headerBySheet,
  };
}

/** 특정 시트만 AOA로 파싱 (대용량일 때 on-demand 사용) */
export async function readSheetAOA(file, sheetName, opts = {}) {
  const { maxRows = Infinity, trimCells = true } = opts;
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  const sliced = (aoa || []).slice(0, maxRows === Infinity ? undefined : Math.max(1, maxRows));
  return sliced.map((row) => (row || []).map((c) => (trimCells ? String(c ?? "").trim() : String(c ?? ""))));
}

/** 헤더 행(첫 행)을 키로 사용하는 레코드 배열로 파싱 */
export function AOAtoObjects(aoa) {
  if (!aoa?.length) return [];
  const [header, ...rows] = aoa;
  const keys = header.map((h) => String(h ?? "").trim());
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r?.[i] ?? ""])));
}

/** AOA(Array of Arrays) -> XLSX Blob 생성 (선택 시트만 포함)
 * @param {string} sheetName 시트명
 * @param {string[][]} aoa 셀 2차원 배열 (첫 행 = 헤더 권장)
 * @returns {Blob} xlsx 블롭
 */
export function buildXlsxFromAOA(sheetName, aoa) {
  if (!sheetName || !Array.isArray(aoa)) {
    throw new Error("유효하지 않은 sheetName 또는 aoa 입니다.");
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}