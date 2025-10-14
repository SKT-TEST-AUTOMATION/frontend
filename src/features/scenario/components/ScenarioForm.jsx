// src/features/scenarios/components/ScenarioForm.jsx
import { useMemo, useState } from "react";

export default function ScenarioForm({
  form, set,
  candidates = [], tcLoading = false, tcError = null,
  selected, setSelected,
  footerActions,
  readOnly = false,
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q) return candidates;
    const s = q.toLowerCase();
    return (candidates || []).filter((c) => c.label.toLowerCase().includes(s));
  }, [candidates, q]);

  // 조작 핸들러 (readOnly면 동작 X)
  const add = (item) => {
    if (readOnly || !item) return;
    if (selected.some((s) => s.id === item.id)) return; // 중복 방지
    setSelected?.([...selected, item]);
  };
  const remove = (id) => {
    if (readOnly) return;
    setSelected?.(selected.filter((s) => s.id !== id));
  };
  const moveUp = (idx) => {
    if (readOnly || idx <= 0) return;
    const arr = [...selected];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setSelected?.(arr);
  };
  const moveDown = (idx) => {
    if (readOnly || idx >= selected.length - 1) return;
    const arr = [...selected];
    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    setSelected?.(arr);
  };

  return (
    <section className="grid grid-cols-1 gap-6">
      {/* 기본정보 */}
      <div className="bg-white dark:bg-gray-900/50 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
              시나리오 ID
            </label>
            <input
              value={form.code}
              onChange={(e) => !readOnly && set({ code: e.target.value })}
              placeholder="예: SCEN-001"
              readOnly={readOnly}
              disabled={readOnly}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
              시나리오 명칭
            </label>
            <input
              value={form.name}
              onChange={(e) => !readOnly && set({ name: e.target.value })}
              placeholder="시나리오 명칭을 입력하세요"
              readOnly={readOnly}
              disabled={readOnly}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
              설명
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => !readOnly && set({ description: e.target.value })}
              placeholder="시나리오에 대한 설명을 입력하세요"
              readOnly={readOnly}
              disabled={readOnly}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* 테스트 케이스 선택/정렬 (readOnly면 후보/검색 숨김, 선택 목록만 표시) */}
      <div className="bg-white dark:bg-gray-900/50 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-3">
          테스트 케이스 선택
        </label>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${readOnly ? "md:grid-cols-1" : ""}`}>
          {!readOnly && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="테스트 케이스 검색"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <div className="h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                {tcLoading && <div className="p-4 text-sm text-gray-500">불러오는 중...</div>}
                {tcError && <div className="p-4 text-sm text-red-500">목록을 불러오지 못했습니다.</div>}
                {!tcLoading && !tcError && (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtered.map((it) => (
                      <li key={it.id} className="flex items-center justify-between p-3">
                        <span className="text-sm">{it.label}</span>
                        <button
                          type="button"
                          onClick={() => add(it)}
                          className="px-2.5 py-1 rounded-md text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          추가
                        </button>
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="p-3 text-sm text-gray-500">결과가 없습니다.</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              {
                !readOnly && (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    선택된 케이스
                  </span>
                )
              }
              {!readOnly && selected.length > 0 && (
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setSelected?.([])}
                >
                  모두 제거
                </button>
              )}
            </div>

            <ol className="h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {selected?.length === 0 && (
                <li className="p-4 text-sm text-gray-500">선택된 항목이 없습니다.</li>
              )}
              {selected?.map((s, idx) => (
                <li key={s.id} className="flex items-center justify-between p-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-7 h-7 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      {idx + 1}
                    </span>
                    <span className="text-sm">{s.label ?? `TC${s.id}`}</span>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveUp(idx)}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
                        title="위로"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(idx)}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
                        title="아래로"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
                      >
                        제거
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>

            {/* {!readOnly && (
              <p className="mt-2 text-xs text-gray-500">
                드래그 앤 드롭이 필요하면 추후 react-beautiful-dnd로 대체 가능. 현재는 ▲▼ 버튼으로 순서 변경합니다.
              </p>
            )} */}
          </div>
        </div>
      </div>

      {!readOnly && <div className="flex items-center justify-end">{footerActions}</div>}
    </section>
  );
}
