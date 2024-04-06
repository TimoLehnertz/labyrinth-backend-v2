export class JWTUser {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly username: string,
  ) {}
}
