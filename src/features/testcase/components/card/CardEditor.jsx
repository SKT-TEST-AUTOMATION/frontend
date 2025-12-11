import React, { useCallback, useEffect, useState } from "react";
import { Plus, Download, FileJson } from "lucide-react";
import {
  STEP_HEADERS,
  STEP_HEADERS_LABELS,
  STEP_FIELD_CONFIG,
} from "../../constants/stepConstants.js";
import StepCard from "./StepCard";
import { stepsToAoa } from '../../utils/stepExcelMapper.js';
import {
  DragDropContext,
  Droppable,
  Draggable
} from '@hello-pangea/dnd';

function createEmptyStep(no) {
  return {
    id: `${Date.now()}-${no}`,
    no,
    name: "",
    mandatory: "Y",
    skip_on_error: "N",
    sleep: 0,
    visible_if: "",
    visible_if_type: "",
    action: "",
    by: "",
    input_text: "",
    value: "",
    true_jump_no: "",
    false_jump_no: "",
    memo: "",
  };
}

function renumber(list) {
  return list.map((s, idx) => ({ ...s, no: idx + 1 }));
}

function normalizeInitialSteps(initialSteps) {
  if (!initialSteps || initialSteps.length === 0) {
    return [createEmptyStep(1)];
  }
  return renumber(
    initialSteps.map((s, idx) => ({
      ...s,
      id: s.id ?? `${Date.now()}-${idx}`,
      no: s.no ?? idx + 1,
    }))
  );
}

export default function CardEditor({
                                     initialSteps,
                                     defaultSheetName = "TestCase",
                                     onChange,
                                     onBuildExcel,
                                     readOnly = false,
                                   }) {
  const [steps, setSteps] = useState(() =>
    normalizeInitialSteps(initialSteps)
  );

  useEffect(() => {
    if (onChange) {
      onChange(steps);
    }
  }, [steps, onChange]);

  const handleFieldChange = useCallback(
    (id, field, value) => {
      if (readOnly) return;
      setSteps((prev) =>
        prev.map((step) =>
          step.id === id ? { ...step, [field]: value } : step
        )
      );
    },
    [readOnly]
  );

  const handleDuplicate = useCallback(
    (id) => {
      if (readOnly) return;
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx === -1) return prev;
        const copy = {
          ...prev[idx],
          id: `${prev[idx].id}-copy`,
          name: `${prev[idx].name} (Copy)`,
        };
        const next = [...prev];
        next.splice(idx + 1, 0, copy);
        return renumber(next);
      });
    },
    [readOnly]
  );

  const handleDelete = useCallback(
    (id) => {
      if (readOnly) return;
      setSteps((prev) => {
        if (confirm("이 스텝을 삭제하시겠습니까?")) {
          const next = prev.filter((s) => s.id !== id);
          return next.length === 0 ? [createEmptyStep(1)] : renumber(next);
        }
        return prev;
      });
    },
    [readOnly]
  );

  const handleAddStep = () => {
    if (readOnly) return;
    setSteps((prev) => [...prev, createEmptyStep(prev.length + 1)]);
  };

  const handleSave = () => {
    // 단일 유틸 사용으로 교체 (기존 stepsToSheetAOA 대신)
    const aoa = stepsToAoa(steps, STEP_HEADERS);
    const blob = new Blob(["Mock Excel Data"], { type: "text/plain" });

    if (onBuildExcel) {
      onBuildExcel(blob, { steps, sheetName: defaultSheetName });
    } else {
      alert("Excel export logic is mocked. Check console.");
    }
  };

  // ★ DnD: 드래그 종료 시 순서 재정렬
  const handleDragEnd = (result) => {
    if (readOnly) return;

    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    setSteps((prev) => {
      const next = Array.from(prev);
      const [removed] = next.splice(source.index, 1);
      next.splice(destination.index, 0, removed);
      return renumber(next);
    });
  };

  useEffect(() => {
    setSteps(normalizeInitialSteps(initialSteps));
  }, [initialSteps]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 text-gray-800 font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-1 flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-blue-200 shadow-lg">
            <FileJson className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {defaultSheetName}
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              총 {steps.length} Steps
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {
            !readOnly && (
              <button
                type="button"
                className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-blue-200 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={handleSave}
                disabled={steps.length === 0}
              >
                <Download className="h-4 w-4" />
                <span>저장</span>
              </button>
            )
          }
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto space-y-4">
          {/* Step List + DnD */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="steps">
              {(provided) => (
                <div
                  className="flex flex-col gap-4"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {steps.map((step, index) => (
                    <Draggable
                      key={step.id}
                      draggableId={String(step.id)}
                      index={index}
                      isDragDisabled={readOnly}
                    >
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}       // ★ 위치/사이즈용
                          style={{
                            ...(dragProvided.draggableProps.style || {}),
                          }}
                          className={
                            "transition-shadow " +
                            (snapshot.isDragging
                              ? "shadow-xl ring-2 ring-blue-200 rounded-xl bg-white"
                              : "")
                          }
                        >
                          <StepCard
                            step={step}
                            labels={STEP_HEADERS_LABELS}
                            fieldConfig={STEP_FIELD_CONFIG}
                            onFieldChange={handleFieldChange}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                            // ★ 여기로 핸들 props 내려줌
                            dragHandleProps={dragProvided.dragHandleProps}
                            readOnly={readOnly}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Add Button at Bottom */}
          {!readOnly && ( // ★ readOnly 시 숨김
            <button
              type="button"
              onClick={handleAddStep}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-sm font-semibold text-gray-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
            >
              <div className="rounded-full bg-gray-100 p-2 transition-colors group-hover:bg-blue-100">
                <Plus className="h-5 w-5" />
              </div>
              <span>새로운 Step 추가</span>
            </button>
          )}

          <div className="h-10" /> {/* Spacer */}
        </div>
      </main>
    </div>
  );
}