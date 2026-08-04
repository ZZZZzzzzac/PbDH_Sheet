import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // 整次 e2e 上限：Windows 上失败测试 teardown 偶发挂起时强制退出，避免无限等待。
  globalTimeout: 5 * 60 * 1000,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  // 8 workers 并行时 daggerheart-core 加载超时导致 flaky，降到 4 保持负载稳定。
  workers: 4,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    // 直接以 node 启动 preview，不经 npm/npx 包装层：
    // Windows 上 npm/npx 进程树杀不干净会导致测试结束后 playwright 无限等待。
    command: "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/pbdh/",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
