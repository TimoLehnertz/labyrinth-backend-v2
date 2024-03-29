import { Injectable } from '@nestjs/common';
import { CreateTestWDto } from './dto/create-test-w.dto';
import { UpdateTestWDto } from './dto/update-test-w.dto';

@Injectable()
export class TestWsService {
  create(createTestWDto: CreateTestWDto) {
    return 'This action adds a new testW';
  }

  findAll() {
    return `This action returns all testWs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} testW`;
  }

  update(id: number, updateTestWDto: UpdateTestWDto) {
    return `This action updates a #${id} testW`;
  }

  remove(id: number) {
    return `This action removes a #${id} testW`;
  }
}
