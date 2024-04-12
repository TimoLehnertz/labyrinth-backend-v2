import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';

import { Socket } from 'socket.io';

export type EntityOperation = 'insert' | 'remove' | 'update';

export interface WsSubscriberOptions<T> {
  operations?: EntityOperation[];
  filter?: (data: T, operation: EntityOperation) => boolean | Promise<boolean>;
  pipe?: (data: T, operation: EntityOperation) => any | Promise<any>;
}

class Client<T> {
  public constructor(
    private socket: Socket,
    private options: WsSubscriberOptions<T>,
  ) {}

  private operationIncluded(operation: EntityOperation): boolean {
    if (!this.options.operations) {
      return true;
    }
    return this.options.operations.includes(operation);
  }

  private async canPass(
    entity: T,
    operation: EntityOperation,
  ): Promise<boolean> {
    const res = this.options.filter?.(entity, operation) ?? true;
    if (res instanceof Promise) {
      return await res;
    }
    return res;
  }

  private async process(entity: T, operation: EntityOperation): Promise<any> {
    const res = this.options.pipe?.(entity, operation) ?? entity;
    if (res instanceof Promise) {
      return await res;
    }
    return res;
  }

  async afterInsert(insertEvent: InsertEvent<T>) {
    if (!this.operationIncluded('insert')) {
      return;
    }
    if (!(await this.canPass(insertEvent.entity, 'insert'))) {
      return;
    }
    console.log('emit insert');
    this.socket.emit('add', await this.process(insertEvent.entity, 'insert'));
  }

  async afterUpdate(updateEvent: UpdateEvent<T>) {
    if (!updateEvent.entity) {
      return;
    }
    if (!this.canPass(updateEvent.entity as any, 'update')) {
      return;
    }
    console.log('emit update');
    this.socket.emit(
      'update',
      await this.process(updateEvent.entity as any, 'remove'),
    );
  }

  async beforeRemove(removeEvent: RemoveEvent<T>) {
    console.log(removeEvent);
    if (!this.operationIncluded('remove')) {
      return;
    }
    if (
      !removeEvent.entity ||
      !(await this.canPass(removeEvent.entity, 'remove'))
    ) {
      return;
    }
    console.log('emit remove', removeEvent.entity);
    this.socket.emit(
      'remove',
      await this.process(
        JSON.parse(JSON.stringify(removeEvent.entity)), // prevent delete from removing the id
        'remove',
      ),
    );
  }
}

export abstract class WsEntitySubscriber<T>
  implements EntitySubscriberInterface<T>
{
  private clients: Client<T>[] = [];

  public constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<T>) {
    for (const client of this.clients) {
      client.afterInsert(event);
    }
  }

  afterUpdate(event: UpdateEvent<T>) {
    for (const client of this.clients) {
      client.afterUpdate(event);
    }
  }

  beforeRemove(event: RemoveEvent<T>) {
    for (const client of this.clients) {
      client.beforeRemove(event);
    }
  }

  manageClient(socket: Socket, options?: WsSubscriberOptions<T>) {
    const client = new Client<T>(socket, options ?? {});
    this.clients.push(client);
    console.log('added client');
    socket.on('disconnect', () => {
      const index = this.clients.indexOf(client);
      if (index !== -1) {
        this.clients.splice(index, 1);
        console.log('removed client');
      }
    });
  }
}
