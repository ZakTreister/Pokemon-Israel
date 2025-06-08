import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import userService from './userService';
import { PlayerStats, UserTournament } from '../../types/user';

interface UserState {
  stats: PlayerStats | null;
  tournaments: UserTournament[];
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  stats: null,
  tournaments: [],
  isLoading: false,
  error: null,
};

export const fetchUserStats = createAsyncThunk(
  'user/fetchStats',
  async (_, thunkAPI) => {
    try {
      return await userService.getUserStats();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בטעינת נתוני המשתמש';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const fetchUserTournaments = createAsyncThunk(
  'user/fetchTournaments',
  async (_, thunkAPI) => {
    try {
      return await userService.getUserTournaments();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בטעינת טורנירי המשתמש';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUserTournaments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserTournaments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tournaments = action.payload;
      })
      .addCase(fetchUserTournaments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;