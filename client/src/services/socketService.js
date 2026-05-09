import { getAppUrl } from './runtimeConfig';

export const formatUrl = async (roomId) => {
  const appUrl = await getAppUrl();
  return `${appUrl.replace(/\/$/, '')}/meeting/${roomId}`;
};
