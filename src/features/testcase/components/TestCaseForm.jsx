import React, { useState } from "react";
import TestCaseExcelTab from "./TestCaseExcelTab";
import TestCaseInfoTab from "./TestCaseInfoTab";
import TestCaseStepTab from './TestCaseStepTab.jsx';

/**
 * 공용 폼
 * props:
 *  - form, set(patch)
 *  - procedureSteps, setProcedureSteps
 *  - expectedSteps, setExpectedSteps
 *  - readOnly
 *  - headerTabs
 *  - footerActions
 *  - enterAddsStep : StepsEditor에서 Enter로 단계 추가 기능 on/off
 *  - defaultTab : 기본 탭 ('info' | 'excel') 기본값 'info'
 *  - ExcelTabComponent : '단계' 탭에 렌더링할 컴포넌트 (예: TestCaseExcelTab)
 *  - activeTab : (optional) 외부 제어 탭 상태
 *  - setActiveTab : (optional) 외부 탭 변경 함수
 *  - testCaseId : (optional) 생성된 테스트케이스 id
 *  - excelFileName: (optional) 서버에 저장된 엑셀 파일명
 */
export default function TestCaseForm({
  form, set,
  procedureSteps, setProcedureSteps,
  expectedSteps, setExpectedSteps,
  readOnly = false,
  headerTabs = true,
  footerActions = null,
  enterAddsStep = true,
  defaultTab = "info",
  activeTab: controlledTab,
  setActiveTab: setControlledTab,
  testCaseId,
  excelFileName
}) {

  const inputCls = [
    "w-full px-3 py-2 rounded-md text-sm",
    readOnly
      ? "bg-gray-100 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400"
      : "bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-700 text-gray-800 dark:text-gray-100",
  ].join(" ");

  // 탭 상태 (controlled/uncontrolled)
  const [innerTab, setInnerTab] = useState(defaultTab);
  const tab = controlledTab ?? innerTab;
  const setTab = setControlledTab ?? setInnerTab;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {headerTabs && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              type="button"
              onClick={() => setTab("info")}
              className={[
                "px-6 py-3 text-sm font-medium -mb-px border-b-2 transition-colors",
                tab === "info"
                  ? "font-bold border-blue-600 text-blue-600"
                  : "font-medium border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              ].join(" ")}
            >
              기본정보
            </button>
            <button
              type="button"
              onClick={() => testCaseId && setTab("excel")}
              title={testCaseId ? undefined : "기본정보 저장 후 사용 가능"}
              disabled={!testCaseId}
              className={[
                "px-6 py-3 text-sm font-medium -mb-px border-b-2 transition-colors",
                tab === "excel"
                  ? "font-bold border-blue-600 text-blue-600"
                  : "font-medium border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                !testCaseId ? "opacity-60 cursor-not-allowed" : ""
              ].join(" ")}
            >
              단계
            </button>
          </div>
        </div>
      )}

      {/* 탭 콘텐츠 */}
      {tab === "info" ? (
        <TestCaseInfoTab
          form={form}
          set={set}
          procedureSteps={procedureSteps}
          setProcedureSteps={setProcedureSteps}
          expectedSteps={expectedSteps}
          setExpectedSteps={setExpectedSteps}
          readOnly={readOnly}
          enterAddsStep={enterAddsStep}
          footerActions={footerActions}
        />
      ) : (
        <div className="p-6">
          {/*<TestCaseExcelTab form={form} testCaseId={testCaseId} excelFileName={excelFileName ?? form?.excelFileName} readOnly={readOnly} />*/}
          <TestCaseStepTab form={form} testCaseId={testCaseId} excelFileName={excelFileName ?? form?.excelFileName} readOnly={readOnly} />
        </div>
      )}
    </div>
  );
}
