import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  RemoveEvent,
} from 'typeorm';

import { Socket } from 'socket.io';

export type EntityOperation = 'insert' | 'remove';

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

  //   afterUpdate(updateEvent: UpdateEvent<T>) {
  //     if (!updateEvent.entity) {
  //       return;
  //     }
  //     if (!this.canPass(updateEvent.entity)) {
  //       return;
  //     }
  //     this.socket.emit('update', updateEvent.entity);
  //   }

  async afterRemove(insertEvent: RemoveEvent<T>) {
    if (!this.operationIncluded('remove')) {
      return;
    }
    if (
      !insertEvent.entity ||
      !(await this.canPass(insertEvent.entity, 'remove'))
    ) {
      return;
    }
    console.log('emit remove', insertEvent.entity);
    this.socket.emit(
      'remove',
      await this.process(insertEvent.entity, 'remove'),
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

  //   afterUpdate(event: UpdateEvent<T>) {
  //     for (const client of this.clients) {
  //       client.afterUpdate(event);
  //     }
  //   }

  afterRemove(event: RemoveEvent<T>) {
    for (const client of this.clients) {
      client.afterRemove(event);
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