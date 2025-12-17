// src/features/devices/pages/DeviceFarmPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getDevices } from "../../services/deviceAPI.js";
import { useDeviceFarm } from "./hooks/useDeviceFarm.js";
import DeviceCard from "./components/DeviceCard";
import RegisterModal from "./components/RegisterModal";
import { IconRefresh, IconSearch, IconPlus, IconMobile } from "./components/DeviceFarmIcons";
import DeviceStatusChart from "./components/DeviceStatusChart.jsx";
import DeviceDetailModal from "./components/DeviceDetailModal.jsx";
import PageHeader from "../../shared/components/PageHeader.jsx";

export default function DeviceFarmPage() {
  // 1. Live Data (Appium Polling) - "The Truth of State"
  const {
    items: dfItems = [],
    loading: dfLoading,
    error: dfError,
    lastUpdatedAt,
    refresh,
    appiumHost,
  } = useDeviceFarm();

  // 2. Persistent Data (Backend API) - "The Truth of Inventory"
  const [beLoading, setBeLoading] = useState(true);
  const [beError, setBeError] = useState(null);
  const [beItems, setBeItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBackend = useCallback(async () => {
    setBeLoading(true);
    setBeError(null);
    try {
      const controller = new AbortController();
      const res = await getDevices(
        { page: 0, size: 100, sort: "udid,desc" },
        controller.signal
      );
      console.log(res);
      // getDevices 가 페이지 객체를 반환한다고 가정 (res.content)
      setBeItems(res.content || []);
    } catch (err) {
      setBeError(err?.message || "Failed to fetch registered devices");
    } finally {
      setBeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackend();
  }, [fetchBackend]);

  // 3. Merging Logic
  const dfByUdid = useMemo(() => {
    const m = new Map();
    for (const d of dfItems) {
      if (d?.udid) m.set(d.udid, d);
    }
    return m;
  }, [dfItems]);

  const registeredDevices = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();

    return beItems
      .map((b) => {
        const live = dfByUdid.get(b.udid);
        const platformSource = b.deviceOsType || live?.platform || "";
        const platform = platformSource.toUpperCase().includes("IOS")
          ? "IOS"
          : "ANDROID";

        const name = b.name || live?.name || b.udid || "";

        if (
          term &&
          !name.toLowerCase().includes(term) &&
          !(b.udid || "").toLowerCase().includes(term)
        ) {
          return null;
        }

        return {
          udid: b.udid,
          name,
          platform,
          available: !!live?.available,
          offline: !live || !!live?.offline, // live 정보 없으면 offline
          busy: !!live?.busy,
          appiumHost: live?.appiumHost,
          appiumPort: live?.appiumPort || b.appiumPort,
          systemPort:  b.systemPort || live?.systemPort,
          basePath: live?.basePath,
          connectedIp: live?.connectedIp || b.connectedIp,
          isRegistered: true,
        };
      })
      .filter(Boolean);
  }, [beItems, dfByUdid, searchTerm]);

  const unregisteredDevices = useMemo(() => {
    const setBE = new Set(beItems.map((b) => b.udid));
    const term = (searchTerm || "").toLowerCase();

    return dfItems
      .filter((d) => !setBE.has(d.udid))
      .map((d) => {
        const platform = (d.platform || "").toUpperCase().includes("IOS")
          ? "IOS"
          : "ANDROID";

        const name = d.name || d.udid || "";

        if (
          term &&
          !name.toLowerCase().includes(term) &&
          !(d.udid || "").toLowerCase().includes(term)
        ) {
          return null;
        }

        return {
          udid: d.udid,
          name,
          platform,
          available: d.available,
          offline: d.offline,
          busy: d.busy,
          appiumHost: d.appiumHost,
          appiumPort: d.appiumPort,
          systemPort: d.systemPort,
          basePath: d.basePath,
          connectedIp: d.connectedIp,
          isRegistered: false,
        };
      })
      .filter(Boolean);
  }, [beItems, dfItems, searchTerm]);

  // ✅ 등록된 ANDROID / IOS 개수
  const androidCount = useMemo(
    () => registeredDevices.filter((d) => d.platform === "ANDROID").length,
    [registeredDevices]
  );
  const iosCount = useMemo(
    () => registeredDevices.filter((d) => d.platform === "IOS").length,
    [registeredDevices]
  );

  // 4. Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const handleOpenRegister = (device) => {
    setSelectedDevice(device);
    setModalOpen(true);
  };

  const handleRegisterSuccess = async () => {
    await fetchBackend();
    // Live 상태도 같이 새로 고침
    refresh();
  };

  // 5. Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRegisteredDevice, setSelectedRegisteredDevice] =
    useState(null);

  const handleOpenDetail = (d) => {
    setSelectedRegisteredDevice(d);
    setDetailModalOpen(true);
  };

  const handleSuccess = async () => {
    await fetchBackend();
    // Ideally we also force a live refresh, though fetchBackend is most critical here
    await refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
        {/* Top Navigation / Header */}
        <PageHeader
          title="디바이스 관리"
          subtitle="테스트에 사용하는 디바이스를 등록하고 관리합니다."
          actions={
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          lastUpdatedAt ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {lastUpdatedAt
                        ? `Synced ${new Date(
                          lastUpdatedAt
                        ).toLocaleTimeString()}`
                        : "Connecting..."}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-1 hidden md:flex">
                    <button
                      onClick={() => {
                        refresh();
                        fetchBackend();
                      }}
                      className="group relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
                      title="Refresh Data"
                    >
                      <IconRefresh
                        className={`h-3.5 w-3.5 ${
                          dfLoading || beLoading ? "animate-spin" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
          }
        />

        <main className="space-y-8">
          {/* Errors */}
          {(dfError || beError) && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex gap-3">
                <div className="shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-sm text-red-700">
                  <p className="font-medium">System Alert</p>
                  {dfError && <p>Appium 서버를 확인해주세요.</p>}
                  {beError && <p>Registry API: {beError}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Stats & Mini Dashboard */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. 기존 Mini Dashboard 카드 (그대로 유지) */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-left">
                <div className="text-sm text-slate-500 font-medium">
                  Total Registered
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {registeredDevices.length}
                </div>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div className="flex items-center gap-2">
                <DeviceStatusChart devices={registeredDevices} />
              </div>
            </div>

            {/* 2. Android 카드 */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-left">
                <div className="text-sm text-slate-500 font-medium">
                  Android
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {androidCount}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  등록된 Android 디바이스
                </div>
              </div>
            </div>

            {/* 3. iOS 카드 */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-left">
                <div className="text-sm text-slate-500 font-medium">
                  iOS
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {iosCount}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  등록된 iOS 디바이스
                </div>
              </div>
            </div>
          </section>

          {/* Registered Devices Grid */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                등록된 기기
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {registeredDevices.length}
                </span>
              </h2>
            </div>

            {beLoading && registeredDevices.length === 0 ? (
              <div className="h-64 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                로딩 중 . . .
              </div>
            ) : registeredDevices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                <IconMobile className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">
                  등록된 기기가 없습니다.
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  아래는 Appium에 의해 감지된 디바이스 목록입니다.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {registeredDevices.map((device) => (
                  <React.Fragment key={device.udid}>
                    <DeviceCard
                      device={device}
                      onClick={() => handleOpenDetail(device)}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}
          </section>

          {/* Unregistered Devices Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                새로운 기기
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {unregisteredDevices.length}
                </span>
              </h2>
            </div>

            {dfLoading && unregisteredDevices.length === 0 ? (
              <div className="text-sm text-slate-500 italic">
                디바이스 로딩 중 . . .
              </div>
            ) : unregisteredDevices.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
                <p className="text-sm text-slate-500">
                  모든 연결된 기기가 등록되었습니다.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {unregisteredDevices.map((device) => (
                  <React.Fragment key={device.udid}>
                    <DeviceCard
                      device={device}
                      actionButton={
                        <button
                          onClick={() => handleOpenRegister(device)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:border-blue-300"
                        >
                          <IconPlus className="h-4 w-4" />
                          기기 등록
                        </button>
                      }
                    />
                  </React.Fragment>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* Modal */}
        <RegisterModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initial={selectedDevice}
          onSaved={handleRegisterSuccess}
        />

        {/* Detail/Edit Modal */}
        <DeviceDetailModal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          device={selectedRegisteredDevice}
          onSaved={handleSuccess}
        />
      </div>
    </>
  );
}
