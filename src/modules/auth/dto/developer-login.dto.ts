import { IsEmail, IsString } from 'class-validator';

export class DeveloperLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
