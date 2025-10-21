// src/features/scenario/pages/ScenarioCreatePage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

import PageHeader from "../../../shared/components/PageHeader";
import { useToast } from "../../../shared/hooks/useToast";
import ScenarioForm from "../components/ScenarioForm";

import { createScenario, getScenario, updateScenario } from "../../../services/scenarioAPI"
import { getTestcases } from "../../../services/testcaseAPI";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import { toErrorMessage } from "../../../services/axios";

const DRAFT_KEY = "scenario:new:draft";

export default function ScenarioCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { scenarioId: routeScenarioId } = useParams();
  const isEdit = !!routeScenarioId;

  // ---- 폼 상태
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
  });

  // 선택된 테스트케이스들 (정렬 순서 = 전송 순서)
  const [selected, setSelected] = useState([]); // [{id, label}]
  const [saving, setSaving] = useState(false);

  // 선택 후보 목록
  const [tcLoading, setTcLoading] = useState(true);
  const [tcError, setTcError] = useState(null);
  const [candidates, setCandidates] = useState([]); // [{id, label, raw}]

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // ---- 테스트 케이스 목록 로드
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setTcLoading(true);
        setTcError(null);
        const data = await getTestcases({ page: 0, size: 1000, sort: "id,desc" }, ac.signal);
        const list = data.content;
        const mapped = (list || []).map((tc) => {
          const code = tc.tcId || tc.code || `TC${tc.id}`;
          const name = tc.name || "";
          return {
            id: Number(tc.id),
            label: `${code} · ${name}`,
            raw: tc,
          };
        });
        setCandidates(mapped);
      } catch (e) {
        if (e?.code === REQUEST_CANCELED_CODE) return;
        setTcError(toErrorMessage(e));
      } finally {
        setTcLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // ---- 임시저장 로드 (편집 모드에서는 건너뜀)
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== "object") return;

      setForm((form) => ({
        ...form,
        code: draft.code ?? form.code,
        name: draft.name ?? form.name,
        description: draft.description ?? form.description,
      }));
      if (Array.isArray(draft.selected)) setSelected(draft.selected);
      showToast("info", "임시저장된 내용을 불러왔습니다.");
    } catch { /* ignore */ }
  }, [showToast, isEdit]);

  // ---- 편집 모드: 기존 시나리오 로드
  useEffect(() => {
    if (!isEdit) return;
    let canceled = false;
    (async () => {
      try {
        const data = await getScenario(Number(routeScenarioId));
        if (canceled) return;
        setForm({
          code: data.code || "",
          name: data.name || "",
          description: data.description || "",
        });
        // selected: [{id,label}] 복원
        const sels = (data.testcases || data.testCases || []).map((tc) => ({
          id: Number(tc.id),
          label: `${tc.code || tc.tcId || `TC${tc.id}`} · ${tc.name || ""}`,
          raw: tc,
        }));
        setSelected(sels);
      } catch (e) {
        showToast("error", toErrorMessage(e));
      }
    })();
    return () => { canceled = true; };
  }, [isEdit, routeScenarioId, showToast]);

  const validate = () => {
    if (!form.code.trim()) return "식별자(CODE)를 입력하세요.";
    if (!form.name.trim()) return "명칭(NAME)을 입력하세요.";
    if (selected.length === 0) return "포함할 테스트 케이스를 1개 이상 선택하세요.";
    return null;
  };

  const onTempSave = () => {
    if (isEdit) return;
    try {
      const draft = {
        ...form,
        selected,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      showToast("info", "임시저장 완료");
    } catch {
      showToast("warning", "임시저장에 실패했습니다.");
    }
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();

    const msg = validate();
    if (msg) return showToast("warning", msg);

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: (form.description || "").trim(),
      testCaseIds: selected.map((s) => s.id),
    };

    try {
      setSaving(true);
      if (isEdit) {
        await updateScenario(Number(routeScenarioId), payload);
        showToast("success", "시나리오가 수정되었습니다.");
        navigate(`/scenarios/${routeScenarioId}/detail`);
      } else {
        const data = await createScenario(payload);
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        showToast("success", "시나리오가 등록되었습니다.");
        navigate(`/scenarios/${data.id}/detail`, { state: { justCreatedCode: form.code } });
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        (err?.response?.status ? `${err.response.status} ${err.response.statusText}` : err?.message) ||
        "등록에 실패했습니다.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  };

  // 폼 : Enter 클릭 시 자동 submit 방지
  const blockEnterSubmit = (e) => {
    const composing = e.nativeEvent?.isComposing || e.isComposing || e.nativeEvent?.keyCode === 229;
    if (composing) return;
    if (
      e.key === "Enter" &&
      e.target &&
      e.target.tagName !== "TEXTAREA" &&
      !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey
    ) {
      e.preventDefault();
    }
  };

  const footerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onTempSave}
        className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        임시저장
      </button>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        취소
      </button>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all duration-200 shadow hover:shadow-blue-500/20"
      >
        {saving ? "저장 중..." : "등록"}
      </button>
    </div>
  );

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={blockEnterSubmit}
      className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm"
    >
      <PageHeader
        title={isEdit ? "시나리오 수정" : "시나리오 등록"}
        subtitle="테스트 케이스들을 순서대로 묶어 시나리오를 구성합니다."
      />

      <ScenarioForm
        form={form}
        set={set}
        candidates={candidates}
        tcLoading={tcLoading}
        tcError={tcError}
        selected={selected}
        setSelected={setSelected}
        footerActions={footerActions}
      />
    </form>
  );
}
