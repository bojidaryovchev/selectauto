/**
 * Structured JSON logging + lightweight timing for the ingestion Lambdas.
 *
 * Why JSON: CloudWatch Logs Insights can filter/aggregate structured fields
 * directly (e.g. `fields @timestamp, durationMs | filter event="upsert_page"
 * | stats avg(durationMs) by flowType`). Plain console.log of objects is not
 * queryable the same way.
 *
 * Each log line is a single JSON object: { level, msg, ...context, ...fields }.
 * A logger carries persistent context (flowType, syncRunId, page) so every line
 * from a handler is automatically correlated to its sync run.
 *
 * This pairs with the nodejs20.x Lambda JSON LoggingConfig (set in
 * infra/src/lambdas.ts): the runtime already emits JSON envelopes for
 * level/timestamp/requestId, and our payloads slot in cleanly.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  flowType?: string;
  mode?: string;
  syncRunId?: number;
  page?: number;
  [key: string]: unknown;
}

export class Logger {
  constructor(private readonly context: LogContext = {}) {}

  /** Return a new logger with additional persistent context merged in. */
  child(extra: LogContext): Logger {
    return new Logger({ ...this.context, ...extra });
  }

  private emit(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
    const line = { level, msg, ...this.context, ...(fields ?? {}) };
    // Route to the matching console method so the Lambda runtime tags the level.
    const serialized = safeStringify(line);
    if (level === "error") console.error(serialized);
    else if (level === "warn") console.warn(serialized);
    else console.log(serialized);
  }

  debug(msg: string, fields?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === "debug") this.emit("debug", msg, fields);
  }
  info(msg: string, fields?: Record<string, unknown>): void {
    this.emit("info", msg, fields);
  }
  warn(msg: string, fields?: Record<string, unknown>): void {
    this.emit("warn", msg, fields);
  }
  error(msg: string, fields?: Record<string, unknown>): void {
    this.emit("error", msg, fields);
  }

  /**
   * Time an async operation. Logs `<name>` with durationMs on success, or
   * `<name>_failed` with durationMs + error on throw (then rethrows).
   * Returns the operation's result.
   */
  async time<T>(name: string, fn: () => Promise<T>, fields?: Record<string, unknown>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      this.info(name, { ...fields, durationMs: round(performance.now() - start) });
      return result;
    } catch (err) {
      this.error(`${name}_failed`, {
        ...fields,
        durationMs: round(performance.now() - start),
        error: (err as Error).message,
        errorName: (err as Error).name,
      });
      throw err;
    }
  }
}

/** Build a logger from a Lambda event that carries sync context. */
export function loggerFromState(state: {
  flowType?: string;
  mode?: string;
  syncRunId?: number;
  page?: number;
}): Logger {
  return new Logger({
    flowType: state.flowType,
    mode: state.mode,
    syncRunId: state.syncRunId,
    page: state.page,
  });
}

function round(ms: number): number {
  return Math.round(ms * 100) / 100;
}

/** JSON.stringify that won't throw on circular refs / BigInt. */
function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  } catch {
    return JSON.stringify({ level: "error", msg: "log_serialize_failed" });
  }
}
