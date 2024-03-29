import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { TestWsService } from './test-ws.service';
import { CreateTestWDto } from './dto/create-test-w.dto';
import { UpdateTestWDto } from './dto/update-test-w.dto';

@WebSocketGateway()
export class TestWsGateway {
  constructor(private readonly testWsService: TestWsService) {}

  @SubscribeMessage('createTestW')
  create(@MessageBody() createTestWDto: CreateTestWDto) {
    return this.testWsService.create(createTestWDto);
  }

  @SubscribeMessage('findAllTestWs')
  findAll() {
    return this.testWsService.findAll();
  }

  @SubscribeMessage('findOneTestW')
  findOne(@MessageBody() id: number) {
    return this.testWsService.findOne(id);
  }

  @SubscribeMessage('updateTestW')
  update(@MessageBody() updateTestWDto: UpdateTestWDto) {
    return this.testWsService.update(updateTestWDto.id, updateTestWDto);
  }

  @SubscribeMessage('removeTestW')
  remove(@MessageBody() id: number) {
    return this.testWsService.remove(id);
  }
}
