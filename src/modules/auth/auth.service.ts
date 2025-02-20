import { Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { DeveloperSignupDto } from './dto/developer-signup.dto';

@Injectable()
export class AuthService {
  create(createAuthDto: CreateAuthDto) {
    console.log({ createAuthDto });
    return 'This action adds a new auth';
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    console.log({ updateAuthDto });
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }

  developerSignup(developerSignupDto: DeveloperSignupDto) {
    console.log({ developerSignupDto });
    return `This action registers a new developer account`;
  }
}
