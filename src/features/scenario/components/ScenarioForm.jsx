import React, { useMemo, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}


function FieldCard({ label, children, className = "" }) {
  return (
    <div
      className={[
        "bg-gray-50 dark:bg-gray-900/40",
        "p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60",
        className,
      ].join(" ")}
    >
      {label && (
        <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

export default function ScenarioForm({
                                       form,
                                       set,
                                       candidates = [],
                                       tcLoading = false,
                                       tcError = null,
                                       selected = [],
                                       setSelected,
                                       footerActions,
                                       readOnly = false,
                                     }) {
  const [q, setQ] = useState("");

  const filteredCandidates = useMemo(() => {
    const list = Array.isArray(candidates) ? candidates : [];
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter((c) => String(c?.label ?? "").toLowerCase().includes(s));
  }, [candidates, q]);

  const selectedIdSet = useMemo(() => {
    return new Set((selected || []).map((x) => String(x.id)));
  }, [selected]);

  const pool = useMemo(() => {
    return (filteredCandidates || []).filter((it) => !selectedIdSet.has(String(it.id)));
  }, [filteredCandidates, selectedIdSet]);

  const add = useCallback(
    (item) => {
      if (readOnly || !item) return;
      if (selectedIdSet.has(String(item.id))) return;
      setSelected?.([...(selected || []), item]);
    },
    [readOnly, selected, setSelected, selectedIdSet]
  );

  const remove = useCallback(
    (id) => {
      if (readOnly) return;
      setSelected?.((selected || []).filter((s) => String(s.id) !== String(id)));
    },
    [readOnly, selected, setSelected]
  );

  const clearAll = useCallback(() => {
    if (readOnly) return;
    setSelected?.([]);
  }, [readOnly, setSelected]);

  const onDragEnd = useCallback(
    (result) => {
      if (readOnly) return;
      const { source, destination, draggableId } = result;
      if (!destination) return;

      if (source.droppableId === destination.droppableId) {
        if (source.droppableId === "selected") {
          if (source.index === destination.index) return;
          const next = reorder(selected || [], source.index, destination.index);
          setSelected?.(next);
        }
        return;
      }

      if (source.droppableId === "pool" && destination.droppableId === "selected") {
        const item = pool[source.index];
        if (!item || selectedIdSet.has(String(item.id))) return;
        const next = Array.from(selected || []);
        next.splice(destination.index, 0, item);
        setSelected?.(next);
        return;
      }

      if (source.droppableId === "selected" && destination.droppableId === "pool") {
        setSelected?.((selected || []).filter((s) => String(s.id) !== String(draggableId)));
      }
    },
    [readOnly, pool, selected, setSelected, selectedIdSet]
  );


  const inputCls = [
    "w-full px-3 py-2 rounded-md text-sm",
    readOnly
      ? "bg-gray-100 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400"
      : "bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-700 text-gray-800 dark:text-gray-100",
  ].join(" ");

  const smallInputCls = [
    "w-full px-3 py-2 rounded-md text-sm",
    "bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-700",
    "text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
  ].join(" ");

  const droppableBox = (isOver) =>
    [
      "flex-1 min-h-0 overflow-y-auto rounded-md",
      "bg-white dark:bg-gray-950/30",
      "border border-gray-200/70 dark:border-gray-700",
      isOver ? "ring-2 ring-blue-500/20 border-blue-400" : "",
    ].join(" ");

  const poolItemCls = (isDragging) =>
    [
      "group flex items-center justify-between gap-3",
      "px-3 py-2 rounded-md text-sm",
      "border border-transparent",
      isDragging
        ? "bg-white dark:bg-gray-900 shadow-lg border-gray-200/70 dark:border-gray-700/70"
        : "hover:bg-gray-100 dark:hover:bg-gray-800/40",
    ].join(" ");

  const selectedItemCls = (isDragging) =>
    [
      "group flex items-center justify-between gap-3",
      "px-3 py-2 rounded-md text-sm",
      "bg-white dark:bg-gray-900",
      "border border-gray-200/70 dark:border-gray-700",
      isDragging ? "shadow-xl border-gray-300 dark:border-gray-600" : "hover:bg-gray-50 dark:hover:bg-gray-800/30",
    ].join(" ");

  const panelCls = "h-[560px] flex flex-col";

  return (
    <div className="space-y-12">
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
        <FieldCard label="식별자">
          <input
            value={form.code}
            onChange={(e) => !readOnly && set({ code: e.target.value })}
            placeholder={readOnly ? undefined : "예: SCEN-001"}
            className={inputCls}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </FieldCard>

        <FieldCard label="명칭">
          <input
            value={form.name}
            onChange={(e) => !readOnly && set({ name: e.target.value })}
            placeholder={readOnly ? undefined : "시나리오 명칭을 입력하세요"}
            className={inputCls}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </FieldCard>

        <FieldCard label="설명" className="sm:col-span-2">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => !readOnly && set({ description: e.target.value })}
            placeholder={readOnly ? undefined : "시나리오에 대한 간단한 설명을 입력하세요"}
            className={inputCls + " resize-none"}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </FieldCard>
      </div>

      {/* 테스트 케이스 구성 */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DragDropContext onDragEnd={onDragEnd}>

            {/* 왼쪽: 가용한 항목 */}
            {!readOnly && (
              <FieldCard label="테스트 케이스" className={panelCls}>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="검색…"
                    className={smallInputCls}
                  />
                </div>

                {tcError && (
                  <div className="mb-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40 rounded-md px-3 py-2">
                    {String(tcError)}
                  </div>
                )}

                <Droppable droppableId="pool">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={droppableBox(snapshot.isDraggingOver)}
                    >
                      {tcLoading ? (
                        <div className="p-4 text-xs text-slate-400">데이터 로드 중...</div>
                      ) : (
                        <div className="p-2 space-y-2">
                          {pool.map((it, idx) => (
                            <Draggable key={String(it.id)} draggableId={String(it.id)} index={idx}>
                              {(p, s) => (
                                <div
                                  ref={p.innerRef}
                                  {...p.draggableProps}
                                  {...p.dragHandleProps}
                                  className={poolItemCls(s.isDragging)}
                                >
                                  <span className="min-w-0 truncate text-gray-800 dark:text-gray-100">{it.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => add(it)}
                                    className={[
                                      "flex-none px-2 py-1 rounded-md text-sm",
                                      "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10",
                                      "opacity-0 group-hover:opacity-100 transition",
                                    ].join(" ")}
                                  >
                                    + 추가
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {pool.length === 0 && (
                            <div className="p-8 text-center text-xs text-slate-400">항목이 없습니다.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </FieldCard>
            )}

            {/* 오른쪽: 구성된 순서 */}
            <div className="flex flex-col">
              <FieldCard
                label={
                  <div className="flex items-center justify-between">
                    <span>시나리오 구성</span>
                    {!readOnly && selected.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs font-semibold text-gray-500 hover:text-rose-600"
                      >
                        전부 삭제
                      </button>
                    )}
                  </div>
                }
                className={panelCls}
              >
                <Droppable droppableId="selected">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={droppableBox(snapshot.isDraggingOver)}
                    >
                      <div className="p-2 space-y-2">
                        {selected.length === 0 && (
                          <div className="h-[400px] flex flex-col items-center justify-center p-8 text-center">
                            <p className="text-xs text-slate-400 leading-relaxed italic">
                              항목을 드래그하거나 [+] 버튼을 눌러<br/>시나리오 순서를 구성하세요.
                            </p>
                          </div>
                        )}
                        {selected.map((s, idx) => (
                          <Draggable key={String(s.id)} draggableId={String(s.id)} index={idx} isDragDisabled={readOnly}>
                            {(p, st) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                className={selectedItemCls(st.isDragging)}
                              >
                                <div className="flex items-center min-w-0">
                                  {!readOnly && (
                                    <div {...p.dragHandleProps} className="text-slate-500 mr-3 select-none text-[11px]">
                                      ::
                                    </div>
                                  )}
                                  <span className="text-xs font-bold text-blue-500 w-4">{idx + 1}</span>

                                  <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                                    {s.label}
                                  </span>
                                </div>
                                {!readOnly && (
                                  <button
                                    onClick={() => remove(s.id)}
                                    className={[
                                      "flex-none px-2 py-1 rounded-md text-sm",
                                      "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20",
                                      "opacity-0 group-hover:opacity-100 transition",
                                    ].join(" ")}
                                  >
                                    &times; 삭제
                                  </button>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </FieldCard>
            </div>

          </DragDropContext>
        </div>
      </section>

      {/* 하단 액션 */}
      {!readOnly && footerActions && (
        <div className="flex justify-end">{footerActions}</div>
      )}
    </div>
  );
}
