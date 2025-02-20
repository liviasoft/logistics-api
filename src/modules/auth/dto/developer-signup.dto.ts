import { IsEmail, IsString } from 'class-validator';

export class DeveloperSignupDto {
  id?: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
