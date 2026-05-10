import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // 🌟 THÊM ĐOẠN PROXY NÀY VÀO ĐỂ VITE BIẾT ĐƯỜNG TRUYỀN DỮ LIỆU XUỐNG BACKEND
    proxy: {
      "/api": {
        target: "http://localhost:5043", // ĐỔI SỐ NÀY THÀNH PORT BACKEND C# CỦA BẠN (ví dụ: 5114, 5253...)
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));