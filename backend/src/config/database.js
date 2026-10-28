import mongoose from "mongoose";
import dns from "node:dns";
import { trackTiming } from "../utils/request-timing.js";
import { assertEnv, env } from "./env.js";

let timingInstalled = false;

export async function connectDatabase() {
  assertEnv();

  mongoose.set("strictQuery", true);
  if (env.dnsServers?.length) {
    dns.setServers(env.dnsServers);
  }

  installMongooseTiming();
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000
  });

  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

function installMongooseTiming() {
  if (timingInstalled) return;
  timingInstalled = true;

  const originalQueryExec = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = function timedQueryExec(...args) {
    return trackTiming("db", () => originalQueryExec.apply(this, args));
  };

  const originalAggregateExec = mongoose.Aggregate.prototype.exec;
  mongoose.Aggregate.prototype.exec = function timedAggregateExec(...args) {
    return trackTiming("db", () => originalAggregateExec.apply(this, args));
  };

  const originalSave = mongoose.Model.prototype.save;
  mongoose.Model.prototype.save = function timedSave(...args) {
    return trackTiming("db", () => originalSave.apply(this, args));
  };
}
