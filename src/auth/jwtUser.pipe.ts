import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { JWTUser } from './entities/jwtUser.entity';

@Injectable()
export class JwtUserPipe implements PipeTransform {
  transform(value: any): JWTUser {
    if (value?.request?.user === undefined) {
      console.log(value);
      console.log('sd');
      throw new BadRequestException();
    }
    return value.request.user;
  }
}
