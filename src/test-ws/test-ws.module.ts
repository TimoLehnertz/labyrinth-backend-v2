import { Module } from '@nestjs/common';
import { TestWsService } from './test-ws.service';
import { TestWsGateway } from './test-ws.gateway';

@Module({
  providers: [TestWsGateway, TestWsService],
})
export class TestWsModule {}
