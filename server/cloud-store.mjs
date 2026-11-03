import { createYdbStore } from './ydb.mjs';
import { createNativeYdbStore } from './ydb-native.mjs';

export const createCloudStore = ({ driver = 'native', ...options }) => {
  if (driver === 'document') return createYdbStore(options);
  if (driver === 'native') return createNativeYdbStore(options);
  throw new Error('Unknown database driver');
};
