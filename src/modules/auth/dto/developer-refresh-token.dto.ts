import { IsString } from 'class-validator';

export class DeveloperRefreshTokenDto {
  @IsString()
  userId: string;
}
