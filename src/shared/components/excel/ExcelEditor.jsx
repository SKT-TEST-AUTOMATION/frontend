// ExcelEditor.jsx
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
  FileSpreadsheet,
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

const ExcelEditor = forwardRef(function ExcelEditor(
  {
    initialData,
    className,
    title = "Excel Editor",
    subtitle = "Spreadsheet Component",
    defaultFileName = "workbook.xlsx",
    columnDescriptions = {},
    onSave,
    readOnly = true,
    uploadScope = "workbook",
  },
  ref
) {
  const isReadOnly = !!readOnly;

  // --- State ---
  const [sheets, setSheets] = useState(() => {
    if (initialData) {
      return { Sheet1: initialData };
    }
    const genericData = [
      ["Header 1", "Header 2", "Header 3"],
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ];
    return { Sheet1: genericData };
  });

  const [sheetNames, setSheetNames] = useState(["Sheet1"]);
  const [activeSheet, setActiveSheet] = useState("Sheet1");
  const [fileName, setFileName] = useState(defaultFileName);
  const [selectedCell, setSelectedCell] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  // Sheet Renaming State
  const [editingSheetName, setEditingSheetName] = useState(null);

  const fileInputRef = useRef(null);

  // Derived state
  const data = sheets[activeSheet] || [[""]];
  const numRows = data.length;
  const numCols = data[0] ? data[0].length : 0;

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

  // --- File Handlers ---

  const handleFileUpload = async (e) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const processFile = async (file) => {
    if (isReadOnly) return;
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      try {
        const result = await readFile(file);
        setSheets(result.sheets);
        setSheetNames(result.sheetNames);
        setActiveSheet(result.sheetNames[0]);
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

    // 1) 현재 시트 데이터만 뽑기
    const currentSheetData = sheets[activeSheet] || [[""]];

    // 2) ExcelUtils의 형식을 맞추기 위해, 시트 이름을 key 로 가진 객체 생성
    const singleSheet = {
      [activeSheet]: currentSheetData,
    };

    if (onSave) {
      onSave(singleSheet, fileName);
    } else {
      saveFile(singleSheet, fileName);
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

    if (!window.confirm(`Are you sure you want to delete "${targetSheet}"?`)) {
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
      alert(`A sheet with the name "${trimmed}" already exists.`);
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
    // readOnly 에서도 “설명” 같은 걸 보여줄 생각이면 열어도 되지만,
    // 여기서는 아예 메뉴를 안 띄우도록 처리
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
        "flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden relative",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (isReadOnly) return;
        setIsDragging(true);
      }}
      onDragLeave={() => {
        if (isReadOnly) return;
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      onClick={() => {
        if (editingSheetName) setEditingSheetName(null);
      }}
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

          {/* 파일 업로드는 현재 주석 처리 상태이지만, 사용할 경우 readOnly 체크 */}
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
          )
        }
      </div>

      {/* --- Overlay --- */}
      {isDragging && !isReadOnly && (
        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm z-5 flex flex-col items-center justify-center border-4 border-blue-500 border-dashed rounded-lg m-2 pointer-events-none">
          <Upload size={48} className="text-blue-600 mb-2" />
          <p className="text-xl font-bold text-blue-700">
            Drop Excel File Here
          </p>
        </div>
      )}

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
                        isReadOnly
                          ? "cursor-default"
                          : "focus:bg-white"
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
                  "flex items-center gap-2 px-4 py-1.5 text-sm transition-all select-none min-w-[100px] max-w-[200px] rounded-t-lg relative top-[1px] border border-b-0 cursor-pointer",
                  isActive
                    ? "bg-white text-blue-700 font-bold border-gray-300 border-t-2 border-t-blue-600 shadow-sm z-1"
                    : "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-700",
                  isReadOnly && "cursor-default"
                )}
                onClick={() => {
                  if (!isRenaming) {
                    setActiveSheet(name);
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
