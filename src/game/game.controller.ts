import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MoveDto } from './dto/move.dto';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiProperty,
  ApiCreatedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  AddBotError,
  AddUserToGameError,
  CreateGameError,
  GameService,
  MakeAdminError,
  MoveError,
  RemoveGamePlayerError,
  UpdateGameError,
} from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { AuthGuard } from 'auth/auth.guard';
import { Game } from './entities/game.entity';
import { UpdateGameDto } from './dto/update-game.dto';
import { BotType, PlayerPlaysGame } from './entities/PlayerPlaysGame.entity';

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

class UpdateGameErrorResponse {
  @ApiProperty({
    enum: UpdateGameError,
  })
  message: UpdateGameError;
}

class JoinErrorResponse {
  @ApiProperty({
    enum: AddUserToGameError,
  })
  message: AddUserToGameError;
}

class RemoveGamePlayerErrorResponse {
  @ApiProperty({
    enum: RemoveGamePlayerError,
  })
  message: RemoveGamePlayerError;
}

class MakeAdminErrorResponse {
  @ApiProperty({
    enum: MakeAdminError,
  })
  message: MakeAdminError;
}

class CreateGameResponse {
  @ApiProperty()
  gameID: string;
}

class GetErrorResponse {
  message: 'game does not exist';
}

class AddBotErrorResponse {
  @ApiProperty({
    enum: AddBotError,
  })
  message: AddBotError;
}

@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  @Post('')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: CreateGameErrorResponse })
  @ApiCreatedResponse({
    type: CreateGameResponse,
  })
  async create(
    @Req() request: any,
    @Body() createGameDto: CreateGameDto,
  ): Promise<CreateGameResponse> {
    console.log(request.user);
    const game = await this.gameService.create(request.user.id, createGameDto);
    return {
      gameID: game.id,
    };
  }

  @Get('')
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: GetErrorResponse })
  async findOne(@Query('gameID', ParseUUIDPipe) gameID: string): Promise<Game> {
    const game = await this.gameService.findOne(gameID);
    if (game === null) {
      throw new BadRequestException('game does not exist');
    }
    return game;
  }

  @Put('/')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: UpdateGameErrorResponse })
  async update(@Req() request: any, @Body() updateGameDto: UpdateGameDto) {
    await this.gameService.update(request.user.id, updateGameDto);
  }

  @Post('move')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: MoveErrorResponse })
  async move(
    @Req() request: any,
    @Body() moveDto: MoveDto,
    @Query('game', ParseUUIDPipe) gameID: string,
  ) {
    await this.gameService.move(gameID, moveDto, request.user.id);
  }

  @Get('availableToJoin')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  findAvailableToJoin(@Req() request: any) {
    return this.gameService.findAvailableToJoin(request.user.id);
  }

  @Get('players')
  @ApiBearerAuth()
  async findPlayers(
    @Query('gameID', ParseUUIDPipe) gameID: string,
  ): Promise<PlayerPlaysGame[]> {
    return this.gameService.findGamePlayers(gameID);
  }

  @Get('ownGames')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  findOwnGames(@Req() request: any): Promise<Game[]> {
    return this.gameService.findOwnGames(request.user.id);
  }

  @Post('join')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: JoinErrorResponse })
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: 'playerName',
    type: String,
    required: false,
  })
  async join(
    @Req() request: any,
    @Query('gameID', ParseUUIDPipe) gameID: string,
    @Query('playerName') playerName?: string,
  ) {
    await this.gameService.addUserToGame(request.user.id, gameID, playerName);
  }

  @Post('addBot')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'botType', type: 'enum', enum: BotType })
  @ApiBadRequestResponse({ type: AddBotErrorResponse })
  async addBot(
    @Req() request: any,
    @Query('gameID', ParseUUIDPipe) gameID: string,
    @Query('botType', new ParseEnumPipe(BotType)) botType: BotType,
  ) {
    await this.gameService.addBot(request.user.id, gameID, botType);
  }

  @Put('ready')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async setReady(
    @Req() request: any,
    @Query('game', ParseUUIDPipe) gameID: string,
    @Query('ready', ParseBoolPipe) ready: boolean,
  ) {
    await this.gameService.setReady(request.user.id, gameID, ready);
  }

  @Delete('/leave')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: RemoveGamePlayerErrorResponse })
  async leaveGame(
    @Req() request: any,
    @Query('gameID', ParseUUIDPipe) gameID: string,
    @Query('userIndex', ParseIntPipe) playerIndex: number,
  ) {
    await this.gameService.removeGamePlayer(
      request.user.id,
      gameID,
      playerIndex,
    );
  }

  @Put('/makeAdmin')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBadRequestResponse({ type: MakeAdminErrorResponse })
  async makeAdmin(
    @Req() request: any,
    @Query('gameID', ParseUUIDPipe) gameID: string,
    @Query('userID', ParseUUIDPipe) newAdminID: string,
  ) {
    await this.gameService.makeAdmin(request.user.id, newAdminID, gameID);
  }
}
