import { useCallback, useEffect, useState } from "react";
import { normalizePage, toErrorMessage } from "../../../services/axios";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import { getScenarioTests } from "../../../services/scenarioAPI";
import PageHeader from "../../../shared/components/PageHeader";
import PaginationBar from "../../../shared/components/PaginationBar";
import DeviceSelectModal from "../components/DeviceSelectModal";
import { runScenarioTest } from "../../../services/runAPI";
import { useToast } from "../../../shared/hooks/useToast";

export default function ScenarioTestListPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 1,
    number: 0,
    size: 10,
  });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const StatusBadge = ({ status }) => {
    const map = {
      READY:   { t: "READY",   c: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200" },
      RUNNING: { t: "RUNNING", c: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200" },
    };
    const m = map[status] || map["READY"];
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.c}`}>{m.t}</span>;
  };

  const fetchTests = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getScenarioTests({ page, size, sort: "id,desc" }, signal);
      const data = normalizePage(res);
      setData(data);
      setRows(data.content);
    } catch (err) {
      if (err?.code === REQUEST_CANCELED_CODE) return;
      const message = toErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTests(controller.signal);
    return () => controller.abort();
  }, [fetchTests]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState(null);

  const openPicker = (testId) => {
    setSelectedTestId(testId);
    setPickerOpen(true);
  };
  const closePicker = () => {
    setPickerOpen(false);
    setSelectedTestId(null);
  };
const handlePick = async (device) => {
  if (!selectedTestId || !device) return;

  // RunScenarioTestDto.Request 규격에 맞춰 payload 구성 (모두 문자열)
  const payload = {
    deviceUdid:  String(device.udid ?? ""),
    connectedIp: String(device.connectedIp ?? "127.0.0.1"),
    appiumPort:  String(device.appiumPort ?? 4723),
    systemPort:  String(device.systemPort ?? ""), // iOS면 빈 문자열 가능
  };

  try {
    const res = await runScenarioTest(selectedTestId, payload);
    // 성공 후 목록 갱신(선택)
    console.log(res);
    showToast("success", "테스트가 실행되었습니다.");
    const controller = new AbortController();
    await fetchTests(controller.signal);
  } catch (e) {
    showToast("error", "테스트 실행 요청에 실패했습니다.");
    console.error("실행 요청 실패:", e);
    // 필요시 toast/alert로 노출
  } finally {
    closePicker();
  }
};

  const HEADERS = [
    { key: "id",          label: "테스트 ID",          span: 1, align: "left" },
    { key: "test",        label: "테스트 코드 / 명칭", span: 3 },
    { key: "appPlatform", label: "플랫폼 / 앱",        span: 2 },
    { key: "device",      label: "디바이스 OS",        span: 2 },
    { key: "creator",     label: "등록자",             span: 1 },
    { key: "status",      label: "상태",               span: 1, align: "left" },
    { key: "run",         label: "실행",               span: 1, align: "left" },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
        <PageHeader title="테스트 실행 목록" subtitle="실행 가능한 시나리오를 관리합니다." />

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="grid grid-cols-11 gap-4 px-5 py-3.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
            {HEADERS.map(({ key, label, span, align }) => (
              <div
                key={key}
                className={[
                  `col-span-${span}`,
                  "text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide",
                  align ? align : "",
                ].join(" ")}
              >
                {label}
              </div>
            ))}
          </div>

          {loading && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-11 gap-4 px-5 py-3.5">
                  {[1,3,2,2,1,1,1].map((span, idx) => (
                    <div key={idx} className={`col-span-${span}`}>
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="px-5 py-6 text-sm text-rose-600 dark:text-rose-300">{error}</div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-sm">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3.5">
                <span className="material-symbols-outlined text-gray-400 text-xl">list_alt</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">데이터가 없습니다</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">페이지 크기를 변경해 보세요.</p>
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((r) => {
              const id           = r?.id;
              const testCode     = r?.code ?? "-";
              const testName     = r?.testName ?? "-";
              const platform     = r?.appPlatformType ?? "-";
              const appName      = r?.testAppName ?? "-";
              const deviceOsType = r?.deviceOsType ?? "-";
              const creatorName  = r?.creatorName ?? "-";

              // running 값으로 판정
              const isRunning = Boolean(r?.running);
              const status = isRunning ? "RUNNING" : "READY";
              const canRun = !isRunning;

              return (
                <div key={id} className="group">
                  <div className="grid grid-cols-11 gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="col-span-1 text-gray-900 dark:text-gray-100">{id}</div>

                    <div className="col-span-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-800 dark:text-gray-200 font-medium truncate" title={testCode}>
                          {testCode}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 truncate" title={testName}>
                          {testName}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{platform}</span>
                        <span className="text-gray-600 dark:text-gray-400 truncate" title={appName}>
                          {appName}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-gray-400">smartphone</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate" title={deviceOsType}>
                          {deviceOsType}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <span className="text-gray-700 dark:text-gray-300 truncate" title={creatorName}>
                        {creatorName}
                      </span>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={status} />
                      </div>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <button
                        type="button"
                        onClick={() => canRun && openPicker(id)}
                        disabled={!canRun}
                        className={[
                          "inline-flex items-center justify-center rounded-lg w-8 h-8 transition",
                          canRun
                            ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            : "text-gray-300 cursor-not-allowed",
                        ].join(" ")}
                        title={canRun ? "실행" : "실행 중에는 다시 실행할 수 없습니다"}
                      >
                        <span className="material-symbols-outlined text-base">play_arrow</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            </div>
          )}
        </div>

        <PaginationBar
          page={page}
          totalPages={data?.totalPages ?? 1}
          size={size}
          totalElements={data?.totalElements}
          unitLabel="개 항목"
          onPageChange={(next) => setPage(next)}
          onSizeChange={(nextSize) => { setSize(nextSize); setPage(1); }}
        />
      </div>
      {
        pickerOpen && (
          <DeviceSelectModal onClose={closePicker} onConfirm={handlePick} />
        )
      }
    </>
  );
}
