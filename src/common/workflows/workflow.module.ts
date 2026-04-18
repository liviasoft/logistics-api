import { Global, Module } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';

/**
 * WorkflowModule - Provides the workflow engine for the application
 *
 * This module is global, so WorkflowEngineService can be injected
 * anywhere without importing the module.
 *
 * @example
 * // app.module.ts
 * @Module({
 *   imports: [WorkflowModule],
 * })
 * export class AppModule {}
 *
 * @example
 * // any.service.ts
 * @Injectable()
 * export class AnyService {
 *   constructor(private workflowEngine: WorkflowEngineService) {}
 * }
 */
@Global()
@Module({
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService],
})
export class WorkflowModule {}
