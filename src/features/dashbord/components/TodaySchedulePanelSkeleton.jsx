import React from "react";

function TodaySchedulePanelSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {/* 헤더 영역 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-44 animate-pulse rounded bg-slate-50" />
        </div>
        <div className="h-7 w-20 animate-pulse rounded-full bg-slate-50" />
      </div>

      {/* 섹션들 */}
      <div className="mt-2 space-y-4">
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    </div>
  );
}

/**
 * 섹션 1개(제목 + 우측 건수 + 내용 박스) 스켈레톤
 * - 내용 박스 안에 3개의 아이템 스켈레톤
 */
function SectionSkeleton() {
  return (
    <div>
      {/* 섹션 헤더 (제목 / 건수) */}
      <div className="mb-2 flex items-center justify-between">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-8 animate-pulse rounded bg-slate-50" />
      </div>

      {/* 섹션 내용 (스크롤 영역 자리) */}
      <div className="max-h-56 overflow-hidden rounded-2xl bg-slate-50/70 px-2 py-2">
        <div className="space-y-1.5">
          <ItemSkeleton />
          <ItemSkeleton />
          <ItemSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * 리스트 아이템 1개 스켈레톤
 * - 왼쪽: 제목/서브텍스트 자리
 * - 오른쪽: 시간/상태 배지 자리
 */
function ItemSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
      <div className="min-w-0 space-y-1">
        <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-2.5 w-28 animate-pulse rounded bg-slate-50" />
      </div>
      <div className="ml-3 flex flex-col items-end gap-1">
        <div className="h-2.5 w-12 animate-pulse rounded bg-slate-50" />
        <div className="h-4 w-12 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export default TodaySchedulePanelSkeleton;