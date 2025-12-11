// src/features/testcase/hooks/useExcelTabState.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../shared/hooks/useToast";
import {
  readFile,                  // { sheets, sheetNames } 반환
  buildXlsxFromAOA,
  buildInitialSheetAOA,
  buildXlsxFromSheets,
} from "../../../shared/utils/excelUtils";
import { downloadFile } from "../../../shared/utils/fileUtils";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import { toErrorMessage } from "../../../services/axios";
import { uploadTestcaseExcel } from "../../../services/testcaseAPI";
import { useExcelWorkbookState } from "./useExcelWorkbookState";
import { STEP_HEADERS } from '../constants/stepConstants.js';

// 기본 컬럼 헤더 (템플릿용)
const DEFAULT_CONFIG_HEADERS = STEP_HEADERS;

// 시트 이름 검증
function checkedSheetName(raw) {
  const name = String(raw ?? "").trim();
  const invalid = /[\\/*?:\[\]]/g;
  const cleaned = name.replace(invalid, " ").slice(0, 31).trim();
  return cleaned || "Sheet1";
}

/**
 * IO + 업로드/다운로드만 담당하고,
 * 실제 워크북/시트 상태는 useExcelWorkbookState에 위임하는 훅
 */
export function useExcelTabState({
                                   form,
                                   testCaseId,          // resource id
                                   excelFileName,
                                   readOnly = false,
                                   navigate,

                                   loadExcelAPI,        // async ({ id }) => Blob | File
                                   downloadExcelAPI,    // async ({ id, downloadName }) => Promise<void>
                                   uploadExcelAPI,      // async ({ id, blob, filename, sheetName?, edited }) => Promise<void>

                                   autoLoadOnMount = true,
                                   uploadScope = "sheet", // "sheet" | "workbook"
                                 }) {
  const { showToast } = useToast();
  const resourceId = testCaseId;

  // 실제로 선택된 원본 파일 (서버 or 로컬)
  const [excelFile, setExcelFile] = useState(null);

  // 업로드 중 여부
  const [isUploading, setIsUploading] = useState(false);

  // 마운트 후 최초 자동 로딩 했는지 여부
  const [hasInitialLoadTriggered, setHasInitialLoadTriggered] = useState(false);

  // 파생 상태
  const isReadOnly = !!readOnly;
  const canEdit = !!resourceId && !isReadOnly;
  const isLocked = !resourceId || isReadOnly;

  // ───────────────────────────────────
  // 워크북/시트 상태는 전부 여기서 관리
  // ───────────────────────────────────
  const {
    workbook,                 // { [sheetName]: AOA }
    sheetNames,
    activeSheetName,
    activeSheetAOA,

    headers,
    dataRows,

    setFromWorkbook,          // { sheetNames, sheets } → 내부 map으로 세팅
    selectSheet,
    updateActiveSheetCell,
    insertRowBelowInActiveSheet,
    deleteRowAtInActiveSheet,
    commitActiveSheet,
    resetWorkbook,

    setActiveSheetName,
    setActiveSheetAOA
  } = useExcelWorkbookState({ rawWorkbook: null });

  // 현재 워크북 존재 여부
  const hasWorkbook = useMemo(
    () => !!workbook && Object.keys(workbook).length > 0,
    [workbook]
  );

  // ──────────────────────────────────────────
  // 서버 저장본 불러오기
  // ──────────────────────────────────────────
  const loadExcelFromServer = useCallback(async () => {
    if (!resourceId) return;

    try {
      let blob;

      if (loadExcelAPI) {
        blob = await loadExcelAPI({ id: resourceId });
      } else {
        const res = await fetch(
          `/api/v1/testcases/${encodeURIComponent(resourceId)}/excel`,
          { method: "GET" }
        );
        if (!res.ok) {
          throw new Error(
            (await res.text().catch(() => "")) || `HTTP ${res.status}`
          );
        }
        blob = await res.blob();
      }

      const fallbackName = `${form?.code || resourceId}.xlsx`;
      const name =
        (excelFileName && String(excelFileName).trim()) || fallbackName;

      const fileObj = new File([blob], name, {
        type:
          blob.type ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      setExcelFile(fileObj);

      // readFile → { sheets, sheetNames }
      const parsed = await readFile(fileObj);
      const nextWorkbookRaw = {
        sheetNames:
          parsed.sheetNames && parsed.sheetNames.length > 0
            ? parsed.sheetNames
            : Object.keys(parsed.sheets || {}),
        sheets: parsed.sheets || {},
      };

      // 실제 워크북 상태는 내부 훅에 위임
      setFromWorkbook(nextWorkbookRaw);

      showToast("success", "엑셀 파일을 불러왔습니다.");
    } catch (err) {
      if (err?.code === REQUEST_CANCELED_CODE) return;
      showToast("error", toErrorMessage(err));
    }
  }, [
    resourceId,
    excelFileName,
    form?.code,
    loadExcelAPI,
    setFromWorkbook,
    showToast,
  ]);

  // ──────────────────────────────────────────
  // 서버 저장본 다운로드
  // ──────────────────────────────────────────
  const downloadExcelFromServer = useCallback(async () => {
    if (!resourceId) return;
    try {
      const downloadName =
        (excelFileName && String(excelFileName).trim()) ||
        `${form?.code || resourceId}.xlsx`;

      if (downloadExcelAPI) {
        await downloadExcelAPI({ id: resourceId, downloadName });
      } else {
        await downloadFile(
          `/api/v1/testcases/${encodeURIComponent(resourceId)}/excel`,
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
  }, [resourceId, excelFileName, form?.code, downloadExcelAPI, showToast]);

  // ──────────────────────────────────────────
  // Workbook 업로드 helpers
  // ──────────────────────────────────────────
  const uploadWorkbookToServer = useCallback(
    async (sheetsMap, formCode, idOverride) => {
      const targetId = idOverride ?? resourceId;
      if (!targetId) return;

      const blob = buildXlsxFromSheets(sheetsMap);
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
    [resourceId, uploadExcelAPI]
  );

  const uploadSheetToServer = useCallback(
    async (aoa, sheetName, formCode, idOverride) => {
      const targetId = idOverride ?? resourceId;
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
    [resourceId, uploadExcelAPI]
  );

  // ──────────────────────────────────────────
  // 로컬 파일 선택(업로드) → Workbook 세팅
  // ──────────────────────────────────────────
  const loadLocalExcelFile = useCallback(
    async (fileObj) => {
      const validatePicked = (f) => {
        if (!f) return "파일을 선택해주세요.";
        const nameOk = /\.(xlsx)$/i.test(f.name);
        if (!nameOk) return "xlsx 파일만 업로드 가능합니다.";
        const MAX = 10 * 1024 * 1024;
        if (f.size > MAX) return "파일 크기가 10MB를 초과합니다.";
        return null;
      };

      const validationError = validatePicked(fileObj);
      if (validationError) {
        showToast("error", "파일 오류: " + validationError);
        return false;
      }

      try {
        setExcelFile(fileObj);

        const parsed = await readFile(fileObj); // { sheets, sheetNames }
        const nextWorkbookRaw = {
          sheetNames:
            parsed.sheetNames && parsed.sheetNames.length > 0
              ? parsed.sheetNames
              : Object.keys(parsed.sheets || {}),
          sheets: parsed.sheets || {},
        };

        setFromWorkbook(nextWorkbookRaw);

        return true;
      } catch {
        showToast("error", "엑셀 파싱에 실패했습니다.");
        return false;
      }
    },
    [setFromWorkbook, showToast]
  );

  // ──────────────────────────────────────────
  // 템플릿으로 새 Workbook 시작
  // ──────────────────────────────────────────
  const startWithTemplateWorkbook = useCallback(
    (openEditor) => {
      const header = DEFAULT_CONFIG_HEADERS.slice();
      const sheetName = checkedSheetName(form?.name);

      const aoa = buildInitialSheetAOA(header, [], {
        minRows: 5,
        fromFile: false,
      });

      const nextWorkbookRaw = {
        sheetNames: [sheetName],
        sheets: { [sheetName]: aoa },
      };

      setExcelFile(null);
      setFromWorkbook(nextWorkbookRaw);

      if (openEditor) openEditor();

      showToast("info", "기본 템플릿으로 새 시트를 시작합니다.");
    },
    [form?.name, setFromWorkbook, showToast]
  );

  // ──────────────────────────────────────────
  // 업로드: EditorPanel에서 onSave 호출 시 사용하는 통합 함수
  // ──────────────────────────────────────────
  const uploadSheetsToServer = useCallback(
    async (sheetsMap, formCode, idOverride) => {
      if (isLocked || isUploading) return;

      setIsUploading(true);
      try {
        if (uploadScope === "workbook") {
          // 워크북 단위 업로드
          const effectiveSheets =
            sheetsMap && Object.keys(sheetsMap).length > 0
              ? sheetsMap
              : workbook;

          if (
            !effectiveSheets ||
            Object.keys(effectiveSheets).length === 0
          ) {
            showToast("error", "업로드할 워크북 데이터가 없습니다.");
            return;
          }

          await uploadWorkbookToServer(effectiveSheets, formCode, idOverride);

          // 메모리 워크북도 동기화
          const names = Object.keys(effectiveSheets);
          setFromWorkbook({
            sheetNames: names,
            sheets: effectiveSheets,
          });
        } else {
          // 단일 시트 업로드 ("sheet" 모드)
          console.log("activeSheetName", activeSheetName);
          console.log("activeSheetAOA", activeSheetAOA);
          console.log("sheetsMap", sheetsMap);
          let sheetName = activeSheetName;
          let aoa =
            Array.isArray(activeSheetAOA) && activeSheetAOA.length > 0
              ? activeSheetAOA
              : null;

          // ExcelEditor에서 넘어온 sheetsMap 인자가 1개 시트면 그걸 우선 사용
          if (sheetsMap && typeof sheetsMap === "object") {
            const keys = Object.keys(sheetsMap);
            if (keys.length === 1) {
              const k = keys[0];
              const v = sheetsMap[k];
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

          await uploadSheetToServer(aoa, sheetName, formCode, idOverride);

          // 메모리 워크북도 갱신
          const prevNames = sheetNames;
          const nextSheets = {
            ...(workbook || {}),
            [sheetName]: aoa,
          };
          const nextNames = prevNames.includes(sheetName)
            ? prevNames
            : [...prevNames, sheetName];

          setFromWorkbook({
            sheetNames: nextNames,
            sheets: nextSheets,
          });
        }

        showToast("success", "수정된 엑셀 파일을 업로드했습니다.");

        if (navigate && (idOverride || resourceId)) {
          navigate(`/testcases/${idOverride || resourceId}/detail`, {
            replace: true,
          });
        }
      } catch (err) {
        if (err?.code !== REQUEST_CANCELED_CODE) {
          showToast("error", toErrorMessage(err));
        }
      } finally {
        setIsUploading(false);
      }
    },
    [
      isLocked,
      isUploading,
      uploadScope,
      workbook,
      activeSheetName,
      activeSheetAOA,
      sheetNames,
      uploadWorkbookToServer,
      uploadSheetToServer,
      showToast,
      navigate,
      resourceId,
      setFromWorkbook,
    ]
  );

  // ──────────────────────────────────────────
  // 전체 초기화 (파일 + 워크북 상태)
  // ──────────────────────────────────────────
  const resetExcelSelection = useCallback(
    (fileInputRef) => {
      setExcelFile(null);
      resetWorkbook();
      setHasInitialLoadTriggered(true);

      if (fileInputRef?.current) {
        fileInputRef.current.value = "";
      }
    },
    [resetWorkbook]
  );

  // ──────────────────────────────────────────
  // 마운트 시 서버 엑셀 자동 로드
  // ──────────────────────────────────────────
  useEffect(() => {
    if (!autoLoadOnMount) return;
    if (!hasInitialLoadTriggered && excelFileName && resourceId) {
      setHasInitialLoadTriggered(true);
      loadExcelFromServer();
    }
  }, [
    autoLoadOnMount,
    hasInitialLoadTriggered,
    excelFileName,
    resourceId,
    loadExcelFromServer,
  ]);

  return {
    // 상태
    excelFile,
    workbook,          // { [sheetName]: AOA }
    activeSheetName,
    activeSheetAOA,
    isUploading,

    // 파생 상태
    isReadOnly,
    canEdit,
    isLocked,
    hasWorkbook,
    sheetNames,
    headers,
    dataRows,
    uploadScope,

    // 워크북/시트 조작 (UI용)
    selectSheet,
    updateActiveSheetCell,
    insertRowBelowInActiveSheet,
    deleteRowAtInActiveSheet,
    commitActiveSheet,

    // IO 액션
    loadExcelFromServer,
    downloadExcelFromServer,
    loadLocalExcelFile,
    startWithTemplateWorkbook,
    uploadSheetsToServer,
    resetExcelSelection,

    setActiveSheetName,
    setActiveSheetAOA
  };
}