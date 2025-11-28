import React, { useState, useEffect } from "react";
import { createDevice } from "../../../services/deviceAPI.js";
import { IconX } from "./DeviceFarmIcons.jsx";

export default function RegisterModal({ open, onClose, initial, onSaved }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && initial) {
      setName(initial.name || "");
      setError(null);
    }
  }, [open, initial]);

  if (!open || !initial) return null;

  const displayAppiumPort = initial.appiumPort ?? 4723;
  const displaySystemPort = initial.systemPort ?? null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      udid: initial.udid,
      name: (name && name.trim()) || initial.udid,
      deviceOsType: initial.platform === "IOS" ? "IOS" : "ANDROID",
      systemPort: initial.systemPort ?? null,
      appiumPort: initial.appiumPort ?? 4723,
      connectedIp: initial.connectedIp || initial.appiumHost || "127.0.0.1",
    };

    try {
      await createDevice(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError((err && err.message) || "Failed to register device");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 transition-all animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Register Device</h3>
            <p className="text-sm text-slate-500 mt-1">
              Add this device to your managed fleet.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 gap-5">
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-start gap-3">
              <span className="text-blue-600 font-semibold text-xs bg-blue-100 px-2 py-0.5 rounded uppercase mt-0.5">
                {initial.platform}
              </span>
              <div className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">{initial.udid}</span>
                <br />
                Detected on{" "}
                <span className="font-mono text-xs text-slate-500">
                  {initial.appiumHost}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Device Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. QA Pixel 6 #1"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Appium Port
                </label>
                <input
                  type="text"
                  value={String(displayAppiumPort)}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  System Port
                </label>
                <input
                  type="text"
                  value={
                    displaySystemPort !== null
                      ? String(displaySystemPort)
                      : "Auto"
                  }
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
          >
            {saving && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {saving ? "Registering..." : "Confirm Registration"}
          </button>
        </div>
      </div>
    </div>
  );
}
