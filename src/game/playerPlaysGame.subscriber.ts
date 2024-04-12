import { DataSource, EventSubscriber } from 'typeorm';
import { WsEntitySubscriber } from 'utils/subscribers';
import { Inject, Injectable } from '@nestjs/common';
import { PlayerPlaysGame as PlayerPlaysGame } from './entities/PlayerPlaysGame.entity';

@EventSubscriber()
@Injectable()
export class PlayerPlaysGameSubscriber extends WsEntitySubscriber<PlayerPlaysGame> {
  public constructor(@Inject(DataSource) readonly dataSource: DataSource) {
    super(dataSource);
  }

  listenTo() {
    return PlayerPlaysGame;
  }
}
