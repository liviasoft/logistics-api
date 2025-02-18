import { CreateFeatureFlagDto } from 'src/modules/feature-flags/dto/create-feature-flag.dto';
import { Event } from './events';
// import { UpdateFeatureFlagDto } from 'src/modules/feature-flags/dto/update-feature-flag.dto';

export enum FeatureFlagEventType {
  FeatureFlagRegistered = 'FeatureFlagRegistered',
  FeatureFlagEnabled = 'FeatureFlagEnabled',
  FeatureFlagDisabled = 'FeatureFlagDisabled',
  FeatureFlagEdited = 'FeatureFlagEdited',
  FeatureFlagRemoved = 'FeatureFlagRemoved',
}

export const getFeatureFlagStreamName = () => 'SystemFeatureFlags' as const;

export type FeatureFlagRegisteredEvent = Event<
  FeatureFlagEventType.FeatureFlagRegistered,
  CreateFeatureFlagDto & { [key: string]: any }
>;

// type FeatureFlagRegistered = CreateFeatureFlagDto;

// type FeatureFlagEnabled = {
//   id: string;
//   enabled: boolean;
// };

// type FeatureFlagDisabled = FeatureFlagEnabled;

// type FeatureFlagUpdated = UpdateFeatureFlagDto;

// type FeatureFlagDeleted = { id: string };
