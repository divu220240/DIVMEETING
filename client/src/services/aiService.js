import { request } from './api';

export const generateMeetingInsights = async ({ title, roomId, notes, messages, briefType }) => {
  return request('/ai/meeting-insights', {
    method: 'POST',
    body: JSON.stringify({ title, roomId, notes, messages, briefType }),
  });
};

export const chatWithMeetingAssistant = async ({ title, roomId, notes, messages, assistantMessages, prompt }) => {
  return request('/ai/meeting-chat', {
    method: 'POST',
    body: JSON.stringify({ title, roomId, notes, messages, assistantMessages, prompt }),
  });
};
