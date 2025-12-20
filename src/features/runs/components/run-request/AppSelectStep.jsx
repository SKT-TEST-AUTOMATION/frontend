// src/features/runs/components/wizard/AppSelectStep.jsx
import React, { useEffect, useMemo, useState } from "react";

export default function AppSelectStep({ value, onChange, apps, fetchApps }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState(Array.isArray(apps) ? apps : []);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!fetchApps) return;
      setLoading(true);
      setErr("");
      try {
        const res = await fetchApps();
        if (!alive) return;
        setItems(Array.isArray(res) ? res : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "앱 목록을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [fetchApps]);

  useEffect(() => {
    if (Array.isArray(apps)) setItems(apps);
  }, [apps]);

  const selectedId = value?.id ?? value?.appId ?? null;

  const list = useMemo(() => items ?? [], [items]);

  const select = (app) => onChange?.(app);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
        <h3 className="text-sm font-bold text-slate-800">앱 선택</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          실행할 앱(빌드/버전)을 선택합니다.
        </p>
      </div>

      <div className="px-5 py-4">
        {loading && <div className="text-sm text-slate-600">불러오는 중…</div>}
        {!loading && err && <div className="text-sm text-rose-600">{err}</div>}

        {!loading && !err && list.length === 0 && (
          <div className="text-sm text-slate-600">선택 가능한 앱이 없습니다.</div>
        )}

        {!loading && !err && list.length > 0 && (
          <ul className="space-y-2 max-h-80 overflow-auto pr-1">
            {list.map((a) => {
              const id = a?.id ?? a?.appId ?? a?.code ?? JSON.stringify(a);
              const name = a?.name ?? a?.appName ?? a?.fileName ?? "Unknown App";
              const version = a?.version ?? a?.appVersion ?? "";
              const platform = a?.platform ?? a?.appPlatformType ?? "";

              const active = (a?.id ?? a?.appId) === selectedId;

              return (
                <li
                  key={String(id)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                    active
                      ? "border-blue-200 bg-blue-50/40"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="app"
                    checked={active}
                    onChange={() => select(a)}
                    className="accent-blue-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">
                      {name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {platform ? `${platform} · ` : ""}
                      {version ? `v${version}` : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}