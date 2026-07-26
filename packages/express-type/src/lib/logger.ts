import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

/**
 * Global Pino logger instance.
 *
 * In development, uses pino-pretty for human-readable, colorized output.
 * In production, outputs structured JSON (ready for Datadog, CloudWatch, Loki, etc.).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
});
