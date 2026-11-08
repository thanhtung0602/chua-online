module.exports = {
  apps: [
    {
      name: "chua-an-lac-online",
      script: "npm",
      args: "start",
      instances: 1, // In-memory socket.io dùng 1 instance (hoặc nhiều instances với Redis adapter)
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      // Hỗ trợ Zero-Downtime Reload (PM2 reload)
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 8000,
    },
  ],
};
