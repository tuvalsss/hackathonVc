/**
 * Simple logger utility for CRE Workflow
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = "AutoSentinel", level: LogLevel = "info") {
    this.prefix = prefix;
    this.level = (process.env.LOG_LEVEL as LogLevel) || level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    return `[${timestamp}] [${levelStr}] [${this.prefix}] ${message}`;
  }

  debug(message: string): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message));
    }
  }

  info(message: string): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message));
    }
  }

  warn(message: string): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message));
    }
  }

  error(message: string): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message));
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export const logger = new Logger();
export { Logger, LogLevel };
