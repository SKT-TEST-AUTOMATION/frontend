import { useCallback } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { toastState } from "../state/toastState";

/** 반환: { toast, showToast(type,msg), clearToast } */
export function useToast() {
  const [toast, setToast] = useRecoilState(toastState);

  const showToast = useCallback((type, message) => {
    setToast({ type, message, createdAt: Date.now() });
  }, [setToast]);

  const clearToast = useCallback(() => {
    setToast(null);
  }, [setToast]);

  return { toast, showToast, clearToast };
}

/** 전역에서 간단 호출하고 싶을 때 */
export function useToastSetter() {
  const set = useSetRecoilState(toastState);
  return useCallback((type, message) => set({ type, message, createdAt: Date.now() }), [set]);
}
