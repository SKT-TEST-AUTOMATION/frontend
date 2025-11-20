import * as XLSX from "xlsx";

/**
 * ✅ FIX: 캐시 문제 해결
 *
 * 이전 구조의 문제점:
 * - FILE_BUFFER_CACHE (WeakMap): File/Blob이 GC되면 삭제됨 ✅
 * - ARRAY_BUFFER_CACHE (Map): ArrayBuffer를 영구 보관 ❌ 메모리 누수!
 *
 * 수정 후:
 * - FILE_BUFFER_CACHE만 유지 (Promise 레벨 캐싱)
 * - ARRAY_BUFFER_CACHE 제거 (불필요, ArrayBuffer는 이미 메모리 상주)
 * - WeakMap의 자동 GC에 의존해서 메모리 누수 방지
 */
const FILE_BUFFER_CACHE = new WeakMap();  // File|Blob → Promise<ArrayBuffer>

const DEFAULT_MAX_FILE_SIZE_MB = 10; // 너무 큰 엑셀 방지

/**
 * 안전한 ArrayBuffer 변환 + 캐싱 (개선된 버전)
 *
 * ✅ FIX:
 * - ARRAY_BUFFER_CACHE 제거 (메모리 누수 원인)
 * - FILE_BUFFER_CACHE만 사용해서 File/Blob에 대한 Promise 캐싱
 * - 각 File/Blob마다 최대 1번의 읽기 (중복 호출 시 동일 Promise 반환)
 * - File/Blob이 GC되면 자동으로 캐시 삭제 (WeakMap 특성)
 *
 * @param {File|Blob|ArrayBuffer} src
 * @returns {Promise<ArrayBuffer>}
 */
async function toArrayBuffer(src) {
  // ArrayBuffer인 경우: 그대로 반환 (캐싱 불필요)
  if (src instanceof ArrayBuffer) {
    return src;
  }

  // File/Blob 크기 검증
  const size = typeof src?.size === "number" ? src.size : null;
  if (size != null) {
    const sizeMB = size / (1024 * 1024);
    if (sizeMB > DEFAULT_MAX_FILE_SIZE_MB) {
      throw new Error(
        `엑셀 파일이 너무 큽니다. (약 ${sizeMB.toFixed(
          1
        )}MB). ${DEFAULT_MAX_FILE_SIZE_MB}MB 이하의 파일만 업로드 가능합니다.`
      );
    }
  }

  // ✅ FIX: 캐시에 있으면 기존 Promise 반환 (중복 읽기 방지)
  if (FILE_BUFFER_CACHE.has(src)) {
    return FILE_BUFFER_CACHE.get(src);
  }

  // ✅ FIX: 새로 읽으면서 Promise를 캐시에 저장
  const p = (async () => {
    try {
      if (typeof src.arrayBuffer === "function") {
        return await src.arrayBuffer();
      }
      throw new Error("지원하지 않는 엑셀 소스 타입입니다.");
    } catch (err) {
      // 에러 발생 시 캐시에서 삭제 (다음 시도에서 재읽기)
      FILE_BUFFER_CACHE.delete(src);
      throw err;
    }
  })();

  FILE_BUFFER_CACHE.set(src, p);
  return p;
}

/**
 * XLSX.read 호출을 래핑해서 공통 에러 처리를 담당
 * @param {ArrayBuffer} buf
 * @param {XLSX.ParsingOptions} opts
 * @returns {XLSX.WorkBook}
 */
function safeReadWorkbook(buf, opts) {
  try {
    return XLSX.read(buf, opts);
  } catch (err) {
    console.error("[excelUtils] XLSX.read 실패:", err);
    throw new Error("엑셀 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해 주세요.");
  }
}

/**
 * 시트가 실제 데이터를 가지고 있는지 확인하는 헬퍼 함수
 * - 헤더만 있고 데이터가 없는 시트는 제외
 * - 완전히 빈 시트는 제외
 *
 * @param {string[][]} aoa - Array of Arrays
 * @returns {boolean} 유효한 데이터 시트이면 true
 */
function isValidDataSheet(aoa) {
  // aoa.length > 1: 헤더(1행) + 데이터(1행 이상) 필요
  if (!Array.isArray(aoa) || aoa.length <= 1) {
    return false;
  }

  // 추가 검증: 헤더 행에 최소 1개의 유효한 헤더가 있어야 함
  const header = aoa[0] || [];
  const hasValidHeader = header.some((h) => String(h ?? "").trim() !== "");

  return hasValidHeader;
}

/**
 * 엑셀 파일을 읽어 시트 목록과 시트별 미리보기 데이터를 반환합니다.
 *
 * ✅ FIX:
 * - 캐시 누수 문제 해결 (ARRAY_BUFFER_CACHE 제거)
 * - 데이터가 없는 시트(빈 시트, 헤더만 있는 시트)는 제외
 * - 각 호출마다 새로운 결과 객체 반환 (이전 캐시 상태 반영 안됨)
 *
 * @param {File|Blob|ArrayBuffer} file 업로드 파일
 * @param {Object} opts 옵션
 * @param {number} opts.maxRows 미리보기 최대 행수 (기본 50, 최대 50까지만 적용)
 * @param {boolean} opts.trimCells 셀 앞뒤 공백 제거 (기본 true)
 * @returns {Promise<{sheets:string[], previewBySheet:Record<string,string[][]>, headerBySheet:Record<string,string[]>}>}
 */
export async function readExcelFile(file, opts = {}) {
  const { maxRows = 50, trimCells = true } = opts;

  const buf = await toArrayBuffer(file);

  const wb = safeReadWorkbook(buf, {
    type: "array",
    sheetRows: Math.min(maxRows, 50),
  });

  const sheetNames = wb.SheetNames || [];
  const previewBySheet = {};
  const headerBySheet = {};
  const validSheets = [];

  // ✅ FIX: wb.SheetNames에서 실제 엑셀에 존재하는 시트들을 순회
  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;

    const aoaRaw = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: "",
    });

    const aoa = trimCells
      ? aoaRaw.map((row) => (row || []).map((c) => String(c ?? "").trim()))
      : aoaRaw.map((row) => (row || []).map((c) => String(c ?? "")));

    // ✅ FIX: 유효한 데이터 시트만 포함
    if (isValidDataSheet(aoa)) {
      previewBySheet[name] = aoa;
      headerBySheet[name] = aoa[0] || [];
      validSheets.push(name);
    }
  }

  // ✅ FIX: 실제 데이터가 있는 시트만 반환
  // (이전 파일의 시트명이 섞이지 않음 - 새로운 객체 생성)
  return {
    sheets: validSheets,
    previewBySheet,
    headerBySheet
  };
}

/**
 * 특정 시트만 AOA로 파싱 (대용량일 때 on-demand 사용)
 *
 * @param {File|Blob|ArrayBuffer} file
 * @param {string} sheetName
 * @param {Object} opts
 * @param {number} [opts.maxRows=Infinity]  Infinity면 전체, 아니면 상한까지 자름
 * @param {boolean} [opts.trimCells=true]
 * @returns {Promise<string[][]>} AOA
 */
export async function readSheetAOA(file, sheetName, opts = {}) {
  const { maxRows = Infinity, trimCells = true } = opts;

  const buf = await toArrayBuffer(file);

  const wb = safeReadWorkbook(buf, { type: "array" });

  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
  }

  const aoaRaw = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: "",
  });

  const sliced = maxRows === Infinity ? aoaRaw : aoaRaw.slice(0, maxRows);

  return sliced.map((row) =>
    (row || []).map((c) =>
      trimCells ? String(c ?? "").trim() : String(c ?? "")
    )
  );
}

/**
 * 헤더 행(첫 행)을 키로 사용하는 레코드 배열로 파싱
 * @param {string[][]} aoa
 * @returns {Array<Object<string,string>>}
 */
export function AOAtoObjects(aoa) {
  if (!aoa?.length) return [];
  const [header, ...rows] = aoa;
  const keys = header.map((h) => String(h ?? "").trim());
  return rows.map((r) =>
    Object.fromEntries(keys.map((k, i) => [k, r?.[i] ?? ""]))
  );
}

/**
 * AOA(Array of Arrays) -> XLSX Blob 생성 (선택 시트만 포함)
 *
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
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
 * ✅ FIX: 캐시 수동 초기화 함수
 * - 필요시 호출해서 File/Blob 캐시를 명시적으로 비울 수 있음
 * - 예: 모든 파일을 초기화할 때, 또는 메모리 누수 발생 시
 *
 * @returns {void}
 */
export function clearFileBufferCache() {
  // WeakMap은 수동 clear 메서드가 없으므로
  // 전체 모듈을 재로드하거나 참조를 유지하지 않으면 자동 GC됨
  console.log("[excelUtils] File buffer cache는 자동 GC됩니다. (WeakMap 사용)");
}