import api from './axios';

export const getEmployees = () => api.get('/employees');
export const getAttendanceSummary = (id, month, year) =>
  api.get(`/attendance/summary/${id}?month=${month}&year=${year}`);