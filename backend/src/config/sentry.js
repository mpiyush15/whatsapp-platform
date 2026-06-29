/**
 * Sentry Error Tracking Initialization
 * Captures all errors and sends to Sentry dashboard
 */

import * as Sentry from '@sentry/node';

let sentryInitialized = false;

export const initSentry = (app) => {
  const sentryDsn = process.env.SENTRY_DSN;

  // Only initialize if DSN is set
  if (sentryDsn && sentryDsn.includes('sentry.io')) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 1.0,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true })
      ]
    });

    sentryInitialized = true;
    console.log('✅ Sentry error tracking initialized');
  } else {
    console.log('⚠️  Sentry not configured. Set SENTRY_DSN in .env to enable error tracking');
  }

  // Attach Sentry request handler if initialized
  if (sentryInitialized) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  return Sentry;
};

/**
 * Sentry error handler middleware (should be last)
 */
export const sentryErrorHandler = (err, req, res, next) => {
  if (sentryInitialized && Sentry && Sentry.Handlers && Sentry.Handlers.errorHandler) {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        if (error.status >= 500) return true;
        if (error.status === 401 || error.status === 403) return true;
        return false;
      }
    })(err, req, res, next);
  }
  // If Sentry not initialized, just pass to next handler
  next(err);
};

/**
 * Capture error in Sentry
 */
export const captureException = (error, context = {}) => {
  if (sentryInitialized && Sentry) {
    Sentry.captureException(error, {
      contexts: { custom: context }
    });
  }
  console.error('❌ Error captured:', error.message, context);
};

/**
 * Capture message in Sentry
 */
export const captureMessage = (message, level = 'info') => {
  if (sentryInitialized && Sentry) {
    Sentry.captureMessage(message, level);
  }
  console.log(`ℹ️  ${level.toUpperCase()}: ${message}`);
};

export default { initSentry, sentryErrorHandler, captureException, captureMessage };
