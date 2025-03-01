import { Organization } from '../../organizations/entities/organization.entity';
import { DeveloperAccount } from '../../developers/entities/developer.entity';

export class ClientApp {
  revision: number;
  id: string;
  name: string;
  lastEventId: string;
  lastEventType: string;
  lastStreamId: string;
  creatorId: string;
  organizationId: string;
  creator?: DeveloperAccount;
  organization?: Organization;
  _count?: {
    customers?: number;
    featureFlags?: number;
    orders?: number;
    packages?: number;
  };
}
