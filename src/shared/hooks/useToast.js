import { useCallback } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { toastState } from "../state/toastState";

/**
 * Toast payload shape
 * {
 *   id?: string,
 *   type: 'info'|'success'|'warn'|'error',
 *   message: string,
 *   detailMessage?: string,
 *   autoHideMs?: number,
 *   createdAt?: number
 * }
 */
function makeToastPayload(args) {
  let payload = {};
  if (typeof args[0] === "object" && args[0] !== null) {
    // Object form: showToast({ type, message, detailMessage, ... })
    payload = { ...args[0] };
  } else {
    // Positional form (backward compatible): showToast(type, message, detailMessage?, options?)
    const [type, message, detailMessage, options] = args;
    payload = { type, message, detailMessage, ...(options || {}) };
  }
  if (!payload.type) payload.type = "info";
  if (!payload.message) payload.message = "";
  if (!payload.id) payload.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  payload.createdAt = Date.now();
  return payload;
}

/** 반환: { toast, showToast, showError, showSuccess, showInfo, showWarn, clearToast } */
export function useToast() {
  const [toast, setToast] = useRecoilState(toastState);

  const showToast = useCallback((...args) => {
    setToast(makeToastPayload(args));
  }, [setToast]);

  const showError = useCallback((message, detailMessage, options) => {
    setToast(makeToastPayload([{ type: "error", message, detailMessage, ...(options || {}) }]));
  }, [setToast]);

  const showSuccess = useCallback((message, detailMessage, options) => {
    setToast(makeToastPayload([{ type: "success", message, detailMessage, ...(options || {}) }]));
  }, [setToast]);

  const showInfo = useCallback((message, detailMessage, options) => {
    setToast(makeToastPayload([{ type: "info", message, detailMessage, ...(options || {}) }]));
  }, [setToast]);

  const showWarn = useCallback((message, detailMessage, options) => {
    setToast(makeToastPayload([{ type: "warn", message, detailMessage, ...(options || {}) }]));
  }, [setToast]);

  const clearToast = useCallback(() => {
    setToast(null);
  }, [setToast]);

  return { toast, showToast, showError, showSuccess, showInfo, showWarn, clearToast };
}

/** 전역에서 간단 호출하고 싶을 때 */
export function useToastSetter() {
  const set = useSetRecoilState(toastState);
  return useCallback((...args) => set(makeToastPayload(args)), [set]);
}
