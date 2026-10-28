import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { ensureSuperAdmin } from "./seeds/super-admin.seed.js";

let server;
let shuttingDown = false;

async function bootstrap() {
  await connectDatabase();
  await ensureSuperAdmin();

  server = app.listen(env.port, env.host, () => {
    console.log(`Finrep API listening on http://${env.host}:${env.port} (${env.nodeEnv})`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received. Shutting down Finrep API...`);

  if (server) {
    await new Promise((resolve) => {
      server.close((error) => {
        if (error) {
          console.error("Error while closing HTTP server", error);
        }
        resolve();
      });
    });
  }

  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

bootstrap().catch((error) => {
  console.error("Failed to start Finrep API", error);
  process.exit(1);
});

