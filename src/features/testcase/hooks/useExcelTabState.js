import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../shared/hooks/useToast";
import { readExcelFile, buildXlsxFromAOA, buildInitialSheetAOA } from "../../../shared/utils/excelUtils";
import { downloadFile } from "../../../shared/utils/fileUtils";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import { toErrorMessage } from "../../../services/axios";
import { uploadTestcaseExcel } from "../../../services/testcaseAPI";

// ──────────────────────────────────────────────────────────────────────────────
// 템플릿 헬퍼
// ──────────────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG_HEADERS = [
  "no", "name", "mandatory", "skip_on_error", "sleep", "action", "input_text", "by", "value", "memo"
];

function sanitizeSheetName(raw) {
  const name = String(raw ?? "").trim();
  const invalid = /[\\/*?:\[\]]/g;
  const cleaned = name.replace(invalid, " ").slice(0, 31).trim();
  return cleaned || "Sheet1";
}

function makeTemplateMeta(sheetName = "custom_sheet", formName) {
  const header = DEFAULT_CONFIG_HEADERS.slice();
  const name = sanitizeSheetName(formName || sheetName);
  const aoa = buildInitialSheetAOA(header, [], { minRows: 10, fromFile: false });
  return {
    sheets: [name],
    previewBySheet: { [name]: aoa },
    headerBySheet: { [name]: header },
    sourceFile: null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Custom Hook: useExcelTabState
// ──────────────────────────────────────────────────────────────────────────────
export function useExcelTabState({ form, testCaseId, excelFileName, readOnly = false, navigate }) {
  const { showToast } = useToast();

  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState(null); // { sheets, previewBySheet, headerBySheet, sourceFile }
  const [fullBySheet, setFullBySheet] = useState({}); // 전체 시트 캐시 (편집기에서 사용)
  const [selectedSheet, setSelectedSheet] = useState("");
  const [previewAOA, setPreviewAOA] = useState([]); // 현재 선택 시트의 미리보기 AOA
  const [uploading, setUploading] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  const isRO = !!readOnly;
  const canEdit = !!testCaseId && !isRO;
  const blocked = !testCaseId || readOnly;

  // 실제 데이터가 있는 시트 중에서 최초 선택 시트를 고르는 헬퍼
  const pickInitialSheet = useCallback((m) => {
    if (!m) return "";
    const sheets = m.sheets || [];
    const preview = m.previewBySheet || {};

    const hasPreview = (name) =>
      !!name && Array.isArray(preview[name]) && preview[name].length > 0;

    let preferred = sheets.includes("Config") ? "Config" : sheets[0] || "";

    if (!hasPreview(preferred)) {
      const found = sheets.find(hasPreview);
      preferred = found || "";
    }
    return preferred;
  }, []);

  // 서버 저장본 불러오기
  const loadServerExcel = useCallback(async () => {
    if (!testCaseId) return;
    try {
      const res = await fetch(`/api/v1/testcases/${encodeURIComponent(testCaseId)}/excel`, { method: "GET" });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      const blob = await res.blob();
      const name = excelFileName || `${form?.code || testCaseId}.xlsx`;
      const fileObj = new File([blob], name, { type: blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      setFile(fileObj);
      const m = await readExcelFile(fileObj);
      setMeta(m);
      const preferred = pickInitialSheet(m);
      setSelectedSheet(preferred);
      setPreviewAOA((m.previewBySheet || {})[preferred] || []);
      showToast("success", "불러오기 완료");
    } catch (err) {
      if (err?.code === REQUEST_CANCELED_CODE) return;
      showToast("error", toErrorMessage(err));
    }
  }, [testCaseId, excelFileName, form?.code, pickInitialSheet, showToast]);

  // 파일 업로드 핸들러
  const handlePickFile = useCallback(async (f) => {
    const validatePicked = (fileObj) => {
      if (!fileObj) return "파일을 선택해주세요.";
      const nameOk = /\.(xlsx)$/i.test(fileObj.name);
      if (!nameOk) return "xlsx 파일만 업로드 가능합니다.";
      const MAX = 10 * 1024 * 1024;
      if (fileObj.size > MAX) return "파일 크기가 10MB를 초과합니다.";
      return null;
    };

    const err = validatePicked(f);
    if (err) {
      showToast("error", "파일 오류: " + err);
      return false;
    }
    try {
      setFile(f);
      const m = await readExcelFile(f);
      setMeta(m);
      const preferred = pickInitialSheet(m);
      setSelectedSheet(preferred);
      setPreviewAOA((m.previewBySheet || {})[preferred] || []);
      return true;
    } catch {
      showToast("error", "엑셀 파싱에 실패했습니다.");
      return false;
    }
  }, [pickInitialSheet, showToast]);

  // 템플릿 시작
  const startFromTemplate = useCallback((openEditor) => {
    const initialName = sanitizeSheetName(form?.name || "custom_sheet");
    const m = makeTemplateMeta(initialName, form?.name);
    setFile(null);
    setMeta(m);
    setSelectedSheet(initialName);
    setPreviewAOA(m.previewBySheet[initialName]);
    setFullBySheet({ [initialName]: m.previewBySheet[initialName] });
    openEditor();
    showToast("info", "기본 템플릿으로 새 시트를 시작합니다.");
  }, [form?.name, showToast]);

  // 업로드(선택 시트만)
  const uploadEdited = useCallback(async (previewAOA, selectedSheet, formCode, testCaseId, setEditorOpen) => {
    if (blocked || uploading || !selectedSheet || previewAOA.length === 0) return;

    setUploading(true);
    try {
      const aoaToSave = Array.isArray(previewAOA) ? previewAOA : [];

      setFullBySheet((prev) => ({
        ...prev,
        [selectedSheet]: aoaToSave,
      }));

      // AOA를 Blob으로 변환
      const blob = buildXlsxFromAOA({ [selectedSheet]: aoaToSave });
      const filename = `${formCode || testCaseId}-${selectedSheet}.xlsx`;

      await uploadTestcaseExcel(
        testCaseId,
        { file: blob, sheetName: selectedSheet, filename, edited: true }
      );

      showToast("success", "수정본을 업로드했습니다.");
      setEditorOpen(false);
      navigate(`/testcases/${testCaseId}/detail`, { replace: true });
    } catch (err) {
      if (err?.code !== REQUEST_CANCELED_CODE) showToast("error", toErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }, [blocked, uploading, navigate, showToast]);


  // AOA 업데이트 유틸
  const updateCell = useCallback((ri, ci, val) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev) || !prev[ri]) return prev;
      const nextRow = prev[ri].map((cell, index) => (index === ci ? val : cell));
      const next = prev.map((row, index) => (index === ri ? nextRow : row));
      return next;
    });
  }, []);

  const insertRowBelow = useCallback((ri) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev)) return prev;
      const colCount = Math.max((prev[ri]?.length || 0), (prev[0]?.length || 0));
      const empty = Array.from({ length: colCount }, () => "");
      const next = prev.slice();
      next.splice(ri + 1, 0, empty);
      return next;
    });
  }, []);

  const deleteRowAt = useCallback((ri) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev) || prev.length <= 1) return prev;
      const next = prev.slice();
      next.splice(ri, 1);
      return next;
    });
  }, []);

  // Effects
  // 1. 최초 서버 파일 자동 로드
  useEffect(() => {
    if (!autoLoaded && excelFileName && testCaseId) {
      setAutoLoaded(true);
      loadServerExcel();
    }
  }, [autoLoaded, excelFileName, testCaseId, loadServerExcel]);

  // 2. 시트 변경 시 미리보기 갱신
  useEffect(() => {
    if (!meta || !selectedSheet) return;
    setPreviewAOA(meta.previewBySheet?.[selectedSheet] || []);
  }, [meta, selectedSheet]);

  // 3. 템플릿 모드에서 시트명 자동 동기화
  useEffect(() => {
    if (!meta || file) return;
    if (!selectedSheet) return;
    const desired = sanitizeSheetName(form?.name || selectedSheet);
    if (desired && desired !== selectedSheet && !meta.sheets.includes(desired)) {
      const nextMeta = {
        ...meta,
        sheets: meta.sheets.map((n) => (n === selectedSheet ? desired : n)),
        previewBySheet: { ...meta.previewBySheet },
        headerBySheet: { ...(meta.headerBySheet || {}) },
      };
      nextMeta.previewBySheet[desired] = nextMeta.previewBySheet[selectedSheet];
      delete nextMeta.previewBySheet[selectedSheet];
      if (nextMeta.headerBySheet[selectedSheet]) {
        nextMeta.headerBySheet[desired] = nextMeta.headerBySheet[selectedSheet];
        delete nextMeta.headerBySheet[selectedSheet];
      }
      setMeta(nextMeta);
      setSelectedSheet(desired);
    }
  }, [form?.name, meta, file, selectedSheet]);

  // Computed values
  const headers = useMemo(() => (previewAOA?.[0] || []).map((h) => String(h ?? "")), [previewAOA]);
  const dataRows = useMemo(() => previewAOA?.slice(1) || [], [previewAOA]);

  const visibleSheets = useMemo(() => {
    if (!meta) return [];
    const sheets = meta.sheets || [];
    const preview = meta.previewBySheet || {};
    const result = [];
    const seen = new Set();
    for (const name of sheets) {
      if (!name || seen.has(name)) continue;
      const aoa = preview[name];
      if (Array.isArray(aoa) && aoa.length > 0) {
        result.push(name);
        seen.add(name);
      }
    }
    return result;
  }, [meta]);

  const resetPicker = useCallback((fileInputRef) => {
    setFile(null);
    setMeta(null);
    setSelectedSheet("");
    setPreviewAOA([]);
    setFullBySheet({});
    setAutoLoaded(true);
    if (fileInputRef?.current) fileInputRef.current.value = "";
  }, []);

  return {
    // 상태
    file, meta, fullBySheet, selectedSheet, previewAOA, uploading,
    // 파생 상태
    isRO, canEdit, blocked,
    headers, dataRows, visibleSheets,
    // 세터
    setFile, setMeta, setFullBySheet, setSelectedSheet, setPreviewAOA, setUploading,
    // 액션
    loadServerExcel, downloadServerExcel: (name) => downloadFile(`/api/v1/testcases/${encodeURIComponent(testCaseId)}/excel`, name),
    handlePickFile, startFromTemplate, uploadEdited,
    updateCell, insertRowBelow, deleteRowAt, resetPicker,
    pickInitialSheet,
  };
}