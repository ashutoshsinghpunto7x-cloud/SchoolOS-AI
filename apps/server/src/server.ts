import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './lib/logger';
import { startPlannerScheduler } from './features/teacher-planner/planner-notifications.job';
import { startMockTestScheduler } from './features/mock-tests/mock-test-scheduler.job';
import { startReceptionTaskAutoScheduler } from './features/reception-tasks/reception-task-auto.job';
import { startFollowUpAutoScheduler } from './features/follow-ups/follow-up-auto.job';
import { startPlanAlertScheduler } from './features/academic-plan/plan-alert.job';
import { resumeStuckBulkJobs } from './features/communication/queue/bulk-processor';

const start = async (): Promise<void> => {
  await connectDatabase();
  startPlannerScheduler();
  startMockTestScheduler();
  startReceptionTaskAutoScheduler();
  startFollowUpAutoScheduler();
  startPlanAlertScheduler();
  // Picks back up any bulk send left mid-run by a crash/restart on this or
  // another instance — see bulk-processor.ts#resumeStuckBulkJobs.
  resumeStuckBulkJobs().catch((err) => logger.error('[BulkProcessor] Startup resume scan failed', { err }));

  const server = app.listen(Number(env.PORT), () => {
    logger.info(`SchoolOS AI Server started`, {
      port: env.PORT,
      environment: env.NODE_ENV,
      health: `http://localhost:${env.PORT}/api/v1/health`,
    });
  });

  // keepAliveTimeout must exceed the load balancer's idle timeout (Render's is
  // ~60s) so Render never reuses a connection this process has already closed,
  // which surfaces to clients as random connection-reset errors under load.
  // headersTimeout must stay above keepAliveTimeout (Node requirement).
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server shut down cleanly');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });
};

start().catch((error) => {
  logger.error('Server failed to start', { error });
  process.exit(1);
});
