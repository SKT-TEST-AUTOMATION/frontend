import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../../shared/hooks/useToast";
import { readExcelFile, buildXlsxFromAOA } from "../../../shared/utils/excelUtils";
import { downloadFile } from "../../../shared/utils/fileUtils";
import ExcelPreviewEditor from "./ExcelPreviewEditor";


export default function TestCaseExcelTab({ form, testCaseId, excelFileName, readOnly = false }) {
  const { showToast } = useToast();

  const [file, setFile] = useState(null); // 원본 File
  const [meta, setMeta] = useState(null); // { sheets, previewBySheet, headerBySheet }
  const [selectedSheet, setSelectedSheet] = useState("");
  const [previewAOA, setPreviewAOA] = useState([]); // 현재 선택 시트의 미리보기/편집본
  const [dragOver, setDragOver] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  // const [downloading, setDownloading] = useState(false);

  const fileInputRef = useRef(null);

  // UI 상태 플래그
  const isRO = !!readOnly;                 // 읽기 전용
  const canEdit = !!testCaseId && !isRO;   // 로컬 선택/업로드 가능 여부
  const isDropDisabled = !canEdit || uploading;

  // Disable all controls if !testCaseId
  const blocked = !testCaseId || readOnly;
  const disabledEditedUpload = blocked || uploading || !selectedSheet || previewAOA.length === 0;

  // 서버 저장본 불러오기 → 미리보기 세팅
  const loadServerExcel = async () => {
    if (!testCaseId) return;
    try {
      const res = await fetch(`/api/v1/testcases/${encodeURIComponent(testCaseId)}/excel`, { method: "GET" });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      const blob = await res.blob();
      const name = excelFileName || `${form?.code || testCaseId}.xlsx`;
      const fileObj = new File([blob], name, { type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      setFile(fileObj);
      const m = await readExcelFile(fileObj, { maxRows: 100 });
      setMeta(m);
      const preferred = m.sheets.includes("Config") ? "Config" : m.sheets[0];
      setSelectedSheet(preferred);
      setPreviewAOA(m.previewBySheet[preferred] || []);
      showToast("success","불러오기 완료");
    } catch (err) {
      showToast("error", "불러오기 실패");
    }
  };

  // 서버 저장본 직접 다운로드
  const downloadServerExcel = async () => {
    if (!testCaseId) return;
    try {
      const name = (excelFileName && String(excelFileName).trim()) || `${form?.code || testCaseId}.xlsx`;
      await downloadFile(`/api/v1/testcases/${encodeURIComponent(testCaseId)}/excel`, name);
    } catch (err) {
      showToast("error", "다운로드 실패");
    }
  };

  const validatePicked = (f) => {
    if (!f) return "파일을 선택해주세요.";
    const nameOk = /\.(xlsx)$/i.test(f.name);
    if (!nameOk) return "xlsx 파일만 업로드 가능합니다.";
    const MAX = 10 * 1024 * 1024;
    if (f.size > MAX) return "파일 크기가 10MB를 초과합니다.";
    return null;
  };

  const handlePick = async (f) => {
    const err = validatePicked(f);
    if (err) {
      showToast("error", "파일 오류");
      resetPicker();
      return;
    }
    try {
      setFile(f);
      const m = await readExcelFile(f, { maxRows: 100 });
      setMeta(m);
      const preferred = m.sheets.includes("Config") ? "Config" : m.sheets[0];
      setSelectedSheet(preferred);
      setPreviewAOA(m.previewBySheet[preferred] || []);
    } catch (e) {
      resetPicker();
      showToast("error", "엑셀 파싱에 실패했습니다.");
    }
  };

  const onInputChange = (e) => handlePick(e.target.files?.[0]);

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) await handlePick(f);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  const resetPicker = () => {
    setFile(null);
    setMeta(null);
    setSelectedSheet("");
    setPreviewAOA([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
  if (excelFileName && testCaseId && !meta) {
    loadServerExcel();
  }
}, [excelFileName, testCaseId]);

  // 시트 변경 시 미리보기 교체
  useEffect(() => {
    if (!meta || !selectedSheet) return;
    setPreviewAOA(meta.previewBySheet[selectedSheet] || []);
  }, [meta, selectedSheet]);

  // 업로드 액션 (only edited/single-sheet)
  const uploadEdited = async () => {
    if (disabledEditedUpload) return;
    setUploading(true);
    try {
      const blob = buildXlsxFromAOA(selectedSheet, previewAOA);
      const filename = `${form.code || testCaseId}-${selectedSheet}.xlsx`;
      const fd = new FormData();
      fd.append("file", blob, filename);
      fd.append("sheetName", selectedSheet);
      fd.append("edited", "true");
      // POST /api/v1/testcases/${testCaseId}/excel?userId=1
      const res = await fetch(`/api/v1/testcases/${encodeURIComponent(testCaseId)}/excel?userId=1`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      showToast("success", "수정본을 업로드했습니다.")
    } catch (err) {
      showToast("error", "수정본 업로드에 실패했습니다.")
    } finally {
      setUploading(false);
    }
  };

  // ───────────────────────── 편집 가능한 테이블 (공용) ─────────────────────────
  const updateCell = useCallback((ri, ci, val) => {
    setPreviewAOA((prev) => {
      const next = prev.map((row) => row.slice());
      if (!next[ri]) next[ri] = [];
      next[ri][ci] = val;
      return next;
    });
  }, []);

  const insertRowBelow = useCallback((ri) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev)) return prev;
      const next = prev.map((r) => Array.isArray(r) ? r.slice() : []);
      const colCount = Math.max((next[ri]?.length || 0), (next[0]?.length || 0));
      const empty = Array.from({ length: colCount }, () => "");
      next.splice(ri + 1, 0, empty);
      return next;
    });
  }, []);

  const deleteRowAt = useCallback((ri) => {
    setPreviewAOA((prev) => {
      if (!Array.isArray(prev) || prev.length <= 1) return prev; // 최소 1행은 유지(보통 헤더)
      const next = prev.map((r) => Array.isArray(r) ? r.slice() : []);
      next.splice(ri, 1);
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Alert if testcase not created */}
      {!testCaseId && (
        <div className="p-2 bg-yellow-100 text-yellow-800 rounded text-xs">
          기본 정보를 먼저 저장해 테스트케이스를 생성하세요. (단계 등록은 생성 후 가능합니다)
        </div>
      )}
      {testCaseId && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">
            서버 저장 엑셀: {excelFileName ? <b className="text-slate-700 dark:text-slate-200">{excelFileName}</b> : '없음'}
          </span>
          <button
            type="button"
            onClick={loadServerExcel}
            className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs"
          >
            불러오기
          </button>
          <button
            type="button"
            onClick={downloadServerExcel}
            className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs"
          >
            다운로드
          </button>
        </div>
      )}
      {/* 업로드 드롭존 */}
      {!isRO &&
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          "rounded-xl border-2 border-dashed p-6 text-center transition",
          dragOver
            ? "border-blue-400 bg-blue-50/40 dark:border-blue-500/50 dark:bg-blue-900/10"
            : "border-gray-300 dark:border-gray-700",
          isDropDisabled ? "opacity-60 cursor-not-allowed" : ""
        ].join(" ")}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">엑셀(.xlsx)을 끌어놓거나 선택하세요</p>
          <div className="flex items-center justify-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={onInputChange}
              disabled={isDropDisabled}
              className="hidden"
            />
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDropDisabled}
            >
              파일 선택
            </button>
            {file && <span className="text-xs text-gray-500">선택됨: <b>{file.name}</b></span>}
            {file && (
              <button
                type="button"
                className="px-3 py-2 rounded-lg border text-sm border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={resetPicker}
                disabled={!canEdit}
              >
                선택 해제
              </button>
            )}
          </div>
        </div>
      </div>
      }

      {/* 시트 선택 + 업로드 버튼 */}
      <div className="items-center">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2 md:mb-0">시트 선택</label>
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
              {(meta?.sheets || []).map((name) => (
                <label key={name} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <input
                    type="radio"
                    className="accent-blue-600"
                    checked={selectedSheet === name}
                    onChange={() => setSelectedSheet(name)}
                    disabled={blocked}
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-100 truncate" title={name}>{name}</span>
                </label>
              ))}
              {!meta?.sheets?.length && (
                <div className="px-3 py-6 text-sm text-slate-500">시트를 보려면 파일을 선택하세요.</div>
              )}
            </div>
          </div>
          {!isRO && (
            <button
              type="button"
              disabled={disabledEditedUpload}
              onClick={uploadEdited}
              className={[
                "px-6 py-3 rounded-md text-sm font-semibold min-w-[240px]",
                disabledEditedUpload
                  ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              ].join(" ")}
            >
              {uploading ? "업로드 중…" : "선택 시트 업로드"}
            </button>
          )}
        </div>
      </div>

      {/* 미리보기 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">미리보기 · {selectedSheet || "-"}</h4>
          <div className="flex items-center">
            {previewAOA?.length > 0 && (
              <span className="text-xs text-slate-500">{previewAOA.length}행 표시 (최대 100행)</span>
            )}
            {!isRO && previewAOA?.length > 0 && (
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="ml-3 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                수정하기
              </button>
            )}
          </div>
        </div>
        <div className="border rounded-lg overflow-auto max-h-96 border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-xs">
            <tbody>
              {(previewAOA || []).map((row, ri) => (
                <tr key={ri} className="border-b border-slate-100 dark:border-slate-800">
                  {(row || []).map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 whitespace-nowrap">
                      <input
                        value={cell ?? ""}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className={["w-full bg-transparent outline-none", ri === 0 ? "font-semibold" : ""].join(" ")}
                        disabled={blocked}
                        readOnly={!editorOpen}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {!previewAOA?.length && (
                <tr><td className="px-3 py-6 text-center text-slate-400">표시할 데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExcelPreviewEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        meta={meta}
        selectedSheet={selectedSheet}
        onChangeSelectedSheet={(name) => setSelectedSheet(name)}
        previewAOA={previewAOA}
        onChangeCell={updateCell}
        onInsertRow={insertRowBelow}
        onDeleteRow={deleteRowAt}
        onUpload={uploadEdited}
        uploading={uploading}
        readOnly={isRO || blocked}
      />
    </div>
  );
}