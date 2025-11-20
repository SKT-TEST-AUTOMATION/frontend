import { createRoot } from "react-dom/client";
import "./index.css";
import { RecoilRoot } from "recoil";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import ToastPortal from "./shared/components/ToastPortal.jsx";

createRoot(document.getElementById("root")).render(
  <RecoilRoot>
    <RouterProvider router={router} />
    <ToastPortal />
  </RecoilRoot>
);