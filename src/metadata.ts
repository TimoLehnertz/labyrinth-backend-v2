/* eslint-disable */
export default async () => {
  const t = {
    ['./users/friends/entities/friendRequest.entity']: await import(
      './users/friends/entities/friendRequest.entity'
    ),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('./users/entities/user.entity'),
          {
            User: {
              id: { required: true, type: () => String },
              email: { required: true, type: () => String },
              username: { required: true, type: () => String },
              password: { required: true, type: () => String },
            },
          },
        ],
        [
          import('./users/friends/entities/friendship.entity'),
          {
            Friendship: {
              id: { required: true, type: () => String },
              userA: { required: true, type: () => String },
              userB: { required: true, type: () => String },
              since: { required: true, type: () => Date },
            },
          },
        ],
        [
          import('./users/friends/entities/friendRequest.entity'),
          {
            FriendRequest: {
              id: { required: true, type: () => String },
              initiator: { required: true, type: () => String },
              requested: { required: true, type: () => String },
              requestedAt: { required: true, type: () => Date },
            },
          },
        ],
        [
          import('./users/friends/dto/deleteFriendRequest.dto'),
          { DeleteFriendRequestDto: {} },
        ],
        [import('./auth/entities/jwtUser.entity'), { JWTUser: {} }],
      ],
      controllers: [
        [
          import('./app.controller'),
          { AppController: { getHello: { type: String } } },
        ],
        [
          import('./users/users.controller'),
          { UsersController: { register: {} } },
        ],
        [
          import('./users/friends/friends.controller'),
          {
            FriendsController: {
              addFriendRequest: {},
              getSendFriendRequests: {
                type: [
                  t['./users/friends/entities/friendRequest.entity']
                    .FriendRequest,
                ],
              },
              deleteFriendRequest: {},
              getFriendRequests: {
                type: [
                  t['./users/friends/entities/friendRequest.entity']
                    .FriendRequest,
                ],
              },
            },
          },
        ],
        [
          import('./auth/auth.controller'),
          { AuthController: { signIn: {}, getProfile: { type: Object } } },
        ],
      ],
    },
  };
};
