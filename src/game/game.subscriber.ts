import { DataSource, EventSubscriber } from 'typeorm';
import { WsEntitySubscriber } from 'utils/subscribers';
import { Inject, Injectable } from '@nestjs/common';
import { Game } from './entities/game.entity';

@EventSubscriber()
@Injectable()
export class GameSubscriber extends WsEntitySubscriber<Game> {
  public constructor(@Inject(DataSource) readonly dataSource: DataSource) {
    super(dataSource);
  }

  listenTo() {
    return Game;
  }
}
