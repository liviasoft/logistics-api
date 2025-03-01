import { OrgRole, OrgType } from '@prisma/client';
import { ClientApp } from '../../client-app/entities/client-app.entity';
import { DeveloperAccount } from '../../developers/entities/developer.entity';

export class Organization {
  revision: number;
  type: OrgType;
  id: string;
  name: string;
  lastEventId: string;
  lastEventType: string;
  lastStreamId: string;
  createdAt: Date;
  updatedAt: Date;

  clientApps?: ClientApp[];
  members?: OrganizationMembership[];
  _count?: {
    clientApps?: number;
    members?: number;
  };
}

export class OrganizationMembership {
  accountId: string;
  organizationId: string;
  joinedAt: Date;
  role: OrgRole;

  account?: DeveloperAccount;
  organization?: Organization;
}
