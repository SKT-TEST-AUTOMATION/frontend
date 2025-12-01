import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useExcelTabState } from "../hooks/useExcelTabState";
import { useExcelEditor } from "../../../shared/hooks/useExcelEditor";
import { StartChooser } from "./excel/StartChooser";
import ExcelEditor from "../../../shared/components/excel/ExcelEditor.jsx";

// ──────────────────────────────────────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────────────────────────────────────
const DownloadIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const RefreshIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

// ──────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트: NewTestCaseExcelTab
// ──────────────────────────────────────────────────────────────────────────────
export default function NewTestCaseExcelTab({
                                              form,
                                              testCaseId,
                                              excelFileName,
                                              readOnly = true,
                                            }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);

  // ExcelEditor 제어용 훅 (ref + getSheets)
  const { ref: excelEditorRef, getSheets } = useExcelEditor();

  // 기존 훅은 그대로 사용하되, 시트/프리뷰 관련 값은 더 이상 사용하지 않음
  const {
    file,
    meta,
    previewAOA,
    uploading,
    isRO,
    canEdit,
    blocked,
    loadServerExcel,
    downloadServerExcel,
    handlePickFile,
    startFromTemplate,
    uploadEdited, // 이제 "워크북 전체 업로드" 용도로 사용할 예정
    resetPicker,
    uploadSheets
  } = useExcelTabState({
    form,
    testCaseId,
    excelFileName,
    readOnly,
    navigate,
  });

  const isDropDisabled = !canEdit || uploading;

  // 파일 input 변경 핸들러
  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    handlePickFile(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 드래그 드롭: 파일 업로드
  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      const success = await handlePickFile(f);
      if (!success && fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  /**
   * 서버 업로드 트리거
   * - ExcelEditor에서 전체 워크북(sheets)을 가져와서 서버에 업로드
   * - 기존의 "시트 선택 + AOA 업로드"가 아니라 "전체 sheets 업로드"로 변경
   */
  const handleUploadWorkbook = () => {
    if (!excelEditorRef.current) return;

    const sheets = getSheets();
    if (!sheets || Object.keys(sheets).length === 0) {
      console.warn("업로드할 시트 데이터가 없습니다.");
      return;
    }

    // ❗ 여기서 uploadEdited의 시그니처를
    //    (sheets, form?.code, testCaseId) 형태로 맞춰서 수정하는 것을 권장
    uploadSheets(sheets, form?.code, testCaseId);
  };

  // ExcelEditor에 넘길 초기 데이터 (서버/로컬에서 온 프리뷰가 있다면 1시트로 사용)
  const initialSheetData = previewAOA && previewAOA.length > 0 ? previewAOA : [[""]];

  const hasWorkbook = !!meta || !!file; // 파일/메타가 있으면 에디터 표시

  // ExcelTabState에서 읽어온 meta → ExcelEditor로 워크북 전체 세팅
  useEffect(() => {
    // 에디터가 아직 없거나, 워크북 정보가 없으면 패스
    if (!excelEditorRef.current) return;
    if (!meta || !meta.sheets || meta.sheets.length === 0) return;

    // meta.previewBySheet 를 기반으로 sheets 맵 구성
    const sheetMap = {};
    meta.sheets.forEach((name) => {
      const aoa = meta.previewBySheet?.[name];
      if (aoa && aoa.length > 0) {
        sheetMap[name] = aoa;
      }
    });

    if (Object.keys(sheetMap).length === 0) return;

    // ExcelEditor 내부 상태 덮어쓰기
    excelEditorRef.current.setSheets(sheetMap);
  }, [meta, excelEditorRef]);


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={onInputChange}
        disabled={isDropDisabled}
        className="hidden"
      />

      {/* 1. 파일 관리 섹션 */}
      {testCaseId && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              현재 저장된 파일
            </span>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {excelFileName ? (
                excelFileName
              ) : (
                <span className="text-slate-400 italic">파일 없음</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadServerExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition shadow-sm"
            >
              <RefreshIcon className="w-3.5 h-3.5" /> 불러오기
            </button>
            <button
              type="button"
              onClick={() =>
                downloadServerExcel(
                  excelFileName || `${form?.code || testCaseId}.xlsx`
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition shadow-sm"
            >
              <DownloadIcon className="w-3.5 h-3.5" /> 다운로드
            </button>
            {!isRO && meta && (
              <button
                type="button"
                onClick={() => resetPicker(fileInputRef)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition shadow-sm ml-2"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. 시작 선택 (파일/메타가 전혀 없을 때만 표시) */}
      {!isRO && !hasWorkbook && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            relative rounded-2xl border-2 border-dashed p-10 transition-all duration-200 ease-in-out
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
            onPickUpload={() => fileInputRef.current?.click()}
            // 템플릿 시작 시: 훅 내부에서 previewAOA/meta를 세팅해주고,
            // hasWorkbook=true로 바뀌면 아래 ExcelEditor가 바로 나타난다.
            onPickEmpty={() => startFromTemplate()}
          />
        </div>
      )}

      {/* 3. 파일/메타가 있으면, 바로 ExcelEditor 전체 편집 UI 표시 (팝업/프리뷰 없음) */}
      {hasWorkbook && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          {/* 상단 툴바: 제목 + 업로드 버튼 */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">엑셀 편집기</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {form?.name ?? "테스트 케이스"} (
                {excelFileName || `${form?.code || testCaseId || ""}.xlsx`})
              </span>
            </div>
            {/*{!isRO && !blocked && (*/}
            {/*  <button*/}
            {/*    type="button"*/}
            {/*    onClick={handleUploadWorkbook}*/}
            {/*    disabled={uploading}*/}
            {/*    className={`px-4 py-2 rounded-lg text-xs font-semibold text-white ${*/}
            {/*      uploading*/}
            {/*        ? "bg-slate-400 cursor-not-allowed"*/}
            {/*        : "bg-blue-600 hover:bg-blue-700"*/}
            {/*    }`}*/}
            {/*  >*/}
            {/*    {uploading ? "업로드 중..." : "엑셀 전체 업로드"}*/}
            {/*  </button>*/}
            {/*)}*/}
          </div>

          {/* 실제 ExcelEditor 영역 */}
          <div className="h-[600px]">
            <ExcelEditor
              ref={excelEditorRef}
              initialData={initialSheetData} // 1개 시트 기준 시작 데이터
              title={excelFileName || `${form?.code || testCaseId || ""}.xlsx`}
              subtitle={form?.name ?? "테스트 케이스"}
              defaultFileName={
                excelFileName ||
                `${form?.code || testCaseId || "testcase"}.xlsx`
              }
              // ExcelEditor 내부 Save 버튼도 "업로드"와 동일 동작
              onSave={(sheets, fileName) => {
                // 필요하다면 fileName도 서버에 함께 전달 가능
                uploadSheets(sheets, form?.code, testCaseId);
              }}
              columnDescriptions={{
                no: "스텝 번호(가급적 숫자로 입력하세요).",
                name: "이 스텝이 수행할 동작을 정의하세요.",
                action: "click / input / tap / image / key / back / swipe ...",
                by: "대상을 찾는 방법 또는 좌표 타입. XPATH, ID, ACCESSIBILITY_ID, CLASS_NAME, ANDROID_UIAUTOMATOR, coord, abs",
                value:  "선택자/좌표/이미지 경로 등.",
                input_text: "입력할 텍스트/특수키. \\n (엔터)",
                visible_if: "이 요소가 보이면 실행. visible_if_type과 함께 사용합니다.",
                skip_on_error: "에러 무시 여부. Y / N (기본 N)",
                true_jump_no: "이 스텝 성공 시 이동할 스텝 번호",
                false_jump_no: "이 스텝 실패 시 이동할 스텝 번호",
                mandatory: "필수 스텝 여부. Y / N",
                sleep: "실행 전 대기 시간(초)."
              }} // 필요 없으면 빈 객체
              readOnly={readOnly}
              uploadScope = "sheet"
            />
          </div>
        </div>
      )}
    </div>
  );
}
