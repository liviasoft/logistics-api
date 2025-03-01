export class Organization {
  revision: number;
  type: 'INDIVIDUAL' | 'COMPANY';
  id: string;
  name: string;
  lastEventId: string;
  lastEventType: string;
  lastStreamId: string;
  createdAt: Date;
  updatedAt: Date;
}
