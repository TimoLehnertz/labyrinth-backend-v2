import { Test, TestingModule } from '@nestjs/testing';
import { TestWsGateway } from './test-ws.gateway';
import { TestWsService } from './test-ws.service';

describe('TestWsGateway', () => {
  let gateway: TestWsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestWsGateway, TestWsService],
    }).compile();

    gateway = module.get<TestWsGateway>(TestWsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
