// src/features/testcases/pages/TestCaseCreatePage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../services/axios";
import PageHeader from "../../../shared/components/PageHeader";
import { useToast } from "../../../shared/hooks/useToast";
import TestCaseForm from "../components/TestCaseForm";

const CREATE_ENDPOINT = "/testcases?userId=1"; // CreateTestCaseDto.Request
const DRAFT_KEY = "testcase:new:draft";

export default function TestCaseCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // DTO에 맞춘 폼 상태
  const [form, setForm] = useState({
    code: "",
    name: "",
    precondition: "",
    navigation: "",
    procedureDesc: "",
    expectedResult: "",
    comment: "",
  });

  // 단계 배열 (전송 시 \n로 합침)
  const [procedureSteps, setProcedureSteps] = useState([""]);
  const [expectedSteps, setExpectedSteps] = useState([""]);
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // 드래프트 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== "object") return;

      setForm((f) => ({
        ...f,
        code: draft.code ?? f.code,
        name: draft.name ?? f.name,
        precondition: draft.precondition ?? f.precondition,
        navigation: draft.navigation ?? f.navigation,
        comment: draft.comment ?? f.comment,
      }));
      if (Array.isArray(draft.procedureSteps)) setProcedureSteps(draft.procedureSteps);
      if (Array.isArray(draft.expectedSteps)) setExpectedSteps(draft.expectedSteps);
      showToast("info", "임시저장된 내용을 불러왔습니다.");
    } catch {/* ignore */}
  }, [showToast]);

  const validate = () => {
    if (!form.code.trim()) return "식별자(CODE)를 입력하세요.";
    if (!form.name.trim()) return "명칭(NAME)을 입력하세요.";
    return null;
  };

  const onTempSave = () => {
    const draft = {
      ...form,
      procedureSteps,
      expectedSteps,
      savedAt: new Date().toISOString(),
    };
    try {
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
      ...form,
      procedureDesc: (procedureSteps ?? []).join("\n").trim(),
      expectedResult: (expectedSteps ?? []).join("\n").trim(),
    };

    try {
      setSaving(true);
      const res = await api.post(CREATE_ENDPOINT, payload);
      const d = res?.data?.data ?? res?.data ?? {};

      // 성공 시 임시저장 삭제
      try { localStorage.removeItem(DRAFT_KEY); } catch {}

      showToast("success", "테스트 케이스가 등록되었습니다.");
      navigate(`/testcases/${d.id}/detail`, { state: { justCreatedCode: form.code } });
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

  // 폼 레벨: Enter 자동 submit 방지(+ IME 가드)
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
        title="테스트 케이스 등록"
        subtitle="테스트 케이스를 등록하여 시나리오 구성에 활용합니다."
      />

      <TestCaseForm
        form={form}
        set={set}
        procedureSteps={procedureSteps}
        setProcedureSteps={setProcedureSteps}
        expectedSteps={expectedSteps}
        setExpectedSteps={setExpectedSteps}
        readOnly={false}
        headerTabs={true}
        footerActions={footerActions}
        enterAddsStep={true} 
      />
    </form>
  );
}
