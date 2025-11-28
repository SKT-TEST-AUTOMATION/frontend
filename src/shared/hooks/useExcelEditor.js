// hooks/useExcelEditor.js
import { useRef, useCallback } from "react";

/**
 * useExcelEditor
 *
 * ExcelEditor 컴포넌트를 **외부에서 제어**하기 위한 커스텀 훅입니다.
 *
 * 사용 예시:
 * ------------------------------------------------------------------
 * const { ref, getSheets, setSheets, save, download } = useExcelEditor();
 *
 * return (
 *   <>
 *     <ExcelEditor ref={ref} />
 *     <button onClick={save}>저장</button>
 *   </>
 * );
 * ------------------------------------------------------------------
 *
 * ExcelEditor 쪽에서는 forwardRef + useImperativeHandle 로
 * 다음 메서드들을 제공해야 합니다.
 *
 * - getSheets(): 현재 모든 시트 데이터 반환
 * - setSheets(sheets): 모든 시트 데이터 교체
 * - save(): 저장 동작 트리거 (onSave prop 또는 파일 다운로드)
 * - download(fileName?): 강제 파일 다운로드(.xlsx)
 */
export function useExcelEditor() {
  /**
   * ref
   *
   * - <ExcelEditor ref={ref} /> 에 연결되는 ref 객체입니다.
   * - ExcelEditor가 forwardRef를 통해 내부 메서드들을 노출하면
   *   ref.current로 접근 가능해집니다.
   *
   *   예: ref.current.getSheets(), ref.current.save() 등
   */
  const ref = useRef(null);

  /**
   * getSheets
   *
   * - 현재 ExcelEditor 내부에 저장된 모든 시트 데이터를 가져옵니다.
   * - ExcelEditor에서 구현한 getSheets()를 호출합니다.
   * - ref.current가 아직 연결되지 않았다면 undefined를 반환합니다.
   */
  const getSheets = useCallback(() => {
    return ref.current?.getSheets();
  }, []);

  /**
   * setSheets
   *
   * - ExcelEditor 내부의 시트 데이터를 통째로 교체합니다.
   * - 인자로 넘긴 객체 형태는 대략 다음과 같습니다.
   *
   *   {
   *     "Sheet1": [["A1", "B1"], ["A2", "B2"]],
   *     "Sheet2": [["..."], ["..."]]
   *   }
   *
   * - ExcelEditor에서 구현한 setSheets(sheets)를 호출합니다.
   */
  const setSheets = useCallback((sheets) => {
    if (!ref.current) return;
    ref.current.setSheets(sheets);
  }, []);

  /**
   * save
   *
   * - ExcelEditor에 전달한 onSave prop이 있으면 그 콜백을 호출하고,
   *   없으면 내부에서 파일 다운로드(XLSX.writeFile)를 수행하도록
   *   ExcelEditor에 구현해 두었다고 가정합니다.
   *
   * - 단순히 "저장 버튼"에 연결하기 좋은 동작입니다.
   */
  const save = useCallback(() => {
    if (!ref.current) return;
    ref.current.save();
  }, []);

  /**
   * download
   *
   * - 현재 시트 데이터를 지정한 파일명으로 강제로 다운로드합니다.
   * - fileName을 생략하면 ExcelEditor 내부의 기본 파일명을 사용하게
   *   만들어 둘 수 있습니다.
   *
   *   예:
   *   download("my-report.xlsx");
   */
  const download = useCallback((fileName) => {
    if (!ref.current) return;
    ref.current.download(fileName);
  }, []);

  /**
   * 반환값
   *
   * - ref: ExcelEditor 컴포넌트에 연결할 ref 객체
   * - getSheets: 현재 데이터 읽기용 헬퍼 함수
   * - setSheets: 외부에서 데이터 주입/교체용 헬퍼 함수
   * - save: 저장 동작 트리거용 헬퍼 함수
   * - download: 강제 다운로드용 헬퍼 함수
   */
  return {
    ref,
    getSheets,
    setSheets,
    save,
    download,
  };
}
