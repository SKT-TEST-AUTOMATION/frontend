import React from "react";

function LiveIndicator({ color = "bg-rose-500" , active = false}) {
  if (!active) return null;
  return (
    <span className="relative inline-flex h-2 w-2">
      {/* 바깥에 퍼지는 동그라미 */}
      <span
        className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-40 animate-ping`}
      />
      {/* 중앙 꽉 찬 동그라미 */}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${color}`}
      />
    </span>
  );
}

export default LiveIndicator;