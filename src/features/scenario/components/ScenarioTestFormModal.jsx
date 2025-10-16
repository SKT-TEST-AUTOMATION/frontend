import { useState } from "react";
import { api } from "../../../services/axios";
import { Field } from "./Commons";
import { useToast } from "../../../shared/hooks/useToast";
import { useNavigate } from "react-router-dom";

const PLATFORM_OPTIONS = [
  { value: "MOBILE_APP", label: "MOBILE APP" },
  { value: "MOBILE_WEB", label: "MOBILE WEB" },
  { value: "WEB", label: "WEB" },
];

const OS_OPTIONS = [
  { value: "ANDROID", label: "ANDROID" },
  { value: "IOS", label: "IOS"},
];

export default function ScenarioTestFormModal({ scenarioId, onSuccess, onError }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "",
    testName: "",
    appPlatformType: "MOBILE_APP",
    testAppId: "1", // t 멤버십
    deviceOsType: "ANDROID",   
    userId: "",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const required = ["code", "testName", "appPlatformType", "testAppId", "deviceOsType", "userId"]; 
    return required.every((k) => String(form[k]).trim().length > 0);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      onError?.("필수 항목을 모두 입력해 주세요.");
      return;
    }

    const userIdNum = Number(form.userId);
    const payload = {
      scenarioId: Number(scenarioId),
      code: form.code.trim(),
      testName: form.testName.trim(),
      appPlatformType: form.appPlatformType,
      testAppId: Number(form.testAppId),
      deviceOsType: form.deviceOsType.trim(), 
    };

    setSubmitting(true);
    try {
      // 1) ScenarioTest 생성
      const data = await api.post("/scenarios/tests", payload, {
        params: { userId: userIdNum },
      });

      onSuccess?.({ ...data });
      setOpen(false);
      showToast("success", "테스트가 생성되었습니다.");
      // navigate()
    } catch (err) {
      console.log(err);
      const message =
        err?.response?.data?.message ||
        (err?.response?.status ? `${err.response.status} ${err.response.statusText}` : err?.message) ||
        "테스트 생성 요청에 실패했습니다.";
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25 transition-all"
      >
        <span className="material-symbols-outlined text-lg">play_arrow</span>
        테스트 생성
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
            <div className="flex items-start justify-between gap-2 border-b border-gray-200 dark:border-gray-700 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">테스트 생성</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">필수 정보를 입력하여 테스트를 생성하세요.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                aria-label="닫기"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <Field label="코드" required>
                <input
                  name="code"
                  value={form.code}
                  onChange={onChange}
                  className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </Field>
              <Field label="테스트명" required>
                <input
                  name="testName"
                  value={form.testName}
                  onChange={onChange}
                  className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="플랫폼" required>
                  <select
                    name="appPlatformType"
                    value={form.appPlatformType}
                    onChange={onChange}
                    className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none pr-10"
                  >
                    {PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="테스트 앱" required>
                  <input
                    disabled
                    name="testAppId"
                    value="T 멤버십"
                    onChange={onChange}
                    type="text"
                    // min="1"
                    className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-500 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="디바이스 OS" required>
                  <select
                    name="deviceOsType"
                    value={form.deviceOsType}
                    onChange={onChange}
                    className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none pr-10"
                  >
                    {OS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="사용자 ID" required>
                  <input
                    name="userId"
                    value={form.userId}
                    onChange={onChange}
                    type="number"
                    min="1"
                    className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-5 py-3">
              <button
                className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60 shadow-lg hover:shadow-blue-500/25 transition-all"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "생성 중…" : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
