import { DataSource } from 'typeorm';
import { newDb, DataType } from 'pg-mem';
import { v4 } from 'uuid';
import * as fs from 'fs';
import { User } from 'users/entities/user.entity';

export const setupDataSource = async () => {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  db.public.registerFunction({
    implementation: () => 'test',
    name: 'current_database',
  });

  db.registerExtension('uuid-ossp', (schema) => {
    schema.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.uuid,
      implementation: v4,
      impure: true,
    });
  });

  const createSQL = await fs.promises.readFile(
    './src/sql/createDB.sql',
    'utf8',
  );
  db.public.query(createSQL);
  db.public.registerFunction({
    name: 'version',
    implementation: () => 'dummy_version',
  });
  db.public.registerFunction({
    name: 'current_database',
    args: [],
    returns: DataType.text,
    implementation: (x) => `hello world ${x}`,
  });

  const ds: DataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [User],
    // entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
  });
  await ds.initialize();
  await ds.synchronize();

  return ds;
};
