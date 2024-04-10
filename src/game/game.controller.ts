import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MoveDto } from './dto/move.dto';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiProperty,
} from '@nestjs/swagger';
import {
  AddUserToGameError,
  CreateGameError,
  GameService,
  MoveError,
} from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { AuthGuard } from 'auth/auth.guard';

class MoveErrorResponse {
  @ApiProperty({
    enum: MoveError,
  })
  message: MoveError;
}

class CreateGameErrorResponse {
  @ApiProperty({
    enum: CreateGameError,
  })
  message: CreateGameError;
}

class JoinErrorResponse {
  @ApiProperty({
    enum: AddUserToGameError,
  })
  message: AddUserToGameError;
}

@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}
  @Post('move')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: MoveErrorResponse })
  async move(
    @Req() request: any,
    @Body() moveDto: MoveDto,
    @Query('game', ParseUUIDPipe) gameID: string,
  ) {
    await this.gameService.move(request.user.id, gameID, moveDto);
  }

  @Post('')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: CreateGameErrorResponse })
  async create(@Req() request: any, @Body() createGameDto: CreateGameDto) {
    await this.gameService.create(request.user.id, createGameDto);
  }

  @Get('availableToJoin')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: MoveErrorResponse })
  async findAvailableToJoin(@Req() request: any) {
    await this.gameService.findAvailableToJoin(request.user.id);
  }

  @Post('join')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: JoinErrorResponse })
  @HttpCode(HttpStatus.OK)
  async join(
    @Req() request: any,
    @Query('game', ParseUUIDPipe) gameID: string,
  ) {
    await this.gameService.addUserToGame(request.user.id, gameID);
  }
}
