import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../shared/hooks/useToast";
import { readExcelFile, buildXlsxFromAOA, buildInitialSheetAOA, buildXlsxFromSheets } from "../../../shared/utils/excelUtils";
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

// 시트 이름 검증
function sanitizeSheetName(raw) {
  const name = String(raw ?? "").trim();
  const invalid = /[\\/*?:\[\]]/g;
  const cleaned = name.replace(invalid, " ").slice(0, 31).trim();
  return cleaned || "Sheet1";
}

// template으로 시작할 경우 meta 파일 생성
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

  // 현재 선택되어 불러온 excel 파일
  const [file, setFile] = useState(null);
  // excel 파일을 read해서 정제한 결과
  const [meta, setMeta] = useState(null); // { sheets, previewBySheet, headerBySheet, sourceFile }
  // 전체 시트 캐시
  const [fullBySheet, setFullBySheet] = useState({});
  // 현재 선택한 시트 이름
  const [selectedSheet, setSelectedSheet] = useState("");
  // 현재 선택한 시트의 미리보기용 AOA
  const [previewAOA, setPreviewAOA] = useState([]);
  // uploading 여부 확인
  const [uploading, setUploading] = useState(false);
  // 초기 1번 업로드 되었는지 확인 용
  const [autoLoaded, setAutoLoaded] = useState(false);

  // readOnly 상태인가?
  const isRO = !!readOnly;
  // 수정 가능한 상태인가?
  const canEdit = !!testCaseId && !isRO;
  const blocked = !testCaseId || readOnly;

  // 실제 데이터가 있는 시트 중에서 최초 선택 시트를 고르는 헬퍼
  const pickInitialSheet = useCallback((meta) => {
    console.log(pickInitialSheet);
    if (!meta) return "";
    const sheets = meta.sheets || [];
    const preview = meta.previewBySheet || {};

    const hasPreview = (name) =>
      !!name && Array.isArray(preview[name]) && preview[name].length > 0;

    let firstSheet = sheets[0] || "";

    if (!hasPreview(firstSheet)) {
      const found = sheets.find(hasPreview);
      firstSheet = found || "";
    }
    return firstSheet;
  }, []);

  // 서버 저장본 불러오기
  const loadServerExcel = async () => {
    if (!testCaseId) return;
    try {
      const res = await fetch(`/api/v1/testcases/${encodeURIComponent(testCaseId)}/excel`, { method: "GET" });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);

      const blob = await res.blob();
      const name = excelFileName || `${form?.code || testCaseId}.xlsx`;
      const fileObj = new File([blob], name, { type: blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      setFile(fileObj);
      setFullBySheet({});
      const metaData = await readExcelFile(fileObj);
      setMeta(metaData);
      const preferred = pickInitialSheet(metaData);
      setSelectedSheet(preferred);
      setPreviewAOA((metaData.previewBySheet || {})[preferred] || []);
      showToast("success", "불러오기 완료");
    } catch (err) {
      if (err?.code === REQUEST_CANCELED_CODE) return;
      showToast("error", toErrorMessage(err));
    }
  };

  // 서버 저장본 직접 다운로드
  const downloadServerExcel = async () => {
    console.log('downloadServerExcel');
    if (!testCaseId) return;
    try {
      const name = (excelFileName && String(excelFileName).trim()) || `${form?.code || testCaseId}.xlsx`;
      await downloadFile(`/api/v1/testcases/${encodeURIComponent(testCaseId)}/excel`, name);
    } catch (err) {
      showToast({type: "error", message: "다운로드 실패", detailMessage: err});
    }
  };

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
      setFullBySheet({});
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
  }, [pickInitialSheet]);

  // 템플릿 시작
  const startFromTemplate = useCallback((openEditor) => {
    console.log(startFromTemplate);
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

  // 업로드(전체 시트)
  const uploadSheets = useCallback(
    async (sheets, formCode, testCaseId) => {
      console.log("uploadEdited(workbook)", sheets);

      // 기본 가드
      if (blocked || uploading) return;
      if (!sheets || Object.keys(sheets).length === 0) return;

      setUploading(true);
      try {
        // 필요하다면 내부 상태(fullBySheet 등)에 반영
        // (지금은 UI에서 바로 ExcelEditor를 보여주고 있어서
        //  꼭 필요 없다면 생략 가능)
        // setFullBySheet(sheets);

        // 여러 시트를 포함한 워크북 Blob 생성
        const blob = buildXlsxFromSheets(sheets);

        const filename = `${formCode || testCaseId}.xlsx`;

        await uploadTestcaseExcel(testCaseId, {
          file: blob,
          filename,
          edited: true,
          // sheetName은 이제 단일 시트 업로드가 아니면 굳이 필요 X
        });

        showToast("success", "수정된 엑셀 파일을 업로드했습니다.");
        navigate(`/testcases/${testCaseId}/detail`, { replace: true });
      } catch (err) {
        if (err?.code !== REQUEST_CANCELED_CODE) {
          showToast("error", toErrorMessage(err));
        }
      } finally {
        setUploading(false);
      }
    },
    [blocked, uploading, navigate]
  );

  // 업로드(선택 시트만)
  const uploadEdited = useCallback(async (previewAOA, selectedSheet, formCode, testCaseId, setEditorOpen) => {
    console.log(uploadEdited);
    if (blocked || uploading || !selectedSheet || previewAOA.length === 0) return;

    setUploading(true);
    try {
      const aoaToSave = Array.isArray(previewAOA) ? previewAOA : [];

      setFullBySheet((prev) => ({
        ...prev,
        [selectedSheet]: aoaToSave,
      }));

      // AOA를 Blob으로 변환
      const blob = buildXlsxFromAOA(selectedSheet, aoaToSave);
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
  }, []);


  // AOA 업데이트 유틸
  const updateCell = useCallback((rowIdx, colIdx, value) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev) || !prev[rowIdx]) return prev;
      const nextRow = prev[rowIdx].map((cell, index) => (index === colIdx ? value : cell));
      const next = prev.map((row, index) => (index === rowIdx ? nextRow : row));
      return next;
    });
  }, []);

  const insertRowBelow = useCallback((rowIdx) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev)) return prev;
      const colCount = Math.max((prev[rowIdx]?.length || 0), (prev[0]?.length || 0));
      const empty = Array.from({ length: colCount }, () => "");
      const next = prev.slice();
      next.splice(rowIdx + 1, 0, empty);
      return next;
    });
  }, []);

  const deleteRowAt = useCallback((rowIdx) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev) || prev.length <= 1) return prev;
      const next = prev.slice();
      next.splice(rowIdx, 1);
      return next;
    });
  }, []);

  // Effects
  // 1. 최초 서버 파일 자동 로드
  useEffect(() => {
    console.log('// 1. 최초 서버 파일 자동 로드');
    if (!autoLoaded && excelFileName && testCaseId) {
      setAutoLoaded(true);
      loadServerExcel();
    }
  }, [testCaseId]);

  // 2. 시트 변경 시 미리보기 갱신
  useEffect(() => {
    console.log('// 2. 시트 변경 시 미리보기 갱신');
    if (!meta || !selectedSheet) return;
    setPreviewAOA(meta.previewBySheet?.[selectedSheet] || []);
  }, [meta, selectedSheet]);

  // 3. 템플릿 모드에서 시트명 자동 동기화
  useEffect(() => {
    console.log('// 3. 템플릿 모드에서 시트명 자동 동기화')
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
    loadServerExcel, downloadServerExcel,
    handlePickFile, startFromTemplate, uploadEdited, uploadSheets,
    updateCell, insertRowBelow, deleteRowAt, resetPicker,
    pickInitialSheet,
  };
}