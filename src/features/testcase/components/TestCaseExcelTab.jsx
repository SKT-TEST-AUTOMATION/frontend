import React, { useRef, useState, useMemo } from "react";
import ExcelPreviewEditor from "./ExcelPreviewEditor";
import { useNavigate } from "react-router-dom";
import { useExcelTabState } from "../hooks/useExcelTabState";
import { PreviewHeaderCell, PreviewRow } from "./excel/PVEditor";
import { StartChooser } from "./excel/StartChooser";
import { readSheetAOA } from "../../../shared/utils/excelUtils";
import { DownloadIcon, ExpandIcon, RefreshIcon} from '../../../shared/components/icons.jsx';

// ============================
// COMPONENT
// ============================
export default function TestCaseExcelTab({ form, testCaseId, excelFileName, readOnly = false }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const PREVIEW_ROW_LIMIT = 50;

  const {
    file, meta, fullBySheet, selectedSheet, previewAOA, uploading,
    isRO, canEdit, blocked, headers, dataRows, visibleSheets,
    setFullBySheet, setSelectedSheet, setPreviewAOA,
    loadServerExcel, downloadServerExcel, handlePickFile,
    startFromTemplate, uploadEdited, updateCell,
    insertRowBelow, deleteRowAt, resetPicker,
  } = useExcelTabState({ form, testCaseId, excelFileName, readOnly, navigate });

  const isDropDisabled = !canEdit || uploading;
  const disabledEditedUpload = blocked || uploading || !selectedSheet || previewAOA.length === 0;

  const displayRows = useMemo(() => dataRows.slice(0, PREVIEW_ROW_LIMIT), [dataRows]);
  const hiddenRowCount = Math.max(0, dataRows.length - PREVIEW_ROW_LIMIT);

  // ✅ FIX: 함수를 명확하게 분리 (편집기 열기 전용)
  const handleOpenEditor = async () => {
    console.log("[TestCaseExcelTab] handleOpenEditor 호출");

    if (!selectedSheet || selectedSheet.trim() === "") {
      console.warn("[TestCaseExcelTab] selectedSheet이 없음");
      return;
    }

    const cached = fullBySheet[selectedSheet];
    if (cached?.length > 0) {
      setPreviewAOA(cached);
      setEditorOpen(true);
      return;
    }

    if (!file) {
      const fallback = meta?.previewBySheet?.[selectedSheet] || previewAOA || [];
      setFullBySheet((p) => ({ ...p, [selectedSheet]: fallback }));
      setPreviewAOA(fallback);
      setEditorOpen(true);
      return;
    }

    try {
      const fullAOA = await readSheetAOA(file, selectedSheet, { maxRows: Infinity });
      setFullBySheet((prev) => ({ ...prev, [selectedSheet]: fullAOA }));
      setPreviewAOA(fullAOA);
    } catch {
      const fallback = meta?.previewBySheet?.[selectedSheet] || previewAOA;
      setFullBySheet((prev) => ({ ...prev, [selectedSheet]: fallback }));
      setPreviewAOA(fallback);
    }
    setEditorOpen(true);
  };

  // ✅ FIX: 함수를 명확하게 분리 (편집기 닫기 전용)
  const handleCloseEditor = () => {
    console.log("[TestCaseExcelTab] handleCloseEditor 호출");
    if (selectedSheet) {
      setFullBySheet((p) => ({ ...p, [selectedSheet]: previewAOA }));
    }
    setEditorOpen(false);
  };

  // ✅ FIX: 함수를 명확하게 분리 (저장 및 업로드 전용)
  const handleSaveAndUpload = () => {
    console.log("[TestCaseExcelTab] handleSaveAndUpload 호출");

    // 최종 검증
    if (!selectedSheet || selectedSheet.trim() === "") {
      console.warn("[TestCaseExcelTab] selectedSheet이 없음");
      return;
    }

    if (previewAOA.length === 0) {
      console.warn("[TestCaseExcelTab] previewAOA가 비어있음");
      return;
    }

    console.log("[TestCaseExcelTab] uploadEdited 호출 시작");
    uploadEdited(previewAOA, selectedSheet, form?.code, testCaseId, setEditorOpen);
  };

  // ✅ FIX: 업로드 버튼 상태 (분리된 함수 기반)
  const getUploadButtonStatus = () => {
    if (blocked) return { disabled: true, title: "읽기 전용 모드이거나 접근 권한이 없습니다." };
    if (uploading) return { disabled: true, title: "업로드 중입니다..." };
    if (!selectedSheet) return { disabled: true, title: "시트를 선택해주세요." };
    if (previewAOA.length === 0) return { disabled: true, title: "업로드할 데이터가 없습니다." };
    return { disabled: false, title: "선택한 시트를 업로드합니다." };
  };

  // ✅ FIX: 파일 드래그 앤 드롭 처리
  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handlePickFile(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handlePickFile(f);
  };

  const uploadButtonStatus = getUploadButtonStatus();

  // ============================
  // RENDER
  // ============================
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        disabled={isDropDisabled}
        onChange={onInputChange}
      />

      {/* 1. 현재 저장된 파일 */}
      {testCaseId && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">현재 저장된 파일</span>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {excelFileName || <span className="text-slate-400 italic">파일 없음</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadServerExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium"
              title="서버에 저장된 파일을 불러옵니다."
            >
              <RefreshIcon className="w-3.5 h-3.5" /> 불러오기
            </button>

            <button
              onClick={() =>
                downloadServerExcel(excelFileName || `${form?.code || testCaseId}.xlsx`)
              }
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium"
              title="현재 파일을 다운로드합니다."
            >
              <DownloadIcon className="w-3.5 h-3.5" /> 다운로드
            </button>

            {!isRO && meta && (
              <button
                onClick={() => resetPicker(fileInputRef)}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium text-rose-600 border-rose-300"
                title="현재 상태를 초기화합니다."
              >
                초기화
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. 파일 없을 때 시작 화면 */}
      {!isRO && !meta && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className={`
            rounded-2xl border-2 border-dashed p-10 transition-all
            ${dragOver ? "border-indigo-400 bg-indigo-50/50 shadow-lg" : "border-slate-300"}
          `}
        >
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold mb-1">테스트 케이스 스텝 파일 생성</h3>
            <p className="text-sm text-slate-500">엑셀 파일을 드래그하거나 템플릿으로 시작하세요.</p>
          </div>

          <StartChooser
            disabled={isDropDisabled}
            onPickUpload={() => fileInputRef.current?.click()}
            onPickEmpty={() => startFromTemplate(() => setEditorOpen(true))}
          />
        </div>
      )}

      {/* 3. 시트 선택 + 업로드 버튼 */}
      {meta && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold">시트 선택</label>

            {!isRO && (
              <button
                type="button"
                disabled={uploadButtonStatus.disabled}
                onClick={handleSaveAndUpload}
                title={uploadButtonStatus.title}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-all ${
                  uploadButtonStatus.disabled
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
                }`}
              >
                {uploading ? "업로드 중..." : "선택 시트 업로드"}
              </button>
            )}
          </div>

          {/* 시트 탭 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {visibleSheets.length === 0 ? (
              <p className="text-xs text-slate-400">표시할 시트가 없습니다.</p>
            ) : (
              visibleSheets.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedSheet(name)}
                  className={`
                    px-4 py-2 rounded-lg text-sm border transition-all ${
                    selectedSheet === name
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {name}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. PREVIEW TABLE */}
      {meta && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          {/* 상단 헤더 */}
          <div className="px-5 py-3 border-b flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <h4 className="text-sm font-bold">{selectedSheet || "시트 없음"}</h4>
            </div>

            {dataRows.length > 0 && selectedSheet && (
              <button
                onClick={handleOpenEditor}
                className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700"
              >
                <ExpandIcon className="w-3.5 h-3.5" />
                전체 펼쳐보기
              </button>
            )}
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-white">
              <tr>
                {headers.map((h, i) => (
                  <PreviewHeaderCell key={i} h={h} />
                ))}
              </tr>
              </thead>

              <tbody className="divide-y">
              {dataRows.length === 0 && (
                <tr>
                  <td colSpan={headers.length} className="py-8 text-center text-slate-400">
                    {selectedSheet ? "데이터가 없습니다." : "시트를 선택해주세요."}
                  </td>
                </tr>
              )}

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

              {hiddenRowCount > 0 && (
                <tr>
                  <td colSpan={headers.length} className="py-6 text-center bg-slate-50">
                    <div className="text-xs text-slate-400 mb-2">
                      ... 외 {hiddenRowCount}개의 행이 더 있습니다
                    </div>
                    <button
                      onClick={handleOpenEditor}
                      className="px-4 py-2 rounded-full border text-xs font-semibold text-indigo-600 bg-white hover:shadow"
                    >
                      전체 편집기 열기
                    </button>
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. 전체 편집기 */}
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
          onUpload={handleSaveAndUpload}
          uploading={uploading}
          readOnly={isRO || blocked}
        />
      )}
    </div>
  );
}
