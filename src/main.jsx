import { createRoot } from "react-dom/client";
import "./index.css";
import { RecoilRoot } from "recoil";
import { RouterProvider, createStaticRouter } from "react-router-dom";
import { router, routes } from "./router.jsx";
import ToastPortal from "./shared/components/ToastPortal.jsx";

let routerToUse = router;

if (import.meta.env.REACT_SNAP) {
  try {
    routerToUse = createStaticRouter(routes, {
      basename: "/",
      location: "/testcases",
    });
    console.log("[react-snap] StaticRouter 활성화됨");
  } catch (err) {
    console.error("[react-snap] StaticRouter 초기화 실패:", err);
  }
}

createRoot(document.getElementById("root")).render(
  <RecoilRoot>
    <RouterProvider router={routerToUse} />
    <ToastPortal />
  </RecoilRoot>
);
