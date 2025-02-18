import { IsEmail, IsString } from 'class-validator';

export class DeveloperRegistrationDto {
  id?: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
