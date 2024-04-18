import {
  IsEnum,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { GameVisibility } from 'game/entities/game.entity';

export class CardRatiosDto {
  @IsNumber()
  lCards: number;

  @IsNumber()
  streightCards: number;

  @IsNumber()
  tCards: number;
}

export class TreasureCardChancesDto {
  lCardTreasureChance: number;
  streightCardTreasureChance: number;
  tCardTreasureChance: number;
  fixCardTreasureChance: number;
}

export class GameSetupDto {
  @IsString()
  seed: string;

  @IsNumber()
  @Min(7)
  boardWidth: number;

  @IsNumber()
  @Min(7)
  boardHeight: number;

  @ValidateNested()
  cardsRatio: CardRatiosDto;

  @ValidateNested()
  treasureCardChances: TreasureCardChancesDto;
}

export class CreateGameDto {
  @IsEnum(GameVisibility)
  visibility: GameVisibility;

  @ValidateNested()
  gameSetup: GameSetupDto;
}
