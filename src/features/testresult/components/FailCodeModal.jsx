import React, { useEffect, useState } from "react";
import { getTestFailCodes } from "../../../services/metaAPI";
import { toErrorMessage } from "../../../services/axios";

export default function FailCodeModal({
                                        open,
                                        onClose,
                                        onSave,
                                        currentFailCode,
                                        targetInfo,
                                      }) {
  const [selectedCode, setSelectedCode] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [failCodes, setFailCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [loadError, setLoadError] = useState("");

  // 모달 열릴 때마다 현재 코드 + 코드 목록 로딩
  useEffect(() => {
    if (!open) return;

    setSelectedCode(currentFailCode);
    setLoadError("");
    setLoadingCodes(true);

    getTestFailCodes()
      .then((list) => {
        setFailCodes(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        console.error("Failed to load test fail codes", e);
        setLoadError(
          toErrorMessage
            ? toErrorMessage(e)
            : "코드 목록을 불러오는 중 오류가 발생했습니다."
        );
      })
      .finally(() => {
        setLoadingCodes(false);
      });
  }, [open, currentFailCode]);

  const handleSave = async () => {
    if (!selectedCode) return;
    setIsSaving(true);
    try {
      await onSave(selectedCode);
      onClose();
    } catch (e) {
      console.error("Failed to update fail code", e);
      // TODO: Toast 등으로 사용자 알림 연동
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const selectedMeta =
    failCodes.find((c) => c.code === selectedCode) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              실패 원인 분석 (Fail Code)
            </h3>
            {targetInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {targetInfo.caseCode}
                </span>{" "}
                {targetInfo.caseName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-6">
          <div className="grid gap-6">
            {/* 현재 선택된 코드 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wider">
                현재 선택된 코드
              </span>

              <div className="mt-2 flex items-center gap-3">
                {selectedCode ? (
                  <>
                    {/* 코드 (F01 / D01 ...) */}
                    <span className="inline-flex items-center justify-center h-8 px-3 rounded bg-blue-600 text-white text-sm font-bold shadow-sm">
                      {selectedCode}
                    </span>
                    <div className="flex flex-col">
                      {/* 한글명 */}
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {selectedMeta?.name ?? "알 수 없는 코드"}
                      </span>
                      {/* detailCode (F01_FLOW_POPUP ...) */}
                      {selectedMeta?.detailCode && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                          {selectedMeta.detailCode}
                        </span>
                      )}
                      {/* 설명 */}
                      {selectedMeta?.description && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {selectedMeta.description}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                    지정된 실패 코드가 없습니다. 아래 목록에서 선택해주세요.
                  </span>
                )}
              </div>
            </div>

            {/* 코드 목록 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              {loadingCodes && (
                <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  코드 목록을 불러오는 중입니다…
                </div>
              )}

              {loadError && (
                <div className="px-4 py-3 text-xs text-rose-600 dark:text-rose-300 border-b border-rose-200 dark:border-rose-700">
                  {loadError}
                </div>
              )}

              {!loadingCodes && !loadError && (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-750 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-20 text-center border-b border-gray-200 dark:border-gray-700">
                      코드
                    </th>
                    <th className="px-4 py-3 w-56 border-b border-gray-200 dark:border-gray-700">
                      이름 / 상세 코드
                    </th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      설명
                    </th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {failCodes.map((failDef) => {
                    const isActive = selectedCode === failDef.code;
                    return (
                      <tr
                        key={failDef.code}
                        onClick={() => setSelectedCode(failDef.code)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isActive
                            ? "bg-blue-50/80 dark:bg-blue-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        }`}
                      >
                        {/* 코드 (F01 / D01 ...) */}
                        <td className="px-4 py-3 text-center align-top">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                isActive
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                              }`}
                            >
                              {failDef.code}
                            </span>
                        </td>

                        {/* 이름 + detailCode */}
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-0.5">
                              <span
                                className={`font-semibold ${
                                  isActive
                                    ? "text-blue-700 dark:text-blue-300"
                                    : "text-gray-800 dark:text-gray-200"
                                }`}
                              >
                                {failDef.name}
                              </span>
                            {failDef.detailCode && (
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                                  {failDef.detailCode}
                                </span>
                            )}
                          </div>
                        </td>

                        {/* 설명 */}
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 leading-relaxed align-top">
                          {failDef.description}
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 dark:focus:ring-gray-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={
              isSaving ||
              !selectedCode ||
              selectedCode === currentFailCode
            }
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors ${
              isSaving ||
              !selectedCode ||
              selectedCode === currentFailCode
                ? "bg-blue-400 cursor-not-allowed opacity-70"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSaving ? "저장 중..." : "변경 내용 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}