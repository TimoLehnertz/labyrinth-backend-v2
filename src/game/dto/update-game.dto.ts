import { IsOptional, IsUUID } from 'class-validator';
import { CreateGameDto } from './create-game.dto';

export class UpdateGameDto extends CreateGameDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsUUID()
  ownerID?: string;
}
