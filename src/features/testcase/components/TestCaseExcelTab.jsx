import React, { useRef, useState, useMemo } from "react";
import { downloadFile } from "../../../shared/utils/fileUtils";
import ExcelPreviewEditor from "./ExcelPreviewEditor";
import { useNavigate } from "react-router-dom";
import { useExcelTabState } from "../hooks/useExcelTabState";
import { PreviewHeaderCell, PreviewRow } from "./excel/PVEditor";
import { StartChooser } from "./excel/StartChooser";
import { readSheetAOA } from '../../../shared/utils/excelUtils.js';

// ──────────────────────────────────────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────────────────────────────────────
const UploadIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const DownloadIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const RefreshIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const ExpandIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

// ──────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트: TestCaseExcelTab (Modern UI)
// ──────────────────────────────────────────────────────────────────────────────
export default function TestCaseExcelTab({ form, testCaseId, excelFileName, readOnly = false }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const PREVIEW_ROW_LIMIT = 50;

  const {
    file, meta, fullBySheet, selectedSheet, previewAOA, uploading,
    isRO, canEdit, blocked,
    headers, dataRows, visibleSheets,
    setFullBySheet, setSelectedSheet, setPreviewAOA,
    loadServerExcel, downloadServerExcel, handlePickFile, startFromTemplate, uploadEdited,
    updateCell, insertRowBelow, deleteRowAt, resetPicker,
  } = useExcelTabState({ form, testCaseId, excelFileName, readOnly, navigate });

  const isDropDisabled = !canEdit || uploading;
  const disabledEditedUpload = blocked || uploading || !selectedSheet || previewAOA.length === 0;

  const displayRows = useMemo(() => {
    return dataRows.slice(0, PREVIEW_ROW_LIMIT);
  }, [dataRows]);

  const hiddenRowCount = Math.max(0, dataRows.length - PREVIEW_ROW_LIMIT);

  const openEditor = async () => {
    if (!selectedSheet) return;
    if (!file) {
      const aoa = meta?.previewBySheet?.[selectedSheet] || previewAOA || [];
      setFullBySheet((prev) => ({ ...prev, [selectedSheet]: aoa }));
      setPreviewAOA(aoa);
      setEditorOpen(true);
      return;
    }
    const cached = fullBySheet[selectedSheet];
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setPreviewAOA(cached);
      setEditorOpen(true);
      return;
    }
    try {
      const fullAOA = await readSheetAOA(file, selectedSheet, { maxRows: Infinity, trimCells: true });
      setFullBySheet((prev) => ({ ...prev, [selectedSheet]: fullAOA }));
      setPreviewAOA(fullAOA);
      setEditorOpen(true);
    } catch (err) {
      console.error(err);
      const fallback = meta?.previewBySheet?.[selectedSheet] || previewAOA || [];
      setFullBySheet((prev) => ({ ...prev, [selectedSheet]: fallback }));
      setPreviewAOA(fallback);
      setEditorOpen(true);
    }
  };

  const handleCloseEditor = () => {
    if (selectedSheet) {
      setFullBySheet((prev) => ({ ...prev, [selectedSheet]: previewAOA }));
    }
    setEditorOpen(false);
  };

  const onInputChange = (e) => {
    handlePickFile(e.target.files?.[0]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const onDrop = async (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      const success = await handlePickFile(f);
      if (!success && fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  const handleUpload = () => {
    uploadEdited(previewAOA, selectedSheet, form?.code, testCaseId, setEditorOpen);
  };

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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">현재 저장된 파일</span>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {excelFileName ? excelFileName : <span className="text-slate-400 italic">파일 없음</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadServerExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition shadow-sm"
            >
              <RefreshIcon className="w-3.5 h-3.5" /> 불러오기
            </button>
            <button
              onClick={() => downloadServerExcel(excelFileName || `${form?.code || testCaseId}.xlsx`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition shadow-sm"
            >
              <DownloadIcon className="w-3.5 h-3.5" /> 다운로드
            </button>
            {!isRO && meta && (
              <button
                onClick={() => resetPicker(fileInputRef)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition shadow-sm ml-2"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. 시작 선택 (파일 없을 때) */}
      {!isRO && !meta && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            relative rounded-2xl border-2 border-dashed p-10 transition-all duration-200 ease-in-out
            ${dragOver
            ? "border-blue-400 bg-blue-50/50 scale-[1.01] shadow-lg"
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
          }
          `}
        >
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">테스트 케이스 스텝 파일 생성</h3>
            <p className="text-sm text-slate-500">엑셀 파일을 드래그하거나 아래 옵션을 선택하세요.</p>
          </div>
          <StartChooser
            disabled={isDropDisabled}
            onPickUpload={() => fileInputRef.current?.click()}
            onPickEmpty={() => startFromTemplate(() => setEditorOpen(true))}
          />
        </div>
      )}

      {/* 3. 시트 선택 및 업로드 */}
      {meta && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              시트 선택
              {meta && !file && <span className="text-[10px] font-normal px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">템플릿 작성 중</span>}
            </label>

            {!isRO && (
              <button
                type="button"
                disabled={disabledEditedUpload}
                onClick={handleUpload}
                className={`
                  px-5 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-md
                  ${disabledEditedUpload
                  ? "bg-slate-300 cursor-not-allowed shadow-none"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 active:translate-y-0.5"
                }
                `}
              >
                {uploading ? "업로드 중..." : "선택 시트 업로드"}
              </button>
            )}
          </div>

          {/* Modern Sheet Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {visibleSheets.length > 0 ? visibleSheets.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedSheet(name)}
                disabled={blocked}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border
                  ${selectedSheet === name
                  ? "bg-slate-800 text-white border-slate-800 shadow-md"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }
                `}
              >
                {name}
              </button>
            )) : (
              <div className="text-sm text-slate-400 italic px-2">표시할 시트가 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* 4. PREVIEW */}
      {meta && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {selectedSheet || "선택된 시트 없음"}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              {dataRows?.length > 0 && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  {Math.min(dataRows.length, PREVIEW_ROW_LIMIT)} / {dataRows.length} 행
                </span>
              )}
              {!isRO && dataRows?.length > 0 && (
                <button
                  type="button"
                  onClick={openEditor}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  <ExpandIcon className="w-3.5 h-3.5" />
                  전체 펼쳐보기
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-white dark:bg-slate-800">
              <tr>
                {headers.map((h, ci) => (
                  <PreviewHeaderCell key={ci} h={h} />
                ))}
              </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dataRows.length === 0 && (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-12 text-center text-slate-400 text-sm">
                    데이터가 없습니다. 시트를 선택하거나 파일을 업로드하세요.
                  </td>
                </tr>
              )}

              {/* 미리보기 Rows */}
              {displayRows.map((row, i) => (
                <PreviewRow
                  key={i}
                  row={row}
                  i={i}
                  headers={headers}
                  previewAOA={previewAOA}
                  updateCell={updateCell}
                  blocked={blocked}
                />
              ))}

              {/* Hidden Count Message */}
              {hiddenRowCount > 0 && (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-6 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                    <div className="flex flex-col items-start gap-2">
                        <span className="text-xs text-slate-400 font-medium">
                          ... 외 {hiddenRowCount}개의 행이 더 있습니다
                        </span>
                      {!isRO && (
                        <button
                          onClick={openEditor}
                          className="px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-semibold text-blue-600 shadow-sm hover:shadow hover:border-blue-200 transition-all"
                        >
                          전체 편집기 열기
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <ExcelPreviewEditor
          open={editorOpen}
          onClose={handleCloseEditor}
          meta={meta}
          selectedSheet={selectedSheet}
          onChangeSelectedSheet={setSelectedSheet}
          previewAOA={previewAOA}
          onChangeCell={updateCell}
          onInsertRow={insertRowBelow}
          onDeleteRow={deleteRowAt}
          onUpload={handleUpload}
          uploading={uploading}
          readOnly={isRO || blocked}
        />
      )}
    </div>
  );
}