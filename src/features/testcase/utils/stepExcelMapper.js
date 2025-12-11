import { STEP_HEADERS } from "../constants/stepConstants.js";

/**
 * AOA(2차원 배열) → Step 배열
 * @param {any[][]} aoa
 * @param {string[]} headers
 * @returns {Array<Record<string, any>>}
 */
export function aoaToSteps(aoa, headers = STEP_HEADERS) {
  if (!Array.isArray(aoa) || aoa.length < 2) {
    return [];
  }

  const [headerRow, ...rows] = aoa;
  if (!Array.isArray(headerRow)) return [];

  // headerRow에서 각 헤더가 몇 번째 idx인지 판별하는 인덱스 맵
  const headerIndexMap = {};
  headers.forEach((header) => {
    const idx = headerRow.indexOf(header);
    if (idx >= 0) {
      headerIndexMap[header] = idx;
    }
  });

  return rows
    .map((row, rowIndex) => {
      const cells = Array.isArray(row) ? row : [];

      // 완전히 비어 있는 행은 스킵
      const isEmpty = cells.every((c) => {
        if (c === null || c === undefined) return true;
        return String(c).trim() === "";
      });
      if (isEmpty) return null;

      const step = {};
      headers.forEach((header) => {
        const idx = headerIndexMap[header];
        step[header] = idx != null ? cells[idx] ?? "" : "";
      });

      // no가 비어 있을 때 자동 부여
      if (!step.no || String(step.no).trim() === "") {
        step.no = rowIndex + 1;
      }
      return step;
    })
    .filter(Boolean);
}

/**
 * Step 배열 → AOA(2차원 배열)
 * @param {Array<Record<string, any>>} steps
 * @param {string[]} headers
 * @returns {any[][]}
 */
export function stepsToAoa(steps, headers = STEP_HEADERS) {
  const headerRow = headers;
  const dataRows = steps.map((step) =>
    headers.map((header) => step[header] ?? "")
  );
  return [headerRow, ...dataRows];
}