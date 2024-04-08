import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

export enum RegisterError {
  emailTaken = 'email taken',
  usernameTaken = 'username taken',
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  findOne(usernameOrEmail: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [
        {
          email: usernameOrEmail,
        },
        {
          username: usernameOrEmail,
        },
      ],
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  emailExists(email: string): Promise<boolean> {
    return this.usersRepository.exists({
      where: {
        email: email,
      },
    });
  }

  usernameExists(username: string): Promise<boolean> {
    return this.usersRepository.exists({
      where: {
        username: username,
      },
    });
  }

  findMany(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async register(registerUserDto: RegisterDto) {
    if (await this.emailExists(registerUserDto.email)) {
      throw new BadRequestException(RegisterError.emailTaken);
    }
    if (await this.usernameExists(registerUserDto.username)) {
      throw new BadRequestException(RegisterError.usernameTaken);
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      registerUserDto.password,
      saltRounds,
    );
    let user = new User();
    user.email = registerUserDto.email;
    user.password = hashedPassword;
    user.username = registerUserDto.username;
    user = this.usersRepository.create(user);
    await this.usersRepository.insert(user);
  }

  async delete(id: string) {
    await this.usersRepository.delete({
      id,
    });
  }
}
