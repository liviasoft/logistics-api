import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class DeveloperSignupDto {
  id?: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;

  // @IsString()
  // lastname: string;

  @IsString()
  @MinLength(8)
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  password: string;
}
