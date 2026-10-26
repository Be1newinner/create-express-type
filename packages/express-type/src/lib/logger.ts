import pino from "pino";

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

/**
 * Global Pino logger instance.
 *
 * In development, uses pino-pretty for human-readable, colorized output.
 * In production, outputs structured JSON (ready for Datadog, CloudWatch, Loki, etc.).
 * Silent during tests unless LOG_LEVEL is set.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? "silent" : isDev ? "debug" : "info"),
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
