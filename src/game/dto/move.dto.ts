import { IsEnum, IsNumber, ValidateIf, ValidateNested } from 'class-validator';
import { ShiftPosition } from 'labyrinth-game-logic';

export class BoardPositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export enum Heading {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
}

export class ShiftPositionDto {
  @IsEnum(Heading)
  heading: Heading;

  @IsNumber()
  index: number;

  static fromShiftPosition(shiftPosition: ShiftPosition): ShiftPositionDto {
    const shiftPositionDto = new ShiftPositionDto();
    shiftPositionDto.heading = shiftPosition.heading;
    shiftPositionDto.index = shiftPosition.index;
    return shiftPositionDto;
  }
}

export class MoveDto {
  @IsNumber()
  playerIndex: number;

  @IsNumber()
  rotateBeforeShift: number;

  @ValidateNested()
  shiftPosition: ShiftPositionDto;

  @ValidateNested()
  from: BoardPositionDto;

  @ValidateNested()
  to: BoardPositionDto;

  @IsNumber()
  @ValidateIf((object, value) => value !== null)
  collectedTreasure: number | null;

  //   public static fromMove(move: Move): MoveDto {
  //     const moveDto: MoveDto = new MoveDto();
  //     moveDto.rotateBeforeShift = move.rotateBeforeShift;
  //     moveDto.shiftPosition = ShiftPositionDto.fromShiftPosition(
  //       move.shiftPosition,
  //     );
  //     moveDto.from = move.from;
  //     moveDto.to = move.to;
  //     return moveDto;
  //   }
}
