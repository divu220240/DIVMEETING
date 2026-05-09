import { request } from './api';

export const createMeeting = async ({ title }) => {
  return request('/meetings', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
};

export const getMeetingHistory = async () => {
  return request('/meetings/history');
};

export const getMeetingById = async (roomId) => {
  return request(`/meetings/${roomId}`);
};
