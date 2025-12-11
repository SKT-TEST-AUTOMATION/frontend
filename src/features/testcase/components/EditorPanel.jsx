// EditorPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { StartChooser } from "./excel/StartChooser";
import ExcelEditor from "../../../shared/components/excel/ExcelEditor.jsx";
import CardEditor from "./card/CardEditor.jsx";
import { STEP_HEADERS } from "../constants/stepConstants.js";
import { aoaToSteps, stepsToAoa } from "../utils/stepExcelMapper.js";
import { uploadTestcaseExcel } from '../../../services/testcaseAPI.js';

/**
 * @param {{
 *  form: any;
 *  testCaseId?: number|string;
 *  excelFileName?: string;
 *  readOnly: boolean;
 *  isReadOnlyState: boolean;
 *  hasWorkbook: boolean;
 *  activeSheetAOA: any[]|null;
 *  sheets?: any;   // 서버에서 오는 워크북 또는 래퍼 객체
 *  meta: any;
 *  excelEditorRef: React.RefObject<any>;
 *  uploadSheets: (sheets: Record<string, any[][]>, code?: string, id?: any) => void;
 *  startFromTemplate: () => void;
 *  dragOver: boolean;
 *  isDropDisabled: boolean;
 *  onDrop: (e: React.DragEvent) => void;
 *  onDragOver: (e: React.DragEvent) => void;
 *  onDragLeave: () => void;
 *  onPickUpload: () => void;
 * }} props
 */
export default function EditorPanel({
                                      form,
                                      testCaseId,
                                      excelFileName,
                                      readOnly,
                                      isReadOnlyState,
                                      hasWorkbook,
                                      activeSheetAOA,
                                      sheets,
                                      meta,
                                      excelEditorRef,
                                      uploadSheets,
                                      startFromTemplate,
                                      dragOver,
                                      isDropDisabled,
                                      onDrop,
                                      onDragOver,
                                      onDragLeave,
                                      onPickUpload,
                                      onActiveSheetChange
                                    }) {
  const [viewMode, setViewMode] = useState("card"); // 기본 엑셀 뷰

  // 카드 뷰용 "스텝 시트" AOA
  const [sheetAOA, setSheetAOA] = useState([[""]]);

  useEffect(() => {
    const next =
      activeSheetAOA && activeSheetAOA.length > 0 ? activeSheetAOA : [[""]];
    setSheetAOA(next);
  }, [activeSheetAOA]);

  // 카드 뷰용 Step 리스트
  const initialStepsForCard = useMemo(
    () => aoaToSteps(sheetAOA, STEP_HEADERS),
    [sheetAOA]
  );

  const handleBuildExcelFromStepsEntry = () => {
    if (readOnly) return;
    startFromTemplate();
    setViewMode("card");
  };

  // --- 유틸: 워크북 정규화 ---
  // 1) { sheetName: AOA }
  // 2) { sheets: { sheetName: AOA }, sheetNames?: string[] }
  const normalizeWorkbook = (raw) => {
    if (!raw) return null;

    // 배열이면 단일 시트 AOA 라고 보고 래핑
    if (Array.isArray(raw)) {
      const name = form?.code || "TestCase";
      return { [name]: raw };
    }

    if (typeof raw === "object") {
      // { sheets: {...}, sheetNames: [...] } 형태 처리
      if (
        Object.prototype.hasOwnProperty.call(raw, "sheets") &&
        raw.sheets &&
        typeof raw.sheets === "object" &&
        !Array.isArray(raw.sheets)
      ) {
        return raw.sheets;
      }
      // 이미 { sheetName: AOA } 형태라고 가정
      return raw;
    }

    return null;
  };

  // 카드 뷰에서 저장 시:
  // - steps → AOA
  // - 기존 워크북(sheets)을 정규화해서 해당 시트만 덮어쓰기
  const handleSaveFromCard = (blob, { steps, sheetName }) => {
    if (readOnly) return;

    const sheetNameToUse = sheetName || form?.code || "TestCase";
    const aoa = stepsToAoa(steps, STEP_HEADERS);

    setSheetAOA(aoa);

    const baseWorkbook = normalizeWorkbook(sheets) || {};
    const mergedSheets = {
      ...baseWorkbook,
      [sheetNameToUse]: aoa,
    };

    uploadSheets(mergedSheets, form?.code, testCaseId);
  };

  // ExcelEditor에서 저장:
  const handleSaveFromExcel = (nextSheets, fileName) => {
    const normalized = normalizeWorkbook(nextSheets);
    console.log('handleSaveFromExcel : normalized : ',normalized);
    if (!normalized) {

      uploadSheets(nextSheets, form?.code, testCaseId);
      return;
    }

    // "스텝 시트" 우선순위
    const preferredName = form?.code;
    let stepSheetName = null;

    if (preferredName && normalized[preferredName]) {
      stepSheetName = preferredName;
    } else if (normalized["TestCase"]) {
      stepSheetName = "TestCase";
    } else {
      const names = Object.keys(normalized);
      if (names.length > 0) {
        stepSheetName = names[0];
      }
    }

    if (stepSheetName) {
      const nextAOA = normalized[stepSheetName];
      if (nextAOA && Array.isArray(nextAOA)) {
        setSheetAOA(nextAOA);
      }
    }

    uploadSheets(normalized, form?.code, testCaseId);
  };

  const showStartChooser = !isReadOnlyState && !hasWorkbook;

  // ExcelEditor에 넘길 initialData
  // - 1순위: 서버에서 준 워크북 전체 (여러 시트 그대로)
  // - 2순위: stepAOA 기반 단일 시트
  // - stepAOA도 실데이터가 없으면 null → ExcelEditor가 STEP_HEADERS + 빈 행 생성
  const excelInitialData = useMemo(() => {
    const workbook = normalizeWorkbook(meta);
    if (workbook) {
      return workbook;
    }

    const aoa = sheetAOA;
    const hasRealData =
      aoa &&
      Array.isArray(aoa) &&
      aoa.length > 0 &&
      aoa.some((row) =>
        Array.isArray(row)
          ? row.some(
            (cell) =>
              cell != null && String(cell).trim() !== ""
          )
          : false
      );

    if (!hasRealData) {
      // "데이터가 안 들어온" 경우 → ExcelEditor가 STEP_HEADERS + 빈행 생성
      return null;
    }

    const fallbackName = form?.code || "TestCase";
    return { [fallbackName]: aoa };
  }, [sheets, sheetAOA, form?.code]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col min-h-0">
      {/* 1. 시작 선택 (파일/메타가 전혀 없을 때만 표시) */}
      {showStartChooser && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            relative rounded-2xl border-2 border-dashed p-10 transition-all duration-200 ease-in-out m-4
            ${
            dragOver
              ? "border-blue-400 bg-blue-50/50 scale-[1.01] shadow-lg"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
          }
          `}
        >
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
              테스트 케이스 스텝 파일 생성
            </h3>
            <p className="text-sm text-slate-500">
              엑셀 파일을 드래그하거나 아래 옵션을 선택하세요.
            </p>
          </div>
          <StartChooser
            disabled={isDropDisabled}
            onPickUpload={onPickUpload}
            onPickEmpty={startFromTemplate}
            onPickStepEditor={handleBuildExcelFromStepsEntry}
          />
        </div>
      )}

      {/* 2. 파일/메타가 있으면, 편집 UI */}
      {hasWorkbook && (
        <>
          {/* 뷰 모드 토글 바 */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 px-4 py-2">
              <div className="inline-flex items-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                    viewMode === "card"
                      ? "bg-blue-700 text-white dark:bg-blue-100 dark:text-blue-700 shadow-sm"
                      : "text-blue-600 dark:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-800/80"
                  }`}
                >
                  카드 형식
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("excel")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                    viewMode === "excel"
                      ? "bg-blue-700 text-white dark:bg-blue-100 dark:text-blue-700 shadow-sm"
                      : "text-blue-600 dark:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-800/80"
                  }`}
                >
                  엑셀 형식
                </button>
              </div>
            </div>

          {/* 실제 편집 영역 */}
            <div className="h-[85vh] min-h-0">
              {viewMode === "card" ? (
                <CardEditor
                  initialSteps={initialStepsForCard}
                  defaultSheetName={form?.code || "TestCase"}
                  onBuildExcel={handleSaveFromCard}
                  readOnly={readOnly}
                />
              ) : (
                <ExcelEditor
                  ref={excelEditorRef}
                  initialData={excelInitialData}
                  title={
                    excelFileName || `${form?.code || testCaseId || ""}.xlsx`
                  }
                  subtitle={form?.name ?? "테스트 케이스"}
                  defaultFileName={
                    excelFileName ||
                    `${form?.code || testCaseId || "testcase"}.xlsx`
                  }
                  onActiveSheetChange={onActiveSheetChange}
                  onSave={handleSaveFromExcel}
                  columnDescriptions={{
                    no: "스텝 번호(가급적 숫자로 입력하세요).",
                    name: "이 스텝이 수행할 동작을 정의하세요.",
                    action:
                      "click / input / tap / image / key / back / swipe ...",
                    by: "대상을 찾는 방법 또는 좌표 타입. XPATH, ID, ACCESSIBILITY_ID, CLASS_NAME, ANDROID_UIAUTOMATOR, COORD, ABS",
                    value: "선택자/좌표/이미지 경로 등.",
                    input_text: "입력할 텍스트/특수키. \\n (엔터)",
                    visible_if:
                      "이 요소가 보이면 실행. visible_if_type과 함께 사용합니다.",
                    visible_if_type:
                      "visible_if의 selector 타입. ID, ACCESSIBILITY_ID, CLASS_NAME, ANDROID_UIAUTOMATOR...",
                    skip_on_error: "에러 무시 여부. Y / N (기본 N)",
                    true_jump_no: "이 스텝 성공 시 이동할 스텝 번호",
                    false_jump_no: "이 스텝 실패 시 이동할 스텝 번호",
                    mandatory: "필수 스텝 여부. Y / N",
                    sleep: "실행 전 대기 시간(초).",
                  }}
                  readOnly={readOnly}
                  uploadScope="sheet"
                  sheetName={form?.code}
                />
              )}
            </div>
        </>
      )}
    </div>
  );
}