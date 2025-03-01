import { ClientApp } from '../../client-app/entities/client-app.entity';

export class Customer {
  id: string;
  password: string;
  email: string;
  revision: number;
  lastEventId: string;
  lastEventType: string;
  lastStreamId: string;
  createdAt: Date;
  updatedAt: Date;
  clientAppId: string;
  firstname: string;
  lastname: string;

  clientApp?: ClientApp;
}
