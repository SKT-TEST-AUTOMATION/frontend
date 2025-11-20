/* ===========================================================
   LeftColumnList.jsx — 왼쪽 고정 컬럼 리스트 (react-window)
   =========================================================== */

import React from "react";
import { FixedSizeList as List } from "react-window";
import { PlusIcon, TrashIcon, RowHelpButton } from "./helpers";

const ROW_HEIGHT = 44;

export default function LeftColumnList({
                                         height,
                                         rowCount,
                                         previewAOA,
                                         onInsertRow,
                                         onDeleteRow,
                                         readOnly,
                                         rowHelpGetter,   // getRowHelp(previewAOA, ri)
                                         scrollSyncRef,   // mainListRef to sync scrolling
                                       }) {
  // react-window row renderer
  const Row = ({ index, style }) => {
    const ri = index + 1;
    const help = rowHelpGetter(previewAOA, ri);

    return (
      <div
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          borderBottom: "1px solid rgba(226,232,240,0.6)",
          backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
        }}
        className="group"
      >
        {/* 행 번호 */}
        <span className="text-xs font-mono text-slate-400 w-6 text-center">{ri}</span>

        {/* + 버튼 */}
        {!readOnly && (
          <button
            onClick={() => onInsertRow?.(ri)}
            className="ml-1 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition
                       opacity-0 group-hover:opacity-100"
            title="행 추가"
            type="button"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        )}

        {/* - 버튼 */}
        {!readOnly && (
          <button
            onClick={() => onDeleteRow?.(ri)}
            className="ml-1 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition
                       opacity-0 group-hover:opacity-100"
            title="행 삭제"
            type="button"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 도움말 */}
        <div className="ml-2">
          <RowHelpButton help={help} />
        </div>
      </div>
    );
  };

  // scroll sync — LEFT always follows MAIN scrollTop
  const onScroll = (e) => {
    if (!scrollSyncRef.current) return;
    scrollSyncRef.current.scrollTo(e.scrollOffset);
  };

  return (
    <div className="shadow-lg border-r border-slate-200 bg-white">
      <List
        height={height}
        width={70}
        itemCount={rowCount}
        itemSize={ROW_HEIGHT}
        onScroll={onScroll}
      >
        {Row}
      </List>
    </div>
  );
}
