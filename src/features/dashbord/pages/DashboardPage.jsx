// src/features/dashboard/pages/DashboardPage.jsx
import React, { useCallback } from "react";
import PageHeader from "../../../shared/components/PageHeader";
import TodaySummaryRow from "../components/TodaySummaryRow";
import { useDashboardData } from "../hooks/useDashboardData";
import TodaySchedulePanel from "../components/TodaySchedulePanel";
import TodaySchedulePanelSkeleton from "../components/TodaySchedulePanelSkeleton.jsx";
import LiveIndicator from "../../../shared/components/LiveIndicator.jsx";
import Heatmap from "../components/Heatmap.jsx";
import { useHeatmapData } from "../hooks/useHeatmapData.js";
import HeatmapDetailPanel from '../components/HeatmapDetailPanel.jsx';

function DashboardPage() {
  const {
    loading,
    initialized,
    summary,
    todayRuns,
    activeRuns,
    todaySchedules,
    refresh: refreshMain,
  } = useDashboardData();

  const heat = useHeatmapData({ autoLoad: true });

  const refreshAll = useCallback(() => {
    refreshMain();
    heat.load();
  }, [refreshMain, heat]);

  const toSummaryValue = (n) => {
    if (!initialized) return "-";
    if (n == null) return "-";
    return n;
  };

  const runningValue = toSummaryValue(summary.runningCount);
  const isRunningActive = typeof runningValue === "number" && Number.isFinite(runningValue) && runningValue > 0;

  const summaryItems = [
    { key: "today-completed", title: "오늘 완료된 테스트", value: toSummaryValue(summary.completedCount), badgeLabel: "오늘 기준", badgeVariant: "primary" },
    { key: "today-failed", title: "오늘 실패한 테스트", value: toSummaryValue(summary.failedCount), badgeLabel: "오늘 발생한 실패 횟수", badgeVariant: "danger" },
    {
      key: "running",
      title: (
        <span className="inline-flex items-center gap-1.5">
          <LiveIndicator active={isRunningActive} />
          <span>현재 실행중 테스트</span>
        </span>
      ),
      value: toSummaryValue(summary.runningCount),
      badgeLabel: "실시간 기준",
      badgeVariant: "success",
    },
    { key: "queued", title: "오늘 대기 중 테스트", value: toSummaryValue(summary.queuedCount), badgeLabel: "오늘 기준", badgeVariant: "warning" },
  ];

  return (
    <div className="px-8 py-6">
      <PageHeader
        title="대시보드"
        subtitle="오늘의 테스트 실행 현황과 품질 통계를 한눈에 확인하세요."
        actions={
          <button
            type="button"
            onClick={refreshAll}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            새로고침
          </button>
        }
      />

      <div className="mt-6">
        <TodaySummaryRow items={summaryItems} />
      </div>

      <div className="mt-8 mb-8">
        <Heatmap
          loading={heat.loading}
          initialized={heat.initialized}
          errorMessage={heat.errorMessage}
          heatmap={heat.heatmap}
          startDate={heat.startDate}
          endDate={heat.endDate}

          // ✅ 옵션 목록은 별도로 유지 (체크 해제해도 사라지지 않음)
          testOptions={heat.testOptions}

          // ✅ 체크 상태는 testIds로
          selectedTestIds={heat.selectedTestIds}

          onChangeRange={(s, e) => heat.setRange(s, e)}
          onChangeTestIds={(ids) => heat.setTestFilter(ids)}
          onQuickLast7={() => heat.setLast7Days()}
          onQuickLast30={() => heat.setLast30Days()}
          selectedCell={heat.selectedCell}
          onCellClick={(cell) => heat.setSelectedCell(cell)}
          onReload={() => heat.load()}
        />
        <HeatmapDetailPanel
          selectedCell={heat.selectedCell}
          loading={heat.detailLoading}
          errorMessage={heat.detailErrorMessage}
          runs={heat.detailRuns}
          onReload={() => heat.reloadSelectedCellDetail()}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
        <TodaySchedulePanelSkeleton />
        <TodaySchedulePanel
          loading={loading}
          todayRuns={todayRuns}
          activeRuns={activeRuns}
          todaySchedules={todaySchedules}
        />
      </div>
    </div>
  );
}

export default DashboardPage;