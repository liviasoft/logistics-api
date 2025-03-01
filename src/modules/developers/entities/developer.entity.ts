import { OrganizationMembership } from '../../organizations/entities/organization.entity';
import { ClientApp } from '../../client-app/entities/client-app.entity';

export class DeveloperAccount {
  id: string;
  name: string;
  revision: number;
  lastEventId: string;
  lastEventType: string;
  lastStreamId: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  password: string;
  clientApps?: ClientApp[];
  memberships?: OrganizationMembership[];
  _count?: {
    clientApps?: number;
    memberships?: number;
  };
}
