import { PartialType } from '@nestjs/mapped-types';
import { CreateClientAppDto } from './create-client-app.dto';

export class UpdateClientAppDto extends PartialType(CreateClientAppDto) {}
