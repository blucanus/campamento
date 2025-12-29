import mongoose from "mongoose";
import { env } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: any;
}

global._mongoose = global._mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (global._mongoose.conn) return global._mongoose.conn;
  if (!global._mongoose.promise) {
    if (!env.MONGODB_URI) throw new Error("Missing MONGODB_URI");
    global._mongoose.promise = mongoose.connect(env.MONGODB_URI).then((m) => m);
  }
  global._mongoose.conn = await global._mongoose.promise;
  return global._mongoose.conn;
}
