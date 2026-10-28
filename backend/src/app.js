import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { env } from "./config/env.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware.js";
import apiRoutes from "./routes/index.js";
import { apiTimingMiddleware } from "./utils/request-timing.js";

const app = express();

app.disable("x-powered-by");

if (env.trustProxy) {
  app.set("trust proxy", 1);
}

function isSameOriginRequest(req, origin) {
  try {
    const requestOrigin = `${req.protocol}://${req.get("host")}`;
    return new URL(origin).origin === new URL(requestOrigin).origin;
  } catch {
    return false;
  }
}

function isAllowedCorsOrigin(req) {
  const origin = req.header("Origin");
  if (!origin) {
    return false;
  }

  if (env.clientOrigins === true) {
    return true;
  }

  if (Array.isArray(env.clientOrigins) && env.clientOrigins.includes(origin)) {
    return true;
  }

  return env.serveFrontend && isSameOriginRequest(req, origin);
}

app.use(
  cors((req, callback) => {
    callback(null, {
      origin: isAllowedCorsOrigin(req),
      credentials: true
    });
  })
);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(express.json({ limit: env.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.requestBodyLimit }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Finrep API", at: new Date().toISOString() });
});

app.use("/api", apiTimingMiddleware, apiRoutes);

if (env.serveFrontend) {
  const frontendDistPath = path.isAbsolute(env.frontendDistPath)
    ? env.frontendDistPath
    : path.resolve(env.backendRoot, env.frontendDistPath);
  const indexPath = path.join(frontendDistPath, "index.html");

  if (fs.existsSync(indexPath)) {
    app.use(
      express.static(frontendDistPath, {
        index: false,
        maxAge: env.nodeEnv === "production" ? "1y" : 0,
        setHeaders(res, filePath) {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        }
      })
    );

    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res, next) => {
      res.sendFile(indexPath, (error) => {
        if (error) {
          next(error);
        }
      });
    });
  } else {
    console.warn(`Frontend build not found at ${indexPath}. Only API routes will be served.`);
  }
}

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;

