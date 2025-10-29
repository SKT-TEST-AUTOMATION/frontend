import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env 파일의 환경 변수 로드
  const env = loadEnv(mode, process.cwd(), "");

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
    base: "./",
    build: {
      target: "es2018",
    },
    define: {
      // ⚙️ react-snap 실행 시 REACT_SNAP 환경 변수를 명시적으로 주입
      "import.meta.env.REACT_SNAP": JSON.stringify(env.REACT_SNAP === "true"),
    },
  };
});
