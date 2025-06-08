import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from './authService';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'player';
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, thunkAPI) => {
    try {
      return await authService.login(credentials);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'התחברות נכשלה';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { username: string; email?: string; password: string; phone: string }, thunkAPI) => {
    try {
      return await authService.register(userData);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'הרשמה נכשלה';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, thunkAPI) => {
    try {
      return await authService.checkAuth();
    } catch (error) {
      // Just return null if not authenticated - not an error
      return null;
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        
        // Decode the JWT to get user data
        try {
          const decoded = jwtDecode<User>(action.payload.token);
          state.user = decoded;
        } catch (e) {
          console.error('Failed to decode token', e);
        }
        
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        
        // Decode the JWT to get user data
        try {
          const decoded = jwtDecode<User>(action.payload.token);
          state.user = decoded;
        } catch (e) {
          console.error('Failed to decode token', e);
        }
        
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (action.payload) {
          state.isAuthenticated = true;
          state.token = action.payload.token;
          
          // Decode the JWT to get user data
          try {
            const decoded = jwtDecode<User>(action.payload.token);
            state.user = decoded;
          } catch (e) {
            console.error('Failed to decode token', e);
          }
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        }
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;