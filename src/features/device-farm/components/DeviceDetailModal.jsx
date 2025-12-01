// DeviceDetailModal.jsx
import React, { useState, useEffect } from "react";
import { updateDevice } from "../../../services/deviceAPI.js";
import { IconX, IconApple, IconAndroid } from "./DeviceFarmIcons.jsx";

export default function DeviceDetailModal({ open, onClose, device, onSaved }) {
  const [name, setName] = useState("");
  const [systemPort, setSystemPort] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && device) {
      setName(device.name || "");
      setSystemPort(device.systemPort ? String(device.systemPort) : "");
      setError(null);
    }
  }, [open, device]);

  if (!open || !device) return null;

  const isIOS = device.platform === "IOS";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const trimmed = systemPort.trim();
    const portNumber = trimmed === "" ? null : parseInt(trimmed, 10);

    if (trimmed !== "" && (Number.isNaN(portNumber) || !Number.isFinite(portNumber))) {
      setError("System Port must be a number");
      setSaving(false);
      return;
    }

    try {
      await updateDevice(device.udid, {
        name: name.trim(),
        systemPort: portNumber,
      });
      onSaved && onSaved();
      onClose && onClose();
    } catch (err) {
      setError(err?.message || "Failed to update device");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 transition-all animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                isIOS ? "bg-slate-900 text-white" : "bg-green-600 text-white"
              }`}
            >
              {isIOS ? (
                <IconApple className="h-7 w-7" />
              ) : (
                <IconAndroid className="h-7 w-7" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {name || device.udid}
              </h3>
              <p className="text-sm text-slate-500 font-mono">{device.udid}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row">
          {/* Left Column: Read-only Info */}
          <div className="w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-6 space-y-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </span>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    device.available
                      ? "bg-emerald-500"
                      : device.busy
                        ? "bg-amber-500"
                        : "bg-slate-400"
                  }`}
                />
                <span className="text-sm font-medium text-slate-700">
                  {device.available
                    ? "Available"
                    : device.busy
                      ? "Busy"
                      : "Offline"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Platform
              </span>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {device.platform}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Host
              </span>
              <p className="mt-1 text-sm font-mono text-slate-600 break-all">
                {device.connectedIp || device.appiumHost || "N/A"}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Appium Port
              </span>
              <p className="mt-1 text-sm font-mono text-slate-600">
                {device.appiumPort || "4723"}
              </p>
            </div>
          </div>

          {/* Right Column: Editable Form */}
          <form
            onSubmit={handleSubmit}
            className="w-full md:w-2/3 p-6 space-y-5"
          >
            <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              Edit Configuration
            </h4>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                디바이스 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Friendly name..."
              />
              <p className="mt-1 text-xs text-slate-400">
                디바이스를 구분하기 위한 이름을 설정하세요.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                System Port
              </label>
              <input
                type="text"
                value={systemPort}
                onChange={(e) => setSystemPort(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 8201"
                disabled={true}
              />
              <p className="mt-1 text-xs text-slate-400">
                이 시스템 포트를 사용하여 세션에 연결됩니다.
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
