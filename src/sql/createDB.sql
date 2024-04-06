BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DROP TABLE IF EXISTS private_chat_room;
DROP TABLE IF EXISTS friend_request;
DROP TABLE IF EXISTS user_plays_game;
DROP TABLE IF EXISTS users_are_friends;
DROP TABLE IF EXISTS game;
DROP TYPE IF EXISTS PushPosition;
DROP TYPE IF EXISTS Color;
DROP TABLE IF EXISTS chat_message;
DROP TABLE IF EXISTS users_in_chatroom;
DROP TABLE IF EXISTS chat_room;
DROP TABLE IF EXISTS users;


CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
  email varchar(320) UNIQUE NOT NULL,
  username varchar(20) UNIQUE NOT NULL,
  password varchar(200) NOT NULL,
  gamesWon INT DEFAULT 0,
  gamesLost INT DEFAULT 0,
  UNIQUE(email),
  UNIQUE(username)
);

CREATE TABLE IF NOT EXISTS chat_room (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS private_chat_room (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
  usersA UUID NOT NULL references users,
  usersB UUID NOT NULL references users
);

CREATE TABLE IF NOT EXISTS users_in_chatroom (
  chat_room UUID NOT NULL references chat_room,
  users UUID NOT NULL references users,
  UNIQUE(chat_room, users)
);

CREATE TABLE IF NOT EXISTS chat_message (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
  chat_room UUID NOT NULL references chat_room,
  users UUID NOT NULL references users,
  message TEXT,
  time_of_send TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS game (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
  gameStarted TIMESTAMP NOT NULL,
  gameEnded TIMESTAMP,
  gameState jsonb NOT NULL,
  chat_room UUID REFERENCES chat_room
);

CREATE TABLE IF NOT EXISTS friend_request (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
  initiator UUID NOT NULL references users,
  requested UUID NOT NULL references users,
  requestedAt timestamp NOT NULL,
  UNIQUE(initiator, requested)
);


CREATE TABLE IF NOT EXISTS users_are_friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
  userA UUID REFERENCES users NOT NULL,
  userB UUID REFERENCES users NOT NULL,
  since timestamp NOT NULL
);


CREATE TABLE IF NOT EXISTS user_plays_game (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
  game UUID NOT NULL REFERENCES game,
  userID UUID NOT NULL REFERENCES users,
  playerIndex INT NOT NULL,
  UNIQUE(game, userID)
);
COMMIT;