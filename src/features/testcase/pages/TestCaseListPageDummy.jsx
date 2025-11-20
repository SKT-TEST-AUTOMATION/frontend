import { useMemo, useState } from "react";
import { Link, useNavigate, generatePath } from "react-router-dom";

import PageHeader from "../../../shared/components/PageHeader";
import PaginationBar from "../../../shared/components/PaginationBar";
import fmtDT from "../../../shared/utils/dateUtils";

// 예시
const DUMMY_DATA = [
  { id: 1, code: "TC-001", name: "로그인 시나리오", creatorName: "홍길동", createdAt: "2025-10-21", updatedAt: "2025-10-27" },
  { id: 2, code: "TC-002", name: "국내여행 결제", creatorName: "김영희", createdAt: "2025-10-22", updatedAt: "2025-10-28" },
  { id: 3, code: "TC-003", name: "글로벌여행 예약", creatorName: "이철수", createdAt: "2025-10-23", updatedAt: "2025-10-28" },
];

export default function TestCaseListPageDummy() {
  const navigate = useNavigate();

  // 페이지네이션 상태
  const [data, setData] = useState({
    content: DUMMY_DATA,
    totalElements: DUMMY_DATA.length,
    totalPages: 1,
    number: 0,  // Spring 0-based
    size: 10,
  });
  const [rows, setRows] = useState(DUMMY_DATA);
  const [page, setPage] = useState(1); // 화면 1-based
  const [size, setSize] = useState(10);
  const [deletingId, setDeletingId] = useState(null);

  // 삭제 핸들러
  const handleDelete = (row) => {
    if (!window.confirm(`'${row.name}' 케이스를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    alert('삭제되었습니다 (임시 동작)');
  };

  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    if (!searchTerm) return rows;
    const s = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        String(r.name ?? "").toLowerCase().includes(s) ||
        String(r.code ?? "").toLowerCase().includes(s) ||
        String(r.creatorName ?? "").toLowerCase().includes(s)
    );
  }, [rows, searchTerm]);

  const goDetail = (id) => {
    navigate(generatePath("/testcases/:testCaseId/detail", { testCaseId: id }));
  };

  // -- 테이블 헤더
  const HEADERS = [
    { key: "code", label: "케이스 코드", span: 2 },
    { key: "name", label: "케이스 명칭", span: 3 },
    { key: "creator", label: "작성자", span: 2 },
    { key: "created", label: "생성일", span: 2 },
    { key: "updated", label: "수정일", span: 2 },
    { key: "actions", label: "...", span: 1, align: "text-center" },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
        {/* 헤더 */}
        <PageHeader
          title="테스트 케이스"
          subtitle="프로젝트의 테스트 케이스를 관리합니다."
          actions={
            <Link
              to="/testcases/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow hover:shadow-blue-500/20 text-sm"
            >
              <span className="material-symbols-outlined text-base leading-none">add_circle</span>
              새 케이스 등록
            </Link>
          }
        />

        {/* 검색 바 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3.5">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-base">
                search
              </span>
              <input
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} // 검색 변경 시 1페이지로
                placeholder="케이스 이름, 코드, 작성자 검색..."
                className="w-full h-10 pl-10 pr-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              />
            </div>
          </div>
        </div>

        {/* 컨텐츠 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-12 gap-4 px-5 h-10 items-center bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
            {HEADERS.map(({ key, label, span, align }) => (
              <div
                key={key}
                className={[
                  `col-span-${span}`,
                  "text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide",
                  align ?? "text-left",
                ].join(" ")}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 빈 상태 */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-sm">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3.5">
                <span className="material-symbols-outlined text-gray-400 text-xl">list_alt</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                테스트 케이스가 없습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-5">
                첫 번째 테스트 케이스를 등록해보세요.
              </p>
              <Link
                to="/testcases/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors text-sm"
              >
                <span className="material-symbols-outlined text-base">add</span>
                첫 케이스 등록
              </Link>
            </div>
          )}

          {/* 목록 */}
          {filtered.length > 0 && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-12 gap-4 px-5 min-h-[52px] py-3.5 items-center
                             hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  {/* 코드 */}
                  <div className="col-span-2">
                    <span className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold leading-none
                                    text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900">
                      {row.code}
                    </span>
                  </div>

                  {/* 명칭 (클릭 → 상세) */}
                  <div className="col-span-3">
                    <button
                      onClick={() => goDetail(row.id)}
                      className="text-left truncate text-sm leading-6 font-medium
                                 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                      title={row.name}
                    >
                      {row.name}
                    </button>
                  </div>

                  {/* 작성자 */}
                  <div className="col-span-2">
                    <span className="text-sm leading-6 text-gray-600 dark:text-gray-400 truncate">
                      {row.creatorName ?? "-"}
                    </span>
                  </div>

                  {/* 생성일 */}
                  <div className="col-span-2">
                    <span className="text-sm leading-6 text-gray-500 dark:text-gray-400 tabular-nums">
                      {fmtDT(row.createdAt)}
                    </span>
                  </div>

                  {/* 수정일 */}
                  <div className="col-span-2">
                    <span className="text-sm leading-6 text-gray-500 dark:text-gray-400 tabular-nums">
                      {fmtDT(row.updatedAt)}
                    </span>
                  </div>

                  {/* 액션 */}
                  <div className="col-span-1 flex justify-end gap-1.5">
                    <button
                      onClick={() => navigate(generatePath("/testcases/:testCaseId/edit", { testCaseId: row.id }))}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="편집"
                    >
                      <span className="material-symbols-outlined text-base leading-none">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <span className="material-symbols-outlined text-base leading-none">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        <PaginationBar
          page={page}
          totalPages={data?.totalPages ?? 1}
          size={size}
          totalElements={data?.totalElements}
          unitLabel="개 결과"
          onPageChange={(next) => setPage(next)}
          onSizeChange={(nextSize) => { setSize(nextSize); setPage(1); }}
        />
      </div>
    </>
  );
}
