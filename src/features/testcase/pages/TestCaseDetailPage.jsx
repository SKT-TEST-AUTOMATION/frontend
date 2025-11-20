// src/features/testcases/pages/TestCaseDetailPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import PageHeader from "../../../shared/components/PageHeader";
import TestCaseForm from "../components/TestCaseForm";
import fmtDT from "../../../shared/utils/dateUtils";

import { getTestcase } from "../../../services/testcaseAPI";
import { toErrorMessage } from "../../../services/axios";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";

export default function TestCaseDetailPage() {
  const { testCaseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    precondition: "",
    navigation: "",
    procedureDesc: "",
    expectedResult: "",
    comment: ""
  });
  const [procedureSteps, setProcedureSteps] = useState([""]);
  const [expectedSteps, setExpectedSteps] = useState([""]);

  // 메타 영역(작성자/일시)
  const [meta, setMeta] = useState({
    id: null,
    creatorName: "",
    creatorId: null,
    createdAt: null,
    updatedAt: null,
    excelFileName: null,
  });

  useEffect(() => {
    if (!testCaseId) return;
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await getTestcase(testCaseId, ac.signal);
        console.log(data);
        // 본문 폼(보기 전용에 재사용)
        const nextForm = {
          code: data?.code ?? "",
          name: data?.name ?? "",
          precondition: data?.precondition ?? "",
          navigation: data?.navigation ?? "",
          procedureDesc: data?.procedureDesc ?? "",
          expectedResult: data?.expectedResult ?? "",
          comment: data?.comment ?? ""
        };

        // 메타
        const nextMeta = {
          id: data?.id ?? null,
          creatorName: data?.creatorName ?? "",
          creatorId: data?.creatorId ?? null,
          createdAt: data?.createdAt ?? null,
          updatedAt: data?.updatedAt ?? null,
          excelFileName: data?.excelFileName ?? null,
        };

        setForm(nextForm);
        setMeta(nextMeta);

        // 줄바꿈 -> 배열로
        const proc = (nextForm.procedureDesc || "")
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        const exp = (nextForm.expectedResult || "")
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        setProcedureSteps(proc.length ? proc : [""]);
        setExpectedSteps(exp.length ? exp : [""]);
      } catch (e) {
        if (e?.code === REQUEST_CANCELED_CODE) return;
        setErr(toErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [testCaseId]);

  // 헤더 액션: 편집/목록
  const actions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Link
          to={`/testcases/${testCaseId}/edit`}
          className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          편집
        </Link>
        <button
          type="button"
          onClick={() => navigate("/testcases")}
          className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          목록
        </button>
      </div>
    ),
    [navigate, testCaseId]
  );

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
      <PageHeader
        title="테스트 케이스"
        subtitle={form ? `[${form.code}] ${form.name}` : ""}
        breadcrumbs={[
          { label: "테스트 케이스", to: "/testcases" },
          { label: "상세" },
        ]}
        actions={actions}
      />

      {/* 메타 정보 카드 */}
      {!loading && !err && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-gray-500">작성자</div>
                <div className="text-gray-800 dark:text-gray-100 truncate">
                  {meta.creatorName || "-"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <div className="text-[11px] text-gray-500">생성일</div>
                <div className="text-gray-800 dark:text-gray-100">{fmtDT(meta.createdAt)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <div className="text-[11px] text-gray-500">수정일</div>
                <div className="text-gray-800 dark:text-gray-100">{fmtDT(meta.updatedAt)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <div className="text-[11px] text-gray-500">ID</div>
                <div className="text-gray-800 dark:text-gray-100">{meta.id ?? "-"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      )}

      {!loading && err && (
        <div className="text-rose-600 dark:text-rose-300">{err}</div>
      )}

      {!loading && !err && (
        <TestCaseForm
          form={form}
          set={(patch) => setForm((f) => ({ ...f, ...patch }))}
          procedureSteps={procedureSteps}
          setProcedureSteps={setProcedureSteps}
          expectedSteps={expectedSteps}
          setExpectedSteps={setExpectedSteps}
          readOnly={true}
          headerTabs={true}
          testCaseId={testCaseId}
          excelFileName={meta.excelFileName}
        />
      )}
    </div>
  );
}
