// 엑셀 파일이 메모리에서 어떻게 보이는지 관리, 즉 엑셀 UI 상태

import { useCallback, useMemo, useState } from 'react';

/**
 * 단일 워크북 상태를 관리하는 훅
 * - initialWorkbook :
 * {
 *   sheetNames: string[];
 *   sheets: {
 *     [sheetName: string]: any[][];
 *  }
 */

function normalizeWorkbook(rawData) {
  if (!rawData || typeof rawData !== "object") return {};

  if (
    Array.isArray(rawData.sheetNames)
    && rawData.sheets && typeof rawData.sheets === "object"
    && !Array.isArray(rawData.sheets)
  ) {
    const result = {};
    const { sheetNames, sheets } = rawData;

    for (const sheetName of sheetNames) {
      const aoa = sheets[sheetName];
      if (Array.isArray(aoa)) {
        result[sheetName] = aoa;
      }
    }

    return result;
  }

  return {};
}

function pickInitialSheetName(workbook) {
  if (!workbook || typeof workbook !== "object") return "";
  const sheetNames = Object.keys(workbook);
  if (sheetNames.length === 0)  return "";

  return sheetNames[0];
}

export function useExcelWorkbookState({
  rawWorkbook = null, // {sheetnames, sheets}
}) {

  const normalizedWorkbook = normalizeWorkbook(rawWorkbook);

  // 시트별 AOA
  const [workbook, setWorkbook] = useState(normalizedWorkbook);

  // 현재 선택된 시트 이름 & AOA
  const [activeSheetName, setActiveSheetName] = useState("");
  const [activeSheetAOA, setActiveSheetAOA] = useState([]);

  // 시트 이름들
  const sheetNames = useMemo(() => Object.keys(workbook), [workbook]);

  const headers = useMemo(() => (activeSheetAOA?.[0] || []).map((header) => String(header ?? "")), [activeSheetAOA]);
  const dataRows = useMemo(() => activeSheetAOA?.slice(1) || [], [activeSheetAOA]);

  // 서버/로컬에서 새 파일을 읽은 후 호출
  const setFromWorkbook = useCallback(
    (nextRawWorkbook) => {
      const nextWorkbook = normalizeWorkbook(nextRawWorkbook);
      const nextActiveSheetName = pickInitialSheetName(nextWorkbook);
      const nextSheetsAOA = nextActiveSheetName ? nextWorkbook[nextActiveSheetName] || [] : [];

      setWorkbook(nextWorkbook);
      setActiveSheetName(nextActiveSheetName);
      setActiveSheetAOA(nextSheetsAOA);
    }, []);

  // 시트 선택
  const selectSheet = useCallback(
    (sheetName) => {
      if (!sheetName || !workbook[sheetName]) return;
      setActiveSheetName(sheetName);
      setActiveSheetAOA(workbook[sheetName] || []);
    },
    [workbook]
  );

  // 현재 시트 AOA 편집
  const updateActiveSheetCell = useCallback((rowIdx, colIdx, value) => {
    setActiveSheetAOA((prev) => {
      if (!Array.isArray(prev) || !prev[rowIdx]) return prev;
      const nextRow = prev[rowIdx].map((cell, idx) => idx === colIdx ? value : cell);
      const next = prev.map((row, idx) => (idx === rowIdx) ? nextRow : row);
      return next;
    })
  }, []);

  const insertRowBelowInActiveSheet = useCallback((rowIdx) => {
    setActiveSheetAOA((prev) => {
      if (!Array.isArray(prev)) return prev;
      const colCount = Math.max(
        prev[rowIdx]?.length || 0,
        prev[0]?.length || 0
      );
      const empty = Array.from({ length: colCount }, () => "");
      const next = prev.slice();
      next.splice(rowIdx + 1, 0, empty);
      return next;
    })
  }, []);

  const deleteRowAtInActiveSheet = useCallback((rowIdx) => {
    setActiveSheetAOA((prev) => {
      if (!Array.isArray(prev) || prev.length <= 1) return prev;
      const next = prev.slice();
      next.splice(rowIdx, 1);
      return next;
    });
  }, []);

  // activeSheetAOA => workbook 반영
  const commitActiveSheet = useCallback(() => {
    if (!activeSheetName) return;
    setWorkbook((prev) => ({
      ...prev,
      [activeSheetName]: Array.isArray(activeSheetAOA)
        ? activeSheetAOA
        : [],
    }));
  }, [activeSheetName, activeSheetAOA]);

  // 전체 초기화
  const resetWorkbook = useCallback(() => {
    setWorkbook({});
    setActiveSheetName("");
    setActiveSheetAOA([]);
  }, []);


  return {
    workbook,
    sheetNames,
    activeSheetName,
    activeSheetAOA,

    headers,
    dataRows,

    setFromWorkbook,
    selectSheet,
    updateActiveSheetCell,
    insertRowBelowInActiveSheet,
    deleteRowAtInActiveSheet,
    commitActiveSheet,
    resetWorkbook,

    setActiveSheetName,
    setActiveSheetAOA
  }
}