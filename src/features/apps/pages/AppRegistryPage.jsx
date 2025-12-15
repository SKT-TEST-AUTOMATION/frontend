import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageHeader from "../../../shared/components/PageHeader";
import AppCard from "../components/AppCard";
import AppUploadModal from "../components/AppUploadModal";
import { useToast } from "../../../shared/hooks/useToast";
import { toErrorMessage } from "../../../services/axios";
import { getApps } from '../../../services/appAPI.js';

// --- Icons ---
const IconRefresh = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const IconPlus = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const IconAndroid = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
  </svg>
);

const IconApple = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" className={className}>
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
  </svg>
);

const IconApps = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);


export default function AppRegistryPage() {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apps, setApps] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  // --- Data Fetching ---
  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getApps();
      setApps(res.content);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleOpenRegister = () => {
    setSelectedApp(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (app) => {
    setSelectedApp(app);
    setModalOpen(true);
  };

  const handleSaveSuccess = async () => {
    setModalOpen(false);

    // // 즉시 화면 반영(서버 재조회 전에 UI 업데이트)
    // if (saved?.id) {
    //   setApps((prev) => {
    //     const idx = prev.findIndex((a) => a.id === saved.id);
    //     if (idx >= 0) {
    //       const next = [...prev];
    //       next[idx] = saved;
    //       return next;
    //     }
    //     return [saved, ...prev];
    //   });
    // }

    // 서버 상태로 동기화
    await fetchApps();
  };

  const handleDelete = (appId) => {
    if(window.confirm('정말 삭제하시겠습니까?')) {
      setApps(prev => prev.filter(a => a.id !== appId));
      showSuccess('삭제되었습니다.');
    }
  };

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const total = apps.length;
    const android = apps.filter(a => a.osType === 'ANDROID').length;
    const ios = apps.filter(a => a.osType === 'IOS').length;
    return { total, android, ios };
  }, [apps]);

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm font-sans">
        {/* Header */}
        <PageHeader
          title="앱 관리"
          subtitle="테스트 자동화에 사용할 앱 정보를 등록하고 관리합니다."
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={fetchApps}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="새로고침"
              >
                <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleOpenRegister}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <IconPlus className="w-4 h-4" />
                앱 등록
              </button>
            </div>
          }
        />

        <main className="space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Stats Dashboard */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Apps */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-slate-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Apps</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                <IconApps className="w-6 h-6" />
              </div>
            </div>

            {/* Android Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-slate-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Android</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.android}</p>
                <p className="text-xs text-slate-400 mt-1">Registered Apps</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                <IconAndroid className="w-6 h-6" />
              </div>
            </div>

            {/* iOS Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-slate-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">iOS</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.ios}</p>
                <p className="text-xs text-slate-400 mt-1">Registered Apps</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-800 dark:text-gray-300">
                <IconApple className="w-5 h-5" />
              </div>
            </div>
          </section>

          {/* App List Grid */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                등록된 앱
                <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {stats.total}
                </span>
              </h2>
            </div>

            {loading && apps.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : apps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-12 text-center">
                <IconApps className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  등록된 앱이 없습니다
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  우측 상단의 '앱 등록' 버튼을 눌러 새 앱을 등록해주세요.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {apps.map(app => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onEdit={() => handleOpenEdit(app)}
                    onDelete={() => handleDelete(app.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <AppUploadModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaveSuccess}
          initialData={selectedApp}
        />
      </div>
    </>
  );
}
