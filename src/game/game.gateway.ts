import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { WsAuthGuard } from 'auth/ws-auth.guard';
import { Socket } from 'socket.io';
import { Game } from './entities/game.entity';
import { GameSubscriber } from './game.subscriber';
import { PlayerPlaysGameSubscriber } from './playerPlaysGame.subscriber';
import { PlayerPlaysGame } from './entities/PlayerPlaysGame.entity';
import { GameService } from './game.service';
import { UsersService } from 'users/users.service';

@WebSocketGateway({
  namespace: 'game',
})
export class GameGateway {
  constructor(
    private readonly gameSubscriber: GameSubscriber,
    private readonly playerPlaysGameSubscriber: PlayerPlaysGameSubscriber,
    private readonly gameService: GameService,
    private readonly usersService: UsersService,
  ) {}

  @SubscribeMessage('getGame')
  @UseGuards(WsAuthGuard)
  public async handleGetGame(
    @MessageBody(ParseUUIDPipe) gameID: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.gameSubscriber.manageClient(client, {
        filter: (game: Game) => game.id === gameID,
        pipe: (e) => {
          return e;
        },
      });
    } catch (e) {
      throw new WsException(e.message ?? 'An error occurred');
    }
  }

  @SubscribeMessage('getPlayers')
  @UseGuards(WsAuthGuard)
  public async handleGetPlayers(
    @MessageBody(ParseUUIDPipe) gameID: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.playerPlaysGameSubscriber.manageClient(client, {
        filter: (playerPlaysGame: PlayerPlaysGame) =>
          playerPlaysGame.gameID === gameID,
        pipe: async (playerPlaysGame: PlayerPlaysGame) => {
          if (playerPlaysGame.userID && !playerPlaysGame.user) {
            playerPlaysGame.user = await this.usersService.findById(
              playerPlaysGame.userID,
            );
          }
          return playerPlaysGame;
        },
      });
      client.emit('init', await this.gameService.findGamePlayers(gameID));
    } catch (e) {
      throw new WsException(e.message ?? 'An error occurred');
    }
  }
}
