import { IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { Heading, Move, ShiftPosition } from 'labyrinth-game-logic';

export class BoardPositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class ShiftPositionDto {
  @IsEnum(Heading)
  shiftHeading: Heading;

  @IsNumber()
  index: number;

  static fromShiftPosition(shiftPosition: ShiftPosition): ShiftPositionDto {
    const shiftPositionDto = new ShiftPositionDto();
    shiftPositionDto.shiftHeading = shiftPosition.heading;
    shiftPositionDto.index = shiftPosition.index;
    return shiftPositionDto;
  }
}

export class MoveDto {
  @IsNumber()
  rotateBeforeShift: number;

  @ValidateNested()
  shiftPosition: ShiftPositionDto;

  @ValidateNested()
  from: BoardPositionDto;

  @ValidateNested()
  to: BoardPositionDto;

  @IsNumber()
  collectedTreasure: number;

  public static fromMove(move: Move): MoveDto {
    const moveDto: MoveDto = new MoveDto();
    moveDto.rotateBeforeShift = move.rotateBeforeShift;
    moveDto.shiftPosition = ShiftPositionDto.fromShiftPosition(
      move.shiftPosition,
    );
    moveDto.from = move.from;
    moveDto.to = move.to;
    return moveDto;
  }
}
