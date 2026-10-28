module.exports = {
  apps: [
    {
      name: "finrep",
      cwd: ".",
      script: "src/server.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "development",
        HOST: "0.0.0.0",
        PORT: 4100,
        SERVE_FRONTEND: "false"
      },
      env_production: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: 4100,
        TRUST_PROXY: "true",
        SERVE_FRONTEND: "true",
        FRONTEND_DIST_PATH: "../frontend/dist"
      }
    }
  ]
};

