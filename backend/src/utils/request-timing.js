import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

const requestTiming = new AsyncLocalStorage();

export function apiTimingMiddleware(req, res, next) {
  const state = {
    startMs: performance.now(),
    dbMs: 0,
    dbCount: 0,
    providerMs: 0,
    providerCount: 0
  };

  requestTiming.run(state, () => {
    res.on("finish", () => {
      const totalMs = performance.now() - state.startMs;
      console.info(
        `[api-timing] ${req.method} ${req.originalUrl} ${res.statusCode} total=${formatMs(totalMs)} db=${formatMs(state.dbMs)} dbOps=${state.dbCount} provider=${formatMs(state.providerMs)} providerOps=${state.providerCount}`
      );
    });
    next();
  });
}

export function addTiming(kind, ms) {
  const state = requestTiming.getStore();
  if (!state || !Number.isFinite(ms)) return;

  if (kind === "provider") {
    state.providerMs += ms;
    state.providerCount += 1;
    return;
  }

  state.dbMs += ms;
  state.dbCount += 1;
}

export async function trackTiming(kind, operation) {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    addTiming(kind, performance.now() - startedAt);
  }
}

function formatMs(value) {
  return `${Math.round(value)}ms`;
}
