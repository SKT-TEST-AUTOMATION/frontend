import { useRef, useState } from "react";
import { uploadScenarioExcel } from "../../../services/scenarioAPI";
import { useToast } from "../../../shared/hooks/useToast";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import { toErrorMessage } from "../../../services/axios";

/**
 * 시나리오 엑셀 업로드 패널
 *
 * props:
 *  - scenarioId: number (필수)
 *  - excelFileName?: string | null  // 현재 서버에 등록된 엑셀 파일명
 *  - onChange?: (newFileName: string | null) => void
 */
export default function ScenarioExcelUploadPanel({ scenarioId, excelFileName, onChange }) {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }

    // 간단한 클라이언트 측 확장자 체크 (서버에서도 반드시 검증 필요)
    const allowedExt = [".xlsx"];
    const lower = f.name.toLowerCase();
    const ok = allowedExt.some((ext) => lower.endsWith(ext));

    if (!ok) {
      showToast("warning", "xlsx 형식의 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      setFile(null);
      return;
    }

    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      showToast("warning", "업로드할 엑셀 파일을 먼저 선택하세요.");
      return;
    }
    if (!scenarioId) {
      showToast("warning", "시나리오가 아직 생성되지 않았습니다. 먼저 시나리오를 저장하세요.");
      return;
    }

    const ac = new AbortController();
    try {
      setUploading(true);
      const data = await uploadScenarioExcel(scenarioId, file, ac.signal);
      // 백엔드에서 업데이트된 시나리오를 반환한다고 가정 (excelFileName 포함)
      const newName = data?.excelFileName || file.name;
      onChange?.(newName);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      showToast("success", "시나리오 엑셀 파일이 업로드되었습니다.");
    } catch (e) {
      if (e?.code === REQUEST_CANCELED_CODE) return;
      showToast("error", toErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!scenarioId) return;
    if (!excelFileName) {
      showToast("info", "삭제할 시나리오 엑셀 파일이 없습니다.");
      return;
    }
    if (!window.confirm("등록된 시나리오 엑셀을 삭제하시겠습니까?\n삭제 후에는 테스트케이스 기반 시나리오가 수행됩니다.")) {
      return;
    }

    const ac = new AbortController();
    try {
      setRemoving(true);
      // await deleteScenarioExcel(scenarioId, ac.signal);
      onChange?.(null);
      showToast("success", "시나리오 엑셀 파일이 삭제되었습니다.");
    } catch (e) {
      if (e?.code === REQUEST_CANCELED_CODE) return;
      showToast("error", toErrorMessage(e));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            시나리오 엑셀 등록
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            시나리오에 별도의 엑셀 파일을 등록하면, 선택한 테스트케이스 및 각 테스트케이스 엑셀과 관계없이
            <span className="font-semibold"> 이 시나리오 엑셀만 실행</span>됩니다.
            (Config / Action 시트 구조를 기준으로 수행)
          </p>

          <div className="mt-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">현재 등록된 파일:</span>
              {excelFileName ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-200">
                  {excelFileName}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] text-slate-500">
                  없음
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm,.xls"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-600 dark:text-slate-200 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-100 dark:hover:file:bg-slate-700"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? "업로드 중..." : "엑셀 업로드"}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing || !excelFileName}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {removing ? "삭제 중..." : "등록 엑셀 삭제"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}