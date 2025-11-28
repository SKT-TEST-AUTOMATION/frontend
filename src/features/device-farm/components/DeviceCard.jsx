import React from "react";
import { IconAndroid, IconApple, IconMobile } from "./DeviceFarmIcons.jsx";

const StatusBadge = ({ available, offline, busy }) => {
  if (offline) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Offline
      </span>
    );
  }
  if (busy) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Busy
      </span>
    );
  }
  if (available) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      Unknown
    </span>
  );
};

export default function DeviceCard({ device, actionButton, onClick }) {
  const isIOS = device.platform === "IOS"

  return (
    <div onClick={onClick} className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300 cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              isIOS ? "bg-slate-900 text-white" : "bg-green-600 text-white"
            }`}
          >
            {isIOS ? (
              <IconApple className="h-6 w-6" />
            ) : (
              <IconAndroid className="h-6 w-6" />
            )}
          </div>
          <div>
            <h4
              className="text-sm font-semibold text-slate-900 line-clamp-1"
              title={device.name}
            >
              {device.name}
            </h4>
            <div className="mt-0.5 text-xs text-slate-500 font-mono">
              {device.udid.slice(0, 16)}
              {device.udid.length > 16 && "..."}
            </div>
          </div>
        </div>
        <StatusBadge
          available={device.available}
          offline={device.offline}
          busy={device.busy}
        />
      </div>

      <div className="mt-5 space-y-2 border-t border-slate-100 pt-3">
        {(device.connectedIp || device.appiumHost) && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Host</span>
            <span className="font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">
              {device.connectedIp || `device.appiumHost:${device.appiumPort}`}
            </span>
          </div>
        )}

        {device.systemPort && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">System Port</span>
            <span className="font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">
              {device.systemPort}
            </span>
          </div>
        )}
      </div>

      {actionButton && <div className="mt-4 pt-2">{actionButton}</div>}
    </div>
  );
}
