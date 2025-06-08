import api from '../../services/api';

const login = async (credentials: { username: string; password: string }) => {
  const { data } = await api.post('/auth/login', credentials);
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  return data;
};

const register = async (userData: { username: string; email?: string; password: string; phone: string }) => {
  const { data } = await api.post('/auth/register', userData);
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  return data;
};

const checkAuth = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No token found');
  }

  const { data } = await api.get('/auth/profile');
  return { token, user: data };
};

const authService = {
  login,
  register,
  checkAuth,
};

export default authService;