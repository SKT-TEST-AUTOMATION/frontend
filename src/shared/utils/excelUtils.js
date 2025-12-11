import * as XLSX from "xlsx";

/**
 * 엑셀 파일을 읽어 시트 목록과 시트별 미리보기 데이터를 반환합니다.
 * @param {File|Blob|ArrayBuffer} file 업로드 파일
 * @param {Object} opts 옵션
 * @param {number} opts.maxRows 미리보기 최대 행수 (기본 500)
 * @param {boolean} opts.trimCells 셀 앞뒤 공백 제거 (기본 true)
 * @returns {Promise<{sheets:string[], previewBySheet:Record<string,string[][]>, headerBySheet:Record<string,string[]>}>}
 */
export async function readExcelFile(file, opts = {}) {
  const { maxRows = 500, trimCells = true } = opts;

  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const wb = XLSX.read(buf, {
    type: "array",
    sheetRows: Math.min(maxRows, 500),
  });

  const sheetNames = wb.SheetNames || [];
  const previewBySheet = {};
  const headerBySheet = {};

  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    previewBySheet[name] = aoa;
    headerBySheet[name] = aoa[0] || [];
  }

  return { sheets: sheetNames, previewBySheet, headerBySheet };
}

/** 특정 시트만 AOA로 파싱 (대용량일 때 on-demand 사용) */
export async function readSheetAOA(file, sheetName, opts = {}) {
  const { maxRows = Infinity, trimCells = true } = opts;
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const wb = XLSX.read(buf, {
    type: "array",
    sheetRows: Math.min(maxRows, 200),
  });

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

export function buildXlsxFromSheets(sheets) {
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, sheetData]) => {
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData || [[""]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // ArrayBuffer 형태로 쓰기
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  // Blob으로 감싸서 반환
  return new Blob([wbout], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * 편집용 초기 시트 AOA 생성 유틸.
 *
 * - 새 시트(파일 없이 시작)일 때:
 *    기본으로 데이터 행을 최소 minRows개(기본 10개)까지 빈 행으로 채워 줍니다.
 * - 엑셀 파일에서 읽어온 시트일 때:
 *    해당 시트에 존재하는 데이터 행 수만큼만 유지하고, 추가 행은 만들지 않습니다.
 *
 * @param {string[]} headers 헤더 행 (첫 행)
 * @param {string[][]} [dataRows=[]] 기존 데이터 행 목록 (두 번째 행부터)
 * @param {Object} [opts]
 * @param {number} [opts.minRows=10] 새 시트일 때 확보할 최소 데이터 행 수
 * @param {boolean} [opts.fromFile=false] true이면 엑셀 파일에서 읽어온 시트로 간주하고 행 추가를 하지 않음
 * @returns {string[][]} [header, ...rows] 형태의 AOA
 */
export function buildInitialSheetAOA(headers, dataRows = [], opts = {}) {
  const { minRows = 10, fromFile = false } = opts;

  const safeHeaders = Array.isArray(headers) ? headers : [];
  const rows = Array.isArray(dataRows) ? [...dataRows] : [];

  // 엑셀 파일에서 읽어온 시트인 경우: 행을 그대로 유지 (추가 행 생성 X)
  if (fromFile) {
    return [safeHeaders, ...rows];
  }

  // 새 시트(템플릿 시작)인 경우: 최소 minRows개까지 빈 행 패딩
  const colCount = safeHeaders.length || (rows[0]?.length ?? 0);
  const makeEmptyRow = () => new Array(colCount).fill("");

  while (rows.length < minRows) {
    rows.push(makeEmptyRow());
  }

  return [safeHeaders, ...rows];
}


/**
 * ================
 */


// 컬럼 인덱스를 엑셀 헤더로 변환 (0 -> A, 26 -> AA)
export const getColumnHeader = (index) => {
  let dividend = index + 1;
  let columnName = "";
  let modulo;

  while (dividend > 0) {
    modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - 1) / 26);
  }
  return columnName;
};

// 데이터 정규화 (모든 행의 길이를 동일하게)
export const normalizeSheetData = (data) => {
  if (!data || data.length === 0) return [[""]]; // 빈 데이터 일 경우, 빈 셀 반환

  const maxCols = data.reduce((max, row) => Math.max(max, row.length), 0); // 가장 긴 행의 컬럼 개수 저장

  // 모든 행의 컬럼 개수가 동일하도록 열 개수를 맞춤
  return data.map((row) => {
    const newRow = [...row];
    while (newRow.length < maxCols) {
      newRow.push("");
    }
    return newRow;
  });
};

// 파일 읽기: Excel → { sheets, sheetNames }
// sheets : { [sheetName: string]: string[][]; };
// sheetNames: string[];
export const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });

        const sheets = {};
        const sheetNames = workbook.SheetNames;

        sheetNames.forEach((name) => {
          const worksheet = workbook.Sheets[name];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          sheets[name] = normalizeSheetData(jsonData);
        });

        resolve({ sheets, sheetNames });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// 파일 저장: { sheets } → Excel 파일 다운로드
export const saveFile = (sheets, fileName) => {
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, sheetData]) => {
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  XLSX.writeFile(
    workbook,
    fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`
  );
};
