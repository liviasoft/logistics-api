// import { CreateDeveloperDto } from 'src/modules/developers/dto/create-developer.dto';

// type DeveloperAccountRegistered = Readonly<CreateDeveloperDto>;

// type DeveloperLoggedIn = Readonly<{}>;

// type DeveloperRegisteredApplication = Readonly<{}>;

// export type DeveloperEvent =
//   | DeveloperAccountRegistered
//   | DeveloperLoggedIn
//   | DeveloperRegisteredApplication;

export enum DeveloperEventType {
  DeveloperSignedUp = 'DeveloperSignedUp',
}

// export const DEVELOPER = 'developer' as const;

// export const getDeveloperStreamName = (id: string) => `${DEVELOPER}-${id}`;
