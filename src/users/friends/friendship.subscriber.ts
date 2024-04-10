import { DataSource, EventSubscriber } from 'typeorm';
import { WsEntitySubscriber } from 'utils/subscribers';
import { Inject, Injectable } from '@nestjs/common';
import { Friendship } from './entities/friendship.entity';

@EventSubscriber()
@Injectable()
export class FriendshipSubscriber extends WsEntitySubscriber<Friendship> {
  public constructor(@Inject(DataSource) readonly dataSource: DataSource) {
    super(dataSource);
  }

  listenTo() {
    return Friendship;
  }
}
