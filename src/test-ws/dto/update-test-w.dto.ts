import { PartialType } from '@nestjs/mapped-types';
import { CreateTestWDto } from './create-test-w.dto';

export class UpdateTestWDto extends PartialType(CreateTestWDto) {
  id: number;
}
