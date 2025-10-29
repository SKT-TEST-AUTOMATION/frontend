import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 환경변수 로드 (process 없이)
  const env = loadEnv(mode, ".", "");

  return {
    server: {
      port: 3000,
      open: true,
      host: true,
      proxy: {
        "/api": {
          // target: "http://172.16.16.176:18080",
          target: "http://localhost:18080",
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],

    // GitHub Pages 대응 base 설정
    // Pages 배포 시 URL이 https://username.github.io/repo/ 형태이므로
    base: mode === "pages" ? "/frontend/" : "./",

    build: {
      target: "es2018",
    },

    define: {
      // react-snap 또는 pages 모드용 환경변수 주입
      "import.meta.env.REACT_SNAP": JSON.stringify(env.REACT_SNAP === "true"),
    },
  };
});