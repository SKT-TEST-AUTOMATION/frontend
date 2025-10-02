import React from "react";

export default function ErrorAlert({ title = "에러", message, className = "" }) {
  return (
    <div className={`border border-rose-200 bg-rose-50 px-6 py-5 text-rose-700 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined">error</span>
        <div>
          <div className="font-semibold">{title}</div>
          {message && <div className="text-sm mt-1">{message}</div>}
        </div>
      </div>
    </div>
  );
}
