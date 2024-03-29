import { Test, TestingModule } from '@nestjs/testing';
import { TestWsService } from './test-ws.service';

describe('TestWsService', () => {
  let service: TestWsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestWsService],
    }).compile();

    service = module.get<TestWsService>(TestWsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
