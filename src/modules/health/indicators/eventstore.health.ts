import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventStoreHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const esdbUrl = this.configService.get<string>('ESDB_URL', '');
      // Extract host and port from connection string
      // Format: esdb://localhost:2113?tls=false
      const match = esdbUrl.match(/esdb:\/\/([^:]+):(\d+)/);
      if (!match) {
        throw new Error('Invalid ESDB_URL format');
      }

      const [, host, port] = match;
      const healthUrl = `http://${host}:${port}/health/live`;

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return this.getStatus(key, true);
      }

      throw new Error(`EventStoreDB returned status ${response.status}`);
    } catch (error) {
      throw new HealthCheckError(
        'EventStoreDB health check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
