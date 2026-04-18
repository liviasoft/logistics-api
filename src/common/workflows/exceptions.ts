import { HttpException, HttpStatus } from '@nestjs/common';
import { StepTransaction, WorkflowTransaction } from './types';

/**
 * Base class for workflow-related exceptions
 * Extends HttpException for automatic HTTP response mapping
 */
export class WorkflowException extends HttpException {
  constructor(
    public readonly workflowName: string,
    public readonly transaction: WorkflowTransaction | null,
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        statusCode: status,
        error: 'WorkflowError',
        message,
        workflow: workflowName,
        transactionId: transaction?.id,
        transactionStatus: transaction?.status,
      },
      status,
    );
  }
}

/**
 * Thrown when a workflow step fails
 * Maps to appropriate HTTP status based on step error
 */
export class StepFailedException extends WorkflowException {
  constructor(
    workflowName: string,
    public readonly step: StepTransaction,
    transaction: WorkflowTransaction | null,
    public readonly originalError: Error,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      workflowName,
      transaction,
      `Step "${step.name}" failed: ${originalError.message}`,
      status,
    );
  }

  getResponse(): object {
    return {
      ...(super.getResponse() as object),
      step: this.step.name,
      stepError: this.originalError.message,
    };
  }
}

/**
 * Thrown when workflow compensation (rollback) fails
 * Always maps to 500 since this is a critical system error
 */
export class CompensationFailedException extends WorkflowException {
  constructor(
    workflowName: string,
    transaction: WorkflowTransaction | null,
    public readonly compensationErrors: Array<{ step: string; error: string }>,
  ) {
    super(
      workflowName,
      transaction,
      `Compensation failed for workflow "${workflowName}"`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  getResponse(): object {
    return {
      ...(super.getResponse() as object),
      compensationErrors: this.compensationErrors,
    };
  }
}

/**
 * Thrown when a step validation fails (e.g., invalid input)
 * Maps to 400 Bad Request
 */
export class StepValidationException extends WorkflowException {
  constructor(
    workflowName: string,
    stepName: string,
    transaction: WorkflowTransaction | null,
    public readonly validationErrors: string[],
  ) {
    super(
      workflowName,
      transaction,
      `Validation failed in step "${stepName}"`,
      HttpStatus.BAD_REQUEST,
    );
  }

  getResponse(): object {
    return {
      ...(super.getResponse() as object),
      validationErrors: this.validationErrors,
    };
  }
}

/**
 * Thrown when a resource is not found during workflow execution
 * Maps to 404 Not Found
 */
export class StepNotFoundException extends WorkflowException {
  constructor(
    workflowName: string,
    stepName: string,
    transaction: WorkflowTransaction | null,
    public readonly resource: string,
  ) {
    super(
      workflowName,
      transaction,
      `Resource "${resource}" not found in step "${stepName}"`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Thrown when a conflict occurs (e.g., duplicate entry, concurrent modification)
 * Maps to 409 Conflict
 */
export class StepConflictException extends WorkflowException {
  constructor(
    workflowName: string,
    stepName: string,
    transaction: WorkflowTransaction | null,
    message: string,
  ) {
    super(
      workflowName,
      transaction,
      `Conflict in step "${stepName}": ${message}`,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Thrown when a step times out
 * Maps to 504 Gateway Timeout
 */
export class StepTimeoutException extends WorkflowException {
  constructor(
    workflowName: string,
    stepName: string,
    transaction: WorkflowTransaction | null,
    timeoutMs: number,
  ) {
    super(
      workflowName,
      transaction,
      `Step "${stepName}" timed out after ${timeoutMs}ms`,
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}

/**
 * Helper to throw appropriate workflow exceptions from steps
 *
 * @example
 * const myStep = createStep('my-step', async (input, { container }) => {
 *   const user = await userService.findById(input.userId);
 *   if (!user) {
 *     throw WorkflowErrors.notFound('user', input.userId);
 *   }
 *
 *   if (!input.email) {
 *     throw WorkflowErrors.validation(['email is required']);
 *   }
 *
 *   return new StepResponse(user);
 * });
 */
export const WorkflowErrors = {
  /**
   * Resource not found
   */
  notFound: (resource: string, id?: string) =>
    new Error(`NOT_FOUND:${resource}${id ? `:${id}` : ''}`),

  /**
   * Validation failed
   */
  validation: (errors: string[]) =>
    new Error(`VALIDATION:${errors.join('; ')}`),

  /**
   * Conflict (duplicate, concurrent modification, etc.)
   */
  conflict: (message: string) => new Error(`CONFLICT:${message}`),

  /**
   * Unauthorized access
   */
  unauthorized: (message = 'Unauthorized') =>
    new Error(`UNAUTHORIZED:${message}`),

  /**
   * Forbidden access
   */
  forbidden: (message = 'Forbidden') => new Error(`FORBIDDEN:${message}`),
};

/**
 * Parses a step error and returns the appropriate HTTP status
 */
export function parseStepError(error: Error): {
  status: HttpStatus;
  type: string;
  message: string;
} {
  const message = error.message;

  if (message.startsWith('NOT_FOUND:')) {
    return {
      status: HttpStatus.NOT_FOUND,
      type: 'NOT_FOUND',
      message: message.replace('NOT_FOUND:', ''),
    };
  }

  if (message.startsWith('VALIDATION:')) {
    return {
      status: HttpStatus.BAD_REQUEST,
      type: 'VALIDATION',
      message: message.replace('VALIDATION:', ''),
    };
  }

  if (message.startsWith('CONFLICT:')) {
    return {
      status: HttpStatus.CONFLICT,
      type: 'CONFLICT',
      message: message.replace('CONFLICT:', ''),
    };
  }

  if (message.startsWith('UNAUTHORIZED:')) {
    return {
      status: HttpStatus.UNAUTHORIZED,
      type: 'UNAUTHORIZED',
      message: message.replace('UNAUTHORIZED:', ''),
    };
  }

  if (message.startsWith('FORBIDDEN:')) {
    return {
      status: HttpStatus.FORBIDDEN,
      type: 'FORBIDDEN',
      message: message.replace('FORBIDDEN:', ''),
    };
  }

  // Default to internal server error
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    type: 'INTERNAL_ERROR',
    message: message,
  };
}
