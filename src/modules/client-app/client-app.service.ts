import { Injectable } from '@nestjs/common';
import { CreateClientAppDto } from './dto/create-client-app.dto';
import { UpdateClientAppDto } from './dto/update-client-app.dto';

@Injectable()
export class ClientAppService {
  create(createClientAppDto: CreateClientAppDto) {
    console.log({ createClientAppDto });
    return 'This action adds a new clientApp';
  }

  findAll() {
    return `This action returns all clientApp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clientApp`;
  }

  update(id: number, updateClientAppDto: UpdateClientAppDto) {
    console.log({ updateClientAppDto });
    return `This action updates a #${id} clientApp`;
  }

  remove(id: number) {
    return `This action removes a #${id} clientApp`;
  }
}
