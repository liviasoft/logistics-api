/**
 * Example Workflow
 *
 * Demonstrates how to create a workflow with:
 * - Steps with compensation
 * - Data transformation
 * - Domain events
 * - Container access
 *
 * This is for reference - adapt for your actual use case.
 */

import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  WorkflowData,
  transform,
  makeStepCallable,
  WorkflowErrors,
} from '../index';

// =============================================================================
// Types
// =============================================================================

interface CreateUserInput {
  email: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface WelcomeEmail {
  sent: boolean;
  messageId: string;
}

// =============================================================================
// Steps
// =============================================================================

/**
 * Step 1: Validate input
 * No compensation needed - read-only operation
 */
const validateInputStepDef = createStep(
  'validate-input',
  async (input: CreateUserInput) => {
    if (!input.email || !input.email.includes('@')) {
      throw WorkflowErrors.validation(['Invalid email format']);
    }

    if (!input.name || input.name.length < 2) {
      throw WorkflowErrors.validation(['Name must be at least 2 characters']);
    }

    return new StepResponse({ valid: true });
  },
);

/**
 * Step 2: Create user in database
 * Has compensation to delete user on failure
 */
const createUserStepDef = createStep(
  'create-user',
  async (input: CreateUserInput, { container, emit }) => {
    // In real code: const usersService = container.resolve(UsersService);
    // const user = await usersService.create(input);

    // Simulated user creation
    const user: User = {
      id: `user_${Date.now()}`,
      email: input.email,
      name: input.name,
    };

    // Emit domain event (only dispatched on workflow success)
    emit('user.created', { userId: user.id, email: user.email });

    // Return user, with ID passed to compensation
    return new StepResponse<User, User>(user, { ...user });
  },
  // Compensation: delete user
  async (data: { userId: string }, { container }) => {
    // In real code: const usersService = container.resolve(UsersService);
    // await usersService.delete(data.userId);
    console.log(`[Compensation] Deleting user: ${data.userId}`);
  },
);

/**
 * Step 3: Send welcome email
 * Has compensation to mark email as cancelled
 */
const sendWelcomeEmailStepDef = createStep(
  'send-welcome-email',
  async (user: User, { emit }) => {
    // In real code: const emailService = container.resolve(EmailService);
    // const result = await emailService.send({ to: user.email, template: 'welcome' });

    const result: WelcomeEmail = {
      sent: true,
      messageId: `msg_${Date.now()}`,
    };

    emit('email.sent', {
      type: 'welcome',
      recipient: user.email,
      messageId: result.messageId,
    });

    return new StepResponse(result, { messageId: result.messageId });
  },
  // Compensation: log that email should be ignored
  async (data: { messageId: string }) => {
    console.log(`[Compensation] Email ${data.messageId} should be ignored`);
  },
);

// =============================================================================
// Make steps callable
// =============================================================================

const validateInputStep = makeStepCallable(validateInputStepDef);
const createUserStep = makeStepCallable(createUserStepDef);
const sendWelcomeEmailStep = makeStepCallable(sendWelcomeEmailStepDef);

// =============================================================================
// Workflow
// =============================================================================

/**
 * User Onboarding Workflow
 *
 * 1. Validates input
 * 2. Creates user in database (with rollback)
 * 3. Sends welcome email (with rollback)
 *
 * If any step fails, previous steps are compensated in reverse order.
 * Domain events are only dispatched after successful completion.
 */
export const userOnboardingWorkflow = createWorkflow(
  { name: 'user-onboarding', store: true },
  function (input: WorkflowData<CreateUserInput>) {
    // Step 1: Validate input
    const validation = validateInputStep(input as unknown as CreateUserInput);

    // Step 2: Create user
    const user = createUserStep(input as unknown as CreateUserInput);

    // Step 3: Transform data for email step
    const userForEmail = transform({ user }, (data) => data.user as unknown as User);

    // Step 4: Send welcome email
    const email = sendWelcomeEmailStep(userForEmail as unknown as User);

    // Return workflow result
    return new WorkflowResponse({
      user,
      email,
    });
  },
);

// =============================================================================
// Usage Example
// =============================================================================

/**
 * Example usage in a NestJS controller:
 *
 * @Controller('users')
 * export class UsersController {
 *   constructor(private workflowEngine: WorkflowEngineService) {}
 *
 *   @Post('onboard')
 *   async onboardUser(@Body() dto: CreateUserDto) {
 *     const { result, transaction } = await this.workflowEngine.run(
 *       userOnboardingWorkflow,
 *       {
 *         input: { email: dto.email, name: dto.name },
 *       },
 *     );
 *
 *     // If any step fails:
 *     // - Compensation runs automatically (delete user, etc.)
 *     // - Appropriate HTTP exception is thrown
 *     // - Domain events are NOT dispatched
 *
 *     // On success:
 *     // - Domain events (user.created, email.sent) are dispatched
 *     // - Subscribers can react to them
 *
 *     return result;
 *   }
 * }
 *
 * // Subscribe to domain events:
 * @Injectable()
 * export class UserSubscriber {
 *   @WorkflowSubscriber('user.created')
 *   async onUserCreated(payload: DomainEventPayload<{ userId: string }>) {
 *     console.log(`User created: ${payload.userId}`);
 *     // Track in analytics, sync to CRM, etc.
 *   }
 * }
 */
