import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Upload,
  Save,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Sheet,
  HelpCircle,
  Trash2,
  Plus,
  Edit2,
} from "lucide-react";
import { readFile, saveFile } from "../../utils/excelUtils";
import { cn } from "../../utils/cn";
import { STEP_HEADERS } from "../../../features/testcase/constants/stepConstants.js";

const ExcelEditor = forwardRef(function ExcelEditor(
  {
    initialData,            // { sheetName: AOA } 또는 AOA
    className,
    title = "Excel Editor",
    subtitle = "Spreadsheet Component",
    defaultFileName = "workbook.xlsx",
    columnDescriptions = {},
    onSave,
    readOnly = true,
    uploadScope = "workbook",  // "sheet" / "workbook" (현재는 버튼 표시 정도에만 사용)
    sheetName,
    onActiveSheetChange
  },
  ref
) {
  const isReadOnly = !!readOnly;
  const fallbackSheetName = sheetName || "TestCase";

  // --- initialData 정규화 유틸 ---
  const parseInitialData = (raw) => {
    if (!raw) return null;

    // 1) 단일 시트 AOA
    if (Array.isArray(raw)) {
      return { [fallbackSheetName]: raw };
    }

    // 2) readFile() 래퍼 { sheets: {...}, sheetNames: [...] }
    if (
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      raw.sheets &&
      typeof raw.sheets === "object" &&
      !Array.isArray(raw.sheets)
    ) {
      return raw.sheets;
    }

    // 3) 이미 { sheetName: AOA } 형태라고 가정
    if (typeof raw === "object" && !Array.isArray(raw)) {
      return raw;
    }

    return null;
  };

  // --- 초기 워크북 상태 계산 ---
  const buildInitialSheets = () => {
    const parsed = parseInitialData(initialData);

    // 1) 데이터가 아예 없으면 → STEP_HEADERS + 빈 행 1개
    if (!parsed || Object.keys(parsed).length === 0) {
      const header = [...STEP_HEADERS];
      const emptyRow = new Array(header.length).fill("");
      return { [fallbackSheetName]: [header, emptyRow] };
    }

    // 2) 들어온 데이터는 "그대로" 사용 (헤더/내용 손대지 않기)
    return parsed;
  };

  const initialSheets = buildInitialSheets();
  const initialSheetNames = Object.keys(initialSheets);
  const initialActiveSheet =
    initialSheetNames.includes(fallbackSheetName) && fallbackSheetName
      ? fallbackSheetName
      : initialSheetNames[0] || fallbackSheetName;

  const [sheets, setSheets] = useState(initialSheets);
  const [sheetNames, setSheetNames] = useState(initialSheetNames);
  const [activeSheet, setActiveSheet] = useState(initialActiveSheet);

  useEffect(() => {
    const nextSheets = buildInitialSheets();
    const names = Object.keys(nextSheets);

    const nextActive =
      names.includes(activeSheet) && activeSheet
        ? activeSheet
        : names.includes(fallbackSheetName)
          ? fallbackSheetName
          : names[0] || fallbackSheetName;

    setSheets(nextSheets);
    setSheetNames(names);
    setActiveSheet(nextActive);
    setSelectedCell(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, fallbackSheetName]);

  const [fileName, setFileName] = useState(defaultFileName);
  const [selectedCell, setSelectedCell] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingSheetName, setEditingSheetName] = useState(null);

  // Derived state
  const data = sheets[activeSheet] || [[""]];
  const numRows = data.length;
  const numCols = data[0] ? data[0].length : 0;

  // initialData가 바뀌었을 때 워크북 재계산
  useEffect(() => {
    const nextSheets = buildInitialSheets();
    const names = Object.keys(nextSheets);

    const nextActive =
      names.includes(activeSheet) && activeSheet
        ? activeSheet
        : names.includes(fallbackSheetName)
          ? fallbackSheetName
          : names[0] || fallbackSheetName;

    setSheets(nextSheets);
    setSheetNames(names);
    setActiveSheet(nextActive);
    setSelectedCell(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, fallbackSheetName]);

  // 🔹 activeSheet / sheets가 정리된 후 상위로 한번 알려주기
  useEffect(() => {
    if (!onActiveSheetChange) return;
    if (!activeSheet) return;
    const aoa = sheets?.[activeSheet];
    if (!Array.isArray(aoa)) return;

    onActiveSheetChange({
      sheetName: activeSheet,
      sheetAOA: aoa,
    });
  }, [onActiveSheetChange, activeSheet, sheets]);


  // --- Helpers ---
  const handleSetData = (newData) => {
    if (isReadOnly) return;
    setSheets((prev) => ({
      ...prev,
      [activeSheet]: newData,
    }));
  };

  // --- Exposed Methods (Ref) ---
  useImperativeHandle(
    ref,
    () => ({
      getSheets: () => sheets,
      setSheets: (newSheets) => {
        // readOnly 라도 외부에서 강제로 세팅할 수는 있게 유지
        setSheets(newSheets);
        const newNames = Object.keys(newSheets);
        setSheetNames(newNames);
        if (newNames.length > 0 && !newNames.includes(activeSheet)) {
          setActiveSheet(newNames[0]);
        }
      },
      save: () => handleSave(),
      download: (name) => saveFile(sheets, name || fileName),
    }),
    [sheets, fileName, activeSheet, isReadOnly]
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.tagName === "INPUT" && editingSheetName) return;
      setContextMenu(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [editingSheetName]);


  const processFile = async (file) => {
    if (isReadOnly) return;
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      try {
        const result = await readFile(file); // { sheets, sheetNames }
        setSheets(result.sheets);
        setSheetNames(result.sheetNames);
        setActiveSheet(result.sheetNames[0]); // 첫 번째 시트로 보이기
        setFileName(file.name);
        setSelectedCell(null);
      } catch (err) {
        console.error("Error parsing Excel file", err);
        alert("Failed to parse Excel file.");
      }
    }
  };

  const handleSave = () => {
    if (isReadOnly) return;

    const workbookToSave = sheets;
    const sheetToSave = sheets[activeSheet];

    if (uploadScope === "sheet") {
      if (onSave) {
        onSave(sheetToSave, fileName); // ★ 워크북 전체 전달
      } else {
        saveFile(sheetToSave, fileName);
      }
    } else {
      if (onSave) {
        onSave(workbookToSave, fileName); // ★ 워크북 전체 전달
      } else {
        saveFile(workbookToSave, fileName);
      }
    }
  };

  // --- Data Manipulation ---

  const updateCell = (row, col, value) => {
    if (isReadOnly) return;
    const newData = [...data];
    if (!newData[row]) return;
    newData[row] = [...newData[row]];
    newData[row][col] = value;
    handleSetData(newData);
  };

  const addRow = () => {
    if (isReadOnly) return;
    const colCount = data[0].length;
    const newRow = new Array(colCount).fill("");
    handleSetData([...data, newRow]);
  };

  // --- Sheet Manipulation ---
  const addSheet = () => {
    if (isReadOnly) return;

    let newIndex = sheetNames.length + 1;
    let newName = `Sheet${newIndex}`;
    while (sheets[newName]) {
      newIndex++;
      newName = `Sheet${newIndex}`;
    }

    const headerRow = data[0]
      ? [...data[0]]
      : ["Header 1", "Header 2", "Header 3"];
    const newSheetData = [
      headerRow,
      ...Array(10)
        .fill(null)
        .map(() => new Array(headerRow.length).fill("")),
    ];

    setSheets((prev) => ({
      ...prev,
      [newName]: newSheetData,
    }));
    setSheetNames((prev) => [...prev, newName]);
    setActiveSheet(newName);
    setSelectedCell(null);
  };

  const deleteSheet = (targetSheetName) => {
    if (isReadOnly) return;

    const targetSheet = targetSheetName || contextMenu?.sheetName;
    if (!targetSheet) return;

    if (sheetNames.length <= 1) {
      alert("Cannot delete the last sheet.");
      setContextMenu(null);
      return;
    }

    if (!window.confirm(`"${targetSheet}" 시트를 삭제하시겠습니까?`)) {
      setContextMenu(null);
      return;
    }

    const newSheets = { ...sheets };
    delete newSheets[targetSheet];
    const newSheetNames = sheetNames.filter((name) => name !== targetSheet);

    setSheets(newSheets);
    setSheetNames(newSheetNames);

    if (activeSheet === targetSheet) {
      setActiveSheet(newSheetNames[0]);
      setSelectedCell(null);
    }

    setContextMenu(null);
  };

  const startRenamingSheet = () => {
    if (isReadOnly) return;
    if (!contextMenu || contextMenu.type !== "sheet" || !contextMenu.sheetName)
      return;
    setEditingSheetName(contextMenu.sheetName);
    setContextMenu(null);
  };

  const handleSheetRenameSubmit = (oldName, newName) => {
    if (isReadOnly) {
      setEditingSheetName(null);
      return;
    }

    const trimmed = newName.trim();

    if (!trimmed || trimmed === oldName) {
      setEditingSheetName(null);
      return;
    }

    if (sheetNames.includes(trimmed)) {
      alert(`"${trimmed}" 이름의 시트가 이미 존재합니다.`);
      return;
    }

    const newSheets = { ...sheets };
    newSheets[trimmed] = newSheets[oldName];
    delete newSheets[oldName];
    setSheets(newSheets);

    setSheetNames((prev) => prev.map((n) => (n === oldName ? trimmed : n)));

    if (activeSheet === oldName) {
      setActiveSheet(trimmed);
    }

    setEditingSheetName(null);
  };

  // --- Context Menu Position Helpers ---
  const getContextMenuPosition = (clientX, clientY) => {
    const MENU_WIDTH = 256;
    const MENU_HEIGHT = 200;
    const MARGIN = 8;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = clientX + 4;
    let y = clientY + 4;

    if (x + MENU_WIDTH + MARGIN > vw) {
      x = vw - MENU_WIDTH - MARGIN;
    }
    if (x < MARGIN) x = MARGIN;

    if (y + MENU_HEIGHT + MARGIN > vh) {
      y = vh - MENU_HEIGHT - MARGIN;
    }
    if (y < MARGIN) y = MARGIN;

    return { x, y };
  };

  const getSheetContextMenuPosition = (clientX, clientY) => {
    const MENU_WIDTH = 256;
    const MARGIN = 8;
    const vw = window.innerWidth;

    let x = clientX + 4;
    let y = clientY;

    if (x + MENU_WIDTH + MARGIN > vw) {
      x = vw - MENU_WIDTH - MARGIN;
    }
    if (x < MARGIN) x = MARGIN;
    if (y < MARGIN) y = MARGIN;

    return { x, y };
  };

  // --- Context Menu Handlers ---

  const handleRowContextMenu = (e, rowIndex) => {
    e.preventDefault();
    if (rowIndex === 0) return;
    if (isReadOnly) return;

    const pos = getContextMenuPosition(e.clientX, e.clientY);
    setContextMenu({
      ...pos,
      type: "row",
      index: rowIndex,
    });
  };

  const handleColumnContextMenu = (e, colIndex) => {
    e.preventDefault();
    if (isReadOnly) return;

    const pos = getContextMenuPosition(e.clientX, e.clientY);
    setContextMenu({
      ...pos,
      type: "col",
      index: colIndex,
    });
  };

  const handleSheetContextMenu = (e, name) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnly) return;

    const pos = getSheetContextMenuPosition(e.clientX, e.clientY);
    setContextMenu({
      ...pos,
      type: "sheet",
      sheetName: name,
    });
  };

  // --- Row/Col Ops ---

  const insertRowAbove = () => {
    if (isReadOnly) return;
    if (!contextMenu || contextMenu.type !== "row" || contextMenu.index == null)
      return;
    const newData = [...data];
    const newRow = new Array(data[0].length).fill("");
    newData.splice(contextMenu.index, 0, newRow);
    handleSetData(newData);
    setContextMenu(null);
  };

  const insertRowBelow = () => {
    if (isReadOnly) return;
    if (!contextMenu || contextMenu.type !== "row" || contextMenu.index == null)
      return;
    const newData = [...data];
    const newRow = new Array(data[0].length).fill("");
    newData.splice(contextMenu.index + 1, 0, newRow);
    handleSetData(newData);
    setContextMenu(null);
  };

  const deleteContextRow = () => {
    if (isReadOnly) return;
    if (!contextMenu || contextMenu.type !== "row" || contextMenu.index == null)
      return;
    if (contextMenu.index === 0) return;
    if (data.length <= 1) return;
    const newData = data.filter((_, idx) => idx !== contextMenu.index);
    handleSetData(newData);
    setContextMenu(null);
  };

  const insertColumnLeft = () => {
    if (isReadOnly) return;
    if (!contextMenu || contextMenu.type !== "col" || contextMenu.index == null)
      return;
    const newData = data.map((row) => {
      const newRow = [...row];
      newRow.splice(contextMenu.index, 0, "");
      return newRow;
    });
    handleSetData(newData);
    setContextMenu(null);
  };

  const insertColumnRight = () => {
    if (isReadOnly) return;
    if (!contextMenu || contextMenu.type !== "col" || contextMenu.index == null)
      return;
    const newData = data.map((row) => {
      const newRow = [...row];
      newRow.splice(contextMenu.index, 0, "");
      return newRow;
    });
    handleSetData(newData);
    setContextMenu(null);
  };

  const deleteContextColumn = () => {
    if (isReadOnly) return;
    if (!contextMenu || contextMenu.type !== "col" || contextMenu.index == null)
      return;
    if (data[0].length <= 1) return;
    const newData = data.map((row) =>
      row.filter((_, idx) => idx !== contextMenu.index)
    );
    handleSetData(newData);
    setContextMenu(null);
  };

  // --- Helpers ---
  const getHeaderName = (colIndex) => {
    return String(data[0]?.[colIndex] || "").trim();
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full min-h-0 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden relative",
        className
      )}
    >
      {/* --- Toolbar --- */}
      <div className="flex flex-wrap items-center justify-between p-3 border-b border-gray-200 bg-gray-50 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <div>
              <p
                className="text-sm font-semibold text-gray-700 max-w-xl truncate"
                title={fileName}
              >
                {fileName}
              </p>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-800">
                  {activeSheet}
                </span>
                {/*<span className="text-[10px] text-gray-500">{subtitle}</span>*/}
              </div>
            </div>
          </div>
          <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>

          {/* 필요 시 파일 업로드 복원 가능 */}
          {/*<input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
            className="hidden"
            disabled={isReadOnly}
          />*/}
        </div>
        {!isReadOnly && uploadScope === "sheet" && (
          <button
            onClick={handleSave}
            disabled={isReadOnly}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded shadow-sm",
              isReadOnly
                ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-blue-600 text-white border-transparent hover:bg-blue-700 transition-colors"
            )}
          >
            <Save size={16} /> 시트 업로드
          </button>
        )}
      </div>

      {/* --- Grid --- */}
      <div className="flex-1 overflow-auto relative bg-gray-100">
        <table className="border-collapse table-fixed bg-white min-w-max">
          {/* HEADER ROW (Data Row 0) */}
          <thead className="sticky top-0 z-[4] shadow-sm">
          <tr>
            <th className="w-12 h-10 sticky left-0 z-[5] bg-gray-100 border-r border-b border-gray-300 text-[10px] text-gray-400 font-normal p-1 text-center">
              Header
            </th>

            {data[0]?.map((cellValue, colIndex) => {
              const headerName = String(cellValue || "");
              const hasDescription = !!columnDescriptions[headerName];

              return (
                <th
                  key={`header-${colIndex}`}
                  className={cn(
                    "w-40 h-10 border-r border-b border-gray-300 p-0 select-none transition-colors relative group",
                    "cursor-[context-menu]",
                    selectedCell?.row === 0 &&
                    selectedCell?.col === colIndex
                      ? "bg-blue-50"
                      : "bg-gray-50"
                  )}
                  onContextMenu={(e) => handleColumnContextMenu(e, colIndex)}
                >
                  <div className="relative w-full h-full flex items-center">
                    <input
                      type="text"
                      value={headerName}
                      readOnly={isReadOnly}
                      onChange={
                        isReadOnly
                          ? undefined
                          : (e) => updateCell(0, colIndex, e.target.value)
                      }
                      className={cn(
                        "w-full h-full px-2 py-1 bg-transparent text-sm font-bold text-gray-700 text-center outline-none placeholder-gray-300",
                        isReadOnly ? "cursor-default" : "focus:bg-white"
                      )}
                      placeholder="Column Name"
                    />
                    {hasDescription && (
                      <div className="absolute right-1 top-1 text-blue-400 opacity-50 group-hover:opacity-100 pointer-events-none">
                        <HelpCircle size={10} />
                      </div>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
          </thead>

          {/* BODY ROWS (Data Rows 1+) */}
          <tbody>
          {data.map((row, rowIndex) => {
            if (rowIndex === 0) return null;

            return (
              <tr key={`row-${rowIndex}`}>
                <td
                  className={cn(
                    "sticky left-0 z-[3] w-12 border-r border-b border-gray-300 text-center text-xs text-gray-500 select-none font-semibold cursor-[context-menu] hover:bg-gray-200 transition-colors bg-gray-50",
                    selectedCell?.row === rowIndex
                      ? "bg-blue-100 text-blue-700"
                      : ""
                  )}
                  onContextMenu={(e) => handleRowContextMenu(e, rowIndex)}
                >
                  {rowIndex}
                </td>

                {row.map((cellValue, colIndex) => {
                  const isSelected =
                    selectedCell?.row === rowIndex &&
                    selectedCell?.col === colIndex;
                  return (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      className={cn(
                        "border-r border-b border-gray-200 p-0 relative min-w-[8rem]",
                        isSelected
                          ? "z-[2] outline outline-2 outline-blue-500"
                          : ""
                      )}
                      onClick={() =>
                        setSelectedCell({ row: rowIndex, col: colIndex })
                      }
                    >
                      <input
                        type="text"
                        value={cellValue ?? ""}
                        readOnly={isReadOnly}
                        onChange={
                          isReadOnly
                            ? undefined
                            : (e) =>
                              updateCell(
                                rowIndex,
                                colIndex,
                                e.target.value
                              )
                        }
                        className={cn(
                          "w-full h-full px-2 py-1 outline-none text-sm bg-transparent",
                          isReadOnly
                            ? "cursor-default"
                            : "focus:bg-white"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
          </tbody>
        </table>

        {numRows <= 1 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <p>No rows added.</p>
            <button
              onClick={addRow}
              disabled={isReadOnly}
              className={cn(
                "mt-2 text-sm",
                isReadOnly
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-blue-600 hover:underline"
              )}
            >
              Add First Row
            </button>
          </div>
        )}
      </div>

      {/* --- Sheet Tabs --- */}
      <div className="bg-gray-200 border-t border-gray-300 flex items-center px-2 h-10 overflow-hidden shrink-0">
        <div
          className="flex items-end h-full gap-0.5 overflow-x-auto no-scrollbar pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {sheetNames.map((name) => {
            const isActive = activeSheet === name;
            const isRenaming = editingSheetName === name && !isReadOnly;

            return (
              <div
                key={name}
                onContextMenu={(e) => handleSheetContextMenu(e, name)}
                onDoubleClick={() => !isReadOnly && setEditingSheetName(name)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 text-xs transition-all select-none min-w-[100px] max-w-[250px] rounded-t-lg relative top-[1px] border border-b-0 cursor-pointer",
                  isActive
                    ? "bg-white text-blue-700 font-bold border-gray-300 border-t-2 border-t-blue-600 shadow-sm z-1 min-w-[150px]"
                    : "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-700",
                  isReadOnly && "cursor-default"
                )}
                onClick={() => {
                  if (!isRenaming) {
                    const nextSheet = name;
                    const nextAOA = sheets?.[name];

                    if (onActiveSheetChange && nextSheet && Array.isArray(nextAOA)) {
                      onActiveSheetChange({sheetName: name, sheetAOA: sheets?.[name]});
                    }

                    setActiveSheet(nextSheet);
                    setSelectedCell(null);
                  }
                }}
              >
                <Sheet
                  size={14}
                  className={isActive ? "text-blue-600" : "text-gray-400"}
                />

                {isRenaming ? (
                  <input
                    autoFocus
                    defaultValue={name}
                    onBlur={(e) =>
                      handleSheetRenameSubmit(name, e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleSheetRenameSubmit(name, e.currentTarget.value);
                      if (e.key === "Escape") setEditingSheetName(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-white border border-blue-300 rounded px-1 text-xs outline-none text-blue-800"
                  />
                ) : (
                  <span className="truncate">{name}</span>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={addSheet}
          disabled={true}
          className={cn(
            "ml-2 p-1.5 rounded-full transition-colors flex-shrink-0",
            isReadOnly
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
          )}
          title="Add New Sheet"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* --- Context Menu --- */}
      {contextMenu && (
        <div
          className="fixed z-[6] bg-white border border-gray-200 rounded-md shadow-lg w-64 overflow-hidden"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            transform:
              contextMenu.type === "sheet" ? "translateY(-100%)" : "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Column Description Header */}
          {contextMenu.type === "col" &&
            contextMenu.index !== undefined &&
            columnDescriptions[getHeaderName(contextMenu.index)] && (
              <div className="bg-blue-50 p-3 border-b border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle size={14} className="text-blue-600" />
                  <span className="font-bold text-xs text-blue-800">
                    {getHeaderName(contextMenu.index)}
                  </span>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  {columnDescriptions[getHeaderName(contextMenu.index)]}
                </p>
              </div>
            )}

          {/* Sheet Menu Header */}
          {contextMenu.type === "sheet" && contextMenu.sheetName && (
            <div className="bg-gray-50 p-2 border-b border-gray-200">
              <span className="font-bold text-xs text-gray-600 px-2">
                {contextMenu.sheetName}
              </span>
            </div>
          )}

          <div className="py-1">
            {contextMenu.type === "row" && !isReadOnly ? (
              <>
                <button
                  onClick={insertRowAbove}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <ArrowUp size={14} /> Insert Row Above
                </button>
                <button
                  onClick={insertRowBelow}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <ArrowDown size={14} /> Insert Row Below
                </button>
                <div className="my-1 border-t border-gray-100"></div>
                <button
                  onClick={deleteContextRow}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  disabled={numRows <= 1}
                >
                  <Trash2 size={14} /> Delete Row
                </button>
              </>
            ) : contextMenu.type === "col" && !isReadOnly ? (
              <>
                <button
                  onClick={insertColumnLeft}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <ArrowLeft size={14} /> Insert Column Left
                </button>
                <button
                  onClick={insertColumnRight}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <ArrowRight size={14} /> Insert Column Right
                </button>
                <div className="my-1 border-t border-gray-100"></div>
                <button
                  onClick={deleteContextColumn}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  disabled={numCols <= 1}
                >
                  <Trash2 size={14} /> Delete Column
                </button>
              </>
            ) : contextMenu.type === "sheet" && !isReadOnly ? (
              <>
                <button
                  onClick={startRenamingSheet}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Edit2 size={14} /> Rename Sheet
                </button>
                <div className="my-1 border-t border-gray-100"></div>
                <button
                  onClick={() => deleteSheet(contextMenu.sheetName)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  disabled={sheetNames.length <= 1}
                >
                  <Trash2 size={14} /> Delete Sheet
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
});

ExcelEditor.displayName = "ExcelEditor";

export default ExcelEditor;