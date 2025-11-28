import { buildInitialSheetAOA, buildXlsxFromAOA, readExcelFile } from '../../../shared/utils/excelUtils.js';
import { useToast } from '../../../shared/hooks/useToast.js';
import { useCallback, useMemo, useState } from 'react';
import { REQUEST_CANCELED_CODE } from '../../../constants/errors.js';
import { toErrorMessage } from '../../../services/axios.js';
import { downloadFile } from '../../../shared/utils/fileUtils.js';
import { uploadTestcaseExcel } from '../../../services/testcaseAPI.js';

const DEFAULT_HEADERS = [
  "no", "name", "mandatory", "skip_on_error", "sleep", "action", "input_text", "by", "value", "memo"
];

// 시트 이름 검증
function sanitizeSheetName(raw) {
  const name = String(raw ?? "").trim();
  const invalid = /[\\/*?:\[\]]/g;
  const cleaned = name.replace(invalid, " ").slice(0, 31).trim();
  return cleaned || "새 시트";
}

// template으로 시작할 경우 meta 파일 생성
function makeTemplateMeta(sheetName = "새 시트") {
  const header = DEFAULT_HEADERS.slice();
  const name = sanitizeSheetName(sheetName);
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
export function useExcelTab({ testCaseId, excelFileName, navigate}) {
  const { showToast } = useToast();

  // 현재 선택되어 불러온 excel 파일
  const [file, setFile] = useState(null);
  // excel 파일을 read해서 정제한 결과
  const [meta, setMeta] = useState(null); // { sheets, previewBySheet, headerBySheet, sourceFile }
  // 전체 시트 캐시
  const [aoaBySheet, setAoaBySheet] = useState({});
  // 현재 선택한 시트 이름
  const [selectedSheet, setSelectedSheet] = useState("");
  // 현재 선택한 시트의 AOA
  const [sheetAOA, setSheetAOA] = useState([]);
  // uploading 여부 확인
  const [uploading, setUploading] = useState(false);

  // 시트가 있는 엑셀 선택 시, 최초 선택 시트를 고르는 헬퍼
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
  const loadServerExcel = async (testCaseId) => {
    if (!testCaseId) return;

    try {
      const res = await fetch(`/api/v1/testcases/${encodeURIComponent(testCaseId)}/excel`, { method: "GET" });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);

      const blob = await res.blob();
      const name = excelFileName || `${testCaseId}.xlsx`;
      const fileObj = new File([blob], name, { type: blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      setFile(fileObj);
      const metaData = await readExcelFile(fileObj);
      setMeta(metaData);
      const initialSheet = pickInitialSheet(metaData);
      setSelectedSheet(initialSheet);
      setSheetAOA((metaData.previewBySheet || {})[initialSheet] || []);
      showToast("success", "불러오기 완료");
    } catch (err) {
      if (err?.code === REQUEST_CANCELED_CODE) return;
      showToast("error", toErrorMessage(err));
    }
  };

  // 서버 저장본 다운로드
  const downloadServerExcel = async () => {
    if (!testCaseId) return;
    try {
      const name = (excelFileName && String(excelFileName).trim()) || `${testCaseId}.xlsx`;
      await downloadFile(`/api/v1/testcases/${encodeURIComponent(testCaseId)}/excel`, name);
    } catch (err) {
      showToast({type: "error", message: "다운로드 실패", detailMessage: err});
    }
  }

  // 선택한 파일 업로드
  const loadPickedFile = useCallback(async (fileObj) => {
    const validationErrorMessage = (fileObj) => {
      if (!fileObj) return "파일을 선택해주세요.";
      const nameCheck = /\.(xlsx)$/i.test(fileObj.name);
      if (!nameCheck) return "xlsx 파일만 업로드 가능합니다.";
      const maxFileSize = 10 * 1024 * 1024;
      if (fileObj.size > maxFileSize) return "파일 크기가 10MB를 초과합니다.";
      return null;
    }

    const errorMessage = validationErrorMessage(fileObj);
    if (errorMessage) {
      showToast({type: "error", message: errorMessage });
      return false;
    }

    try {
      setFile(fileObj);
      const metaData = await readExcelFile(fileObj);
      setMeta(metaData);
      const initialSheet = pickInitialSheet(metaData);
      setSelectedSheet(initialSheet);
      setSheetAOA((metaData.previewBySheet || {})[initialSheet] || []);
      return true;
    } catch (err) {
      showToast({type: "error", message: "엑셀 파일 불러오기 실패", detailMessage: err});
      return false;
    }
  }, []);

  // 템플릿으로 시작
  const startFromTemplate = useCallback( (openEditor) => {
    const metaData = makeTemplateMeta();
    const sheetName = metaData.sheets[0].name;
    setFile(null);
    setMeta(metaData);
    setSelectedSheet(sheetName);
    setSheetAOA(metaData.previewBySheet[sheetName]);
    setAoaBySheet({ [sheetName]: metaData.previewBySheet[sheetName] });
    openEditor();
  }, [] );

  // 선택 시트 업로드
  const uploadSheet = useCallback( async (sheetAOA, selectedSheet, testCaseCode, testCaseId, setEditorOpen) => {
    if (uploading || !selectedSheet || sheetAOA.length === 0) return;

    setUploading(true);

    try {
      const aoaToSave = Array.isArray(sheetAOA) ? sheetAOA : [sheetAOA];

      setAoaBySheet((prev) => ({
        ...prev,
        [selectedSheet]: {aoaToSave: aoaToSave},
      }));

      // AOA를 Blob으로 변환
      const blob = buildXlsxFromAOA(selectedSheet, aoaToSave);
      const filename = `${testCaseCode}-${selectedSheet}.xlsx`;

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


  const headers = useMemo(() => (sheetAOA?.[0] || []).map((item) => String(item ?? "")), [sheetAOA]);
  const dataRows = useMemo(() => sheetAOA?.slice(1) || [], [sheetAOA]);

  const existSheetNames = useMemo(() => {
    if (!meta) return [];
    const sheets = meta.sheets || [];
    const preview = meta.previewBySheet || {}; // aoaBySheet
    const result = [];
    const seen = new Set();
    for (const name of sheets) {
      if (!name || seen.has(name)) continue;
      const aoa = preview[name];
      if (Array.isArray(aoa) && aoa.length > 0) {
        result.push(name);
        seen.add(aoa);
      }
    }
    return result;
  }, [meta]);

  const chooseSheet = useCallback( (sheetName) => {
    console.log("선택한 시트 이름 : "+sheetName);
    setSelectedSheet(sheetName);
    setSheetAOA((meta.previewBySheet || {})[sheetName] || []);
  }, []);

  const resetFile = useCallback((fileInputRef) => {
    setFile(null);
    setMeta(null);
    setSelectedSheet("");
    setSheetAOA([]);
    setAoaBySheet({});
    if (fileInputRef?.current) fileInputRef.current.value = "";
  }, [setFile]);

  // AOA 업데이트 유틸
  const updateCell = useCallback((rowIdx, colIdx, value) => {
    setSheetAOA((prev) => {
      if (!Array.isArray(prev) || !prev[rowIdx]) return prev;
      const nextRow = prev[rowIdx].map((cell, index) => (index === colIdx ? value : cell));
      const next = prev.map((row, index) => (index === rowIdx ? nextRow : row));
      return next;
    });
  }, []);

  const insertRowBelow = useCallback((rowIdx) => {
    setSheetAOA((prev) => {
      if (!Array.isArray(prev)) return prev;
      const colCount = Math.max((prev[rowIdx]?.length || 0), (prev[0]?.length || 0));
      const empty = Array.from({ length: colCount }, () => "");
      const next = prev.slice();
      next.splice(rowIdx + 1, 0, empty);
      return next;
    });
  }, []);

  const deleteRowAt = useCallback((rowIdx) => {
    setSheetAOA((prev) => {
      if (!Array.isArray(prev) || prev.length <= 1) return prev;
      const next = prev.slice();
      next.splice(rowIdx, 1);
      return next;
    });
  }, []);

  return {
    // 상태
    file, meta, selectedSheet, sheetAOA, uploading, aoaBySheet,
    // 파생 상태
    headers, dataRows, existSheetNames,
    // 세터
    setFile, setMeta, setAoaBySheet, setSelectedSheet, setSheetAOA, setUploading,
    // 액션
    loadServerExcel, downloadServerExcel,
    loadPickedFile,
    startFromTemplate,
    uploadSheet, chooseSheet,
    resetFile,
    updateCell, insertRowBelow,deleteRowAt
  }
}
