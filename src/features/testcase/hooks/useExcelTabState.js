import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../shared/hooks/useToast";
import {
  readExcelFile,
  buildXlsxFromAOA,
  buildInitialSheetAOA,
  buildXlsxFromSheets,
} from "../../../shared/utils/excelUtils";
import { downloadFile } from "../../../shared/utils/fileUtils";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import { toErrorMessage } from "../../../services/axios";
import { uploadTestcaseExcel } from "../../../services/testcaseAPI";

// ──────────────────────────────────────────────────────────────────────────────
// 템플릿 헬퍼
// ──────────────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG_HEADERS = [
  "no",
  "name",
  "mandatory",
  "skip_on_error",
  "sleep",
  "action",
  "input_text",
  "by",
  "value",
  "memo",
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
  const aoa = buildInitialSheetAOA(header, [], {
    minRows: 10,
    fromFile: false,
  });
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
export function useExcelTabState({
                                   form,
                                   testCaseId,             // 기존 이름 그대로 사용 (resource id 로 취급)
                                   excelFileName,
                                   readOnly = false,
                                   navigate,                // 기존 코드 호환용 (테스트케이스 상세로 이동 등에 사용)
                                   loadExcelAPI,            // async ({ id }) => Blob | File
                                   downloadExcelAPI,        // async ({ id, downloadName }) => Promise<void>
                                   uploadExcelAPI,          // async ({ id, blob, filename, sheetName, edited }) => Promise<void>
                                   autoLoadOnMount = true,  // true면 excelFileName 있을 때 최초 자동 로드
                                   uploadScope = "sheet",   // "sheet" | "workbook"  ← 업로드 단위
                                 }) {
  const { showToast } = useToast();
  const id = testCaseId; // 의미상 resource id

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
  const canEdit = !!id && !isRO;
  const blocked = !id || readOnly;

  // 실제 데이터가 있는 시트 중에서 최초 선택 시트를 고르는 헬퍼
  const pickInitialSheet = useCallback((meta) => {
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

  // ──────────────────────────────────────────
  // 서버 저장본 불러오기
  // ──────────────────────────────────────────
  const loadServerExcel = useCallback(async () => {
    if (!id) return;
    try {
      let blob;

      if (loadExcelAPI) {
        blob = await loadExcelAPI({ id });
      } else {
        const res = await fetch(
          `/api/v1/testcases/${encodeURIComponent(id)}/excel`,
          { method: "GET" }
        );
        if (!res.ok) {
          throw new Error(
            (await res.text().catch(() => "")) || `HTTP ${res.status}`
          );
        }
        blob = await res.blob();
      }

      const name =
        (excelFileName && String(excelFileName).trim()) ||
        `${form?.code || id}.xlsx`;
      const fileObj = new File([blob], name, {
        type:
          blob.type ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
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
  }, [id, excelFileName, form?.code, loadExcelAPI, pickInitialSheet, showToast]);

  // ──────────────────────────────────────────
  // 서버 저장본 직접 다운로드
  // ──────────────────────────────────────────
  const downloadServerExcel = useCallback(async () => {
    if (!id) return;
    try {
      const downloadName =
        (excelFileName && String(excelFileName).trim()) ||
        `${form?.code || id}.xlsx`;

      if (downloadExcelAPI) {
        await downloadExcelAPI({ id, downloadName });
      } else {
        await downloadFile(
          `/api/v1/testcases/${encodeURIComponent(id)}/excel`,
          downloadName
        );
      }
    } catch (err) {
      showToast({
        type: "error",
        message: "다운로드 실패",
        detailMessage: err,
      });
    }
  }, [id, excelFileName, form?.code, downloadExcelAPI, showToast]);

  // ──────────────────────────────────────────
  // 업로드 실제 구현 (workbook / sheet 공통 활용)
  // ──────────────────────────────────────────
  const doUploadWorkbook = useCallback(
    async (sheets, formCode, idOverride) => {
      const targetId = idOverride ?? id;
      if (!targetId) return;

      const blob = buildXlsxFromSheets(sheets);
      const filename = `${formCode || targetId}.xlsx`;

      if (uploadExcelAPI) {
        await uploadExcelAPI({
          id: targetId,
          blob,
          filename,
          edited: true,
        });
      } else {
        await uploadTestcaseExcel(targetId, {
          file: blob,
          filename,
          edited: true,
        });
      }
    },
    [id, uploadExcelAPI]
  );

  const doUploadSheet = useCallback(
    async (aoa, sheetName, formCode, idOverride) => {
      const targetId = idOverride ?? id;
      if (!targetId) return;
      if (!sheetName) throw new Error("sheetName 이 필요합니다.");

      const blob = buildXlsxFromAOA(sheetName, aoa);
      const filename = `${formCode || targetId}-${sheetName}.xlsx`;

      if (uploadExcelAPI) {
        await uploadExcelAPI({
          id: targetId,
          blob,
          filename,
          sheetName,
          edited: true,
        });
      } else {
        await uploadTestcaseExcel(targetId, {
          file: blob,
          sheetName,
          filename,
          edited: true,
        });
      }
    },
    [id, uploadExcelAPI]
  );

  // ──────────────────────────────────────────
  // 파일 업로드(로컬 파일 선택)
  // ──────────────────────────────────────────
  const handlePickFile = useCallback(
    async (f) => {
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
    },
    [pickInitialSheet, showToast]
  );

  // 템플릿 시작
  const startFromTemplate = useCallback(
    (openEditor) => {
      const initialName = sanitizeSheetName(form?.name || "custom_sheet");
      const m = makeTemplateMeta(initialName, form?.name);
      setFile(null);
      setMeta(m);
      setSelectedSheet(initialName);
      setPreviewAOA(m.previewBySheet[initialName]);
      setFullBySheet({ [initialName]: m.previewBySheet[initialName] });
      if (openEditor) openEditor();
      showToast("info", "기본 템플릿으로 새 시트를 시작합니다.");
    },
    [form?.name, showToast]
  );

  // ──────────────────────────────────────────
  // 업로드(전체 시트) - uploadScope 에 따라 동작 분기
  // ──────────────────────────────────────────
  const uploadSheets = useCallback(
    async (sheets, formCode, idOverride) => {
      if (blocked || uploading) return;

      setUploading(true);
      try {
        if (uploadScope === "workbook") {
          // 전체 워크북 업로드
          if (!sheets || Object.keys(sheets).length === 0) {
            showToast("error", "업로드할 워크북 데이터가 없습니다.");
            return;
          }
          await doUploadWorkbook(sheets, formCode, idOverride);
        } else {
          // 단일 시트 업로드 ("sheet" 모드)
          // 1) 기본값: 현재 선택된 시트 + previewAOA
          let sheetName = selectedSheet;
          let aoa =
            Array.isArray(previewAOA) && previewAOA.length > 0
              ? previewAOA
              : null;

          // 2) ExcelEditor(onSave)에서 넘어온 sheets 인자가 1개 시트면 그걸 우선 사용
          if (sheets && typeof sheets === "object") {
            const keys = Object.keys(sheets);
            if (keys.length === 1) {
              const k = keys[0];
              const v = sheets[k];
              if (Array.isArray(v) && v.length > 0) {
                sheetName = k;
                aoa = v;
              }
            }
          }

          if (!sheetName || !aoa) {
            showToast("error", "업로드할 시트 데이터가 없습니다.");
            return;
          }

          setFullBySheet((prev) => ({
            ...prev,
            [sheetName]: aoa,
          }));

          await doUploadSheet(aoa, sheetName, formCode, idOverride);
        }

        showToast("success", "수정된 엑셀 파일을 업로드했습니다.");

        if (navigate && (idOverride || id)) {
          navigate(`/testcases/${idOverride || id}/detail`, { replace: true });
        }
      } catch (err) {
        if (err?.code !== REQUEST_CANCELED_CODE) {
          showToast("error", toErrorMessage(err));
        }
      } finally {
        setUploading(false);
      }
    },
    [
      blocked,
      uploading,
      uploadScope,
      doUploadWorkbook,
      doUploadSheet,
      selectedSheet,
      previewAOA,
      showToast,
      navigate,
      id,
    ]
  );

  // ──────────────────────────────────────────
  // 업로드(선택 시트만) - 기존 시그니처 유지 (sheet 전용)
  // ──────────────────────────────────────────
  const uploadEdited = useCallback(
    async (
      previewAOAParam,
      selectedSheetParam,
      formCode,
      idOverride,
      setEditorOpen
    ) => {
      if (blocked || uploading) return;
      const sheetName = selectedSheetParam || selectedSheet;
      const aoa = Array.isArray(previewAOAParam)
        ? previewAOAParam
        : previewAOA;

      if (!sheetName || !aoa || aoa.length === 0) return;

      setUploading(true);
      try {
        setFullBySheet((prev) => ({
          ...prev,
          [sheetName]: aoa,
        }));

        await doUploadSheet(aoa, sheetName, formCode, idOverride);

        showToast("success", "수정본을 업로드했습니다.");
        if (setEditorOpen) setEditorOpen(false);

        if (navigate && (idOverride || id)) {
          navigate(`/testcases/${idOverride || id}/detail`, { replace: true });
        }
      } catch (err) {
        if (err?.code !== REQUEST_CANCELED_CODE)
          showToast("error", toErrorMessage(err));
      } finally {
        setUploading(false);
      }
    },
    [
      blocked,
      uploading,
      selectedSheet,
      previewAOA,
      doUploadSheet,
      showToast,
      navigate,
      id,
    ]
  );

  // AOA 업데이트 유틸
  const updateCell = useCallback((rowIdx, colIdx, value) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev) || !prev[rowIdx]) return prev;
      const nextRow = prev[rowIdx].map((cell, index) =>
        index === colIdx ? value : cell
      );
      const next = prev.map((row, index) =>
        index === rowIdx ? nextRow : row
      );
      return next;
    });
  }, []);

  const insertRowBelow = useCallback((rowIdx) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev)) return prev;
      const colCount = Math.max(
        prev[rowIdx]?.length || 0,
        prev[0]?.length || 0
      );
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
  useEffect(() => {
    if (!autoLoadOnMount) return;
    if (!autoLoaded && excelFileName && id) {
      setAutoLoaded(true);
      loadServerExcel();
    }
  }, [autoLoadOnMount, autoLoaded, excelFileName, id, loadServerExcel]);

  useEffect(() => {
    if (!meta || !selectedSheet) return;
    setPreviewAOA(meta.previewBySheet?.[selectedSheet] || []);
  }, [meta, selectedSheet]);

  useEffect(() => {
    if (!meta || file) return;
    if (!selectedSheet) return;
    const desired = sanitizeSheetName(form?.name || selectedSheet);
    if (
      desired &&
      desired !== selectedSheet &&
      !(meta.sheets || []).includes(desired)
    ) {
      const nextMeta = {
        ...meta,
        sheets: meta.sheets.map((n) =>
          n === selectedSheet ? desired : n
        ),
        previewBySheet: { ...meta.previewBySheet },
        headerBySheet: { ...(meta.headerBySheet || {}) },
      };
      nextMeta.previewBySheet[desired] =
        nextMeta.previewBySheet[selectedSheet];
      delete nextMeta.previewBySheet[selectedSheet];
      if (nextMeta.headerBySheet[selectedSheet]) {
        nextMeta.headerBySheet[desired] =
          nextMeta.headerBySheet[selectedSheet];
        delete nextMeta.headerBySheet[selectedSheet];
      }
      setMeta(nextMeta);
      setSelectedSheet(desired);
    }
  }, [form?.name, meta, file, selectedSheet]);

  // Computed values
  const headers = useMemo(
    () => (previewAOA?.[0] || []).map((h) => String(h ?? "")),
    [previewAOA]
  );
  const dataRows = useMemo(
    () => previewAOA?.slice(1) || [],
    [previewAOA]
  );

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
    file,
    meta,
    fullBySheet,
    selectedSheet,
    previewAOA,
    uploading,
    // 파생 상태
    isRO,
    canEdit,
    blocked,
    headers,
    dataRows,
    visibleSheets,
    uploadScope,
    // 세터
    setFile,
    setMeta,
    setFullBySheet,
    setSelectedSheet,
    setPreviewAOA,
    setUploading,
    // 액션
    loadServerExcel,
    downloadServerExcel,
    handlePickFile,
    startFromTemplate,
    uploadSheets,
    uploadEdited,
    updateCell,
    insertRowBelow,
    deleteRowAt,
    resetPicker,
    pickInitialSheet,
  };
}