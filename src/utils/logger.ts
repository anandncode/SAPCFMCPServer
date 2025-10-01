import winston from 'winston';

// Custom format for better error handling
const errorFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, error, stack, ...meta }) => {
    let log = `${timestamp} [${service}] ${level}: ${message}`;

    // Add error details if present
    if (error instanceof Error) {
      log += `\nError: ${error.message}`;
      if (error.stack) {
        log += `\nStack: ${error.stack}`;
      }
    } else if (error && typeof error === 'object') {
      log += `\nError Details: ${JSON.stringify(error, null, 2)}`;
    } else if (stack) {
      log += `\nStack: ${stack}`;
    }

    // Add any additional metadata
    const additionalMeta = { ...meta };
    delete additionalMeta.error;
    delete additionalMeta.stack;
    if (Object.keys(additionalMeta).length > 0) {
      log += `\nMetadata: ${JSON.stringify(additionalMeta, null, 2)}`;
    }

    return log;
  })
);

// Custom JSON format that properly serializes errors
const jsonErrorFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp(),
  winston.format.json({
    replacer: (key, value) => {
      // Properly serialize Error objects
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
          ...(value as any).code && { code: (value as any).code },
          ...(value as any).status && { status: (value as any).status },
          ...(value as any).response?.data && { responseData: (value as any).response.data },
        };
      }
      return value;
    }
  })
);

// Create a logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonErrorFormat,
  defaultMeta: { service: 'sap-cf-mcp-server' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// If we're not in production, log to the console with detailed error format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      errorFormat
    )
  }));
}

// Helper function to log errors with full details
export const logError = (message: string, error: unknown, additionalContext?: Record<string, any>) => {
  const errorDetails: Record<string, any> = { ...additionalContext };

  if (error instanceof Error) {
    errorDetails.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as any).response?.data && { responseData: (error as any).response.data },
      ...(error as any).code && { code: (error as any).code },
      ...(error as any).status && { status: (error as any).status },
    };
  } else if (error && typeof error === 'object') {
    errorDetails.error = error;
  } else {
    errorDetails.error = String(error);
  }

  logger.error(message, errorDetails);
};

export default logger;