import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useExcelTabState } from "../hooks/useExcelTabState";
import { useExcelEditor } from "../../../shared/hooks/useExcelEditor";
import FilePanel from "./excel/FilePanel.jsx";
import EditorPanel from "./EditorPanel.jsx";
import { readFile } from 'xlsx';

export default function TestCaseStepTab({
                                              form,
                                              testCaseId,
                                              excelFileName,
                                              readOnly = true,
                                            }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);

  // ExcelEditor 제어용 훅
  const { ref: excelEditorRef } = useExcelEditor();

  const {
    // 상태
    excelFile,
    workbook,
    activeSheetName,
    activeSheetAOA,
    isUploading,

    // 파생 상태
    isReadOnly,
    canEdit,
    hasWorkbook,

    // 액션
    loadExcelFromServer,
    downloadExcelFromServer,
    loadLocalExcelFile,
    startWithTemplateWorkbook,
    uploadSheetsToServer,
    resetExcelSelection,

    setActiveSheetName,
    setActiveSheetAOA,
  } = useExcelTabState({
    form,
    testCaseId,
    excelFileName,
    readOnly,
    navigate,
    // uploadScope 기본값 "sheet" 그대로 사용
  });

  const isDropDisabled = !canEdit || isUploading;

  // 파일 input 변경 핸들러
  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      // 성공/실패 여부는 굳이 기다리지 않고, drag&drop 쪽에서만 await
      // readFile(f);
      loadLocalExcelFile(f);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 드래그 드롭: 파일 업로드
  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      const success = await loadLocalExcelFile(f);
      if (!success && fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const onActiveSheetChange = ({sheetName, sheetAOA}) => {
    setActiveSheetName(sheetName);
    setActiveSheetAOA(sheetAOA);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 숨겨진 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={onInputChange}
        disabled={isDropDisabled}
        className="hidden"
      />

      {/* 1. 파일 상태 패널 */}
      <FilePanel
        testCaseId={testCaseId}
        excelFileName={excelFileName}
        isReadOnly={isReadOnly || readOnly}
        hasMeta={!!workbook}
        onRefresh={loadExcelFromServer}
        onDownload={() =>
          downloadExcelFromServer(
            excelFileName || `${form?.code || testCaseId}.xlsx`
          )
        }
        onReset={
          !isReadOnly && workbook
            ? () => resetExcelSelection(fileInputRef)
            : undefined
        }
      />

      {/* 2. 에디터 패널 : card & excel 에디터 토글 */}
      <EditorPanel
        form={form}
        testCaseId={testCaseId}
        excelFileName={excelFileName}
        readOnly={readOnly}
        isReadOnlyState={isReadOnly}
        hasWorkbook={hasWorkbook}
        activeSheetAOA={activeSheetAOA}
        sheets={workbook?.sheets}
        meta={workbook}
        excelEditorRef={excelEditorRef}
        uploadSheets={uploadSheetsToServer}
        startFromTemplate={startWithTemplateWorkbook}
        dragOver={dragOver}
        isDropDisabled={isDropDisabled}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onPickUpload={() => fileInputRef.current?.click()}
        onActiveSheetChange={onActiveSheetChange}
      />
    </div>
  );
}