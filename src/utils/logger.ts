type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  message: string;
  context?: any;
  error?: Error | any;
}

export const logger = {
  log: (level: LogLevel, payload: LogPayload) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message: payload.message,
      context: payload.context,
      error: payload.error instanceof Error ? {
        message: payload.error.message,
        stack: payload.error.stack,
        name: payload.error.name,
      } : payload.error,
    };

    // In a production environment, this would forward to Sentry, Datadog, or CloudWatch.
    // For Vercel, standard console output is captured by Vercel Runtime Logs.
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  },

  info: (message: string, context?: any) => logger.log('info', { message, context }),
  warn: (message: string, context?: any) => logger.log('warn', { message, context }),
  error: (message: string, error?: any, context?: any) => logger.log('error', { message, error, context }),
};
