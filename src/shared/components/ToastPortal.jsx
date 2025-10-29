import * as React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRecoilState } from "recoil";

import Toast from "./Toast";
import { toastState } from "../state/toastState";

/**
 * Global Toast Portal
 * - Creates #toast-root if missing and renders <Toast/> into it
 * - Reads the recoil toast atom and passes it down
 */
export default function ToastPortal({ autoHideMs = 2500, containerId = "toast-root" }) {
  const [toast, setToast] = useRecoilState(toastState);
  const [hostEl, setHostEl] = useState(null);

  // Ensure portal host exists once
  useEffect(() => {
    let node = document.getElementById(containerId);
    if (!node) {
      node = document.createElement("div");
      node.id = containerId;
      document.body.appendChild(node);
    }
    setHostEl(node);
  }, [containerId]);

  if (!hostEl) return null;

  const effective = typeof toast?.autoHideMs === "number" ? toast.autoHideMs : autoHideMs;
  const handleClose = () => setToast(null);

  return createPortal(
    toast ? (
      <Toast toast={toast} onClose={handleClose} autoHideMs={effective} />
    ) : null,
    hostEl
  );
}
