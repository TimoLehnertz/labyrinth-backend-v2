import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<true> {
    const token = this.extractTokenFromContext(context);
    if (!token) {
      throw new WsException('unauthorized');
    }
    try {
      const user = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('AUTH_SECRET', 'SECRET'),
      });
      context.switchToWs().getClient().user = user;
    } catch {
      throw new WsException('unauthorized');
    }
    return true;
  }

  private extractTokenFromContext(context: any): string | undefined {
    if (context.args[0].handshake.auth.Bearer) {
      return context.args[0].handshake.auth.Bearer;
    }
    const [type, token] =
      context.args[0].handshake.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
