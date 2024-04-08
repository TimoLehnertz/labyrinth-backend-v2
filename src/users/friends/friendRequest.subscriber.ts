import { DataSource, EventSubscriber } from 'typeorm';
import { FriendRequest } from './entities/friendRequest.entity';
import { WsEntitySubscriber } from 'utils/subscribers';
import { Inject, Injectable } from '@nestjs/common';

@EventSubscriber()
@Injectable()
export class FriendRequestSubscriber extends WsEntitySubscriber<FriendRequest> {
  public constructor(@Inject(DataSource) readonly dataSource: DataSource) {
    super(dataSource);
  }

  listenTo() {
    return FriendRequest;
  }
}
