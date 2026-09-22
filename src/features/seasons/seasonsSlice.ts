import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import seasonsService from './seasonsService';
import type { Season } from '../../types/season';

interface SeasonsState {
  seasons: Season[];
  activeSeason: Season | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SeasonsState = {
  seasons: [],
  activeSeason: null,
  isLoading: false,
  error: null,
};

export const fetchSeasons = createAsyncThunk(
  'seasons/fetchAll',
  async (_, thunkAPI) => {
    try {
      return await seasonsService.getSeasons();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message = err.response?.data?.message || err.message || 'שגיאה בטעינת עונות';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const fetchActiveSeason = createAsyncThunk(
  'seasons/fetchActive',
  async (_, thunkAPI) => {
    try {
      return await seasonsService.getActiveSeason();
    } catch (error) {
      const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (err.response?.status === 404) {
        return null;
      }
      const message = err.response?.data?.message || err.message || 'שגיאה בטעינת עונה פעילה';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createSeason = createAsyncThunk(
  'seasons/create',
  async (name: string, thunkAPI) => {
    try {
      return await seasonsService.createSeason(name);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message = err.response?.data?.message || err.message || 'שגיאה ביצירת עונה';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const closeSeason = createAsyncThunk(
  'seasons/close',
  async (id: string, thunkAPI) => {
    try {
      return await seasonsService.closeSeason(id);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message = err.response?.data?.message || err.message || 'שגיאה בסגירת עונה';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const seasonsSlice = createSlice({
  name: 'seasons',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeasons.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSeasons.fulfilled, (state, action) => {
        state.isLoading = false;
        state.seasons = action.payload;
        state.activeSeason = action.payload.find((s: Season) => s.status === 'active') || null;
      })
      .addCase(fetchSeasons.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchActiveSeason.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchActiveSeason.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeSeason = action.payload;
      })
      .addCase(fetchActiveSeason.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createSeason.fulfilled, (state, action) => {
        state.seasons.unshift(action.payload);
        state.activeSeason = action.payload;
      })
      .addCase(closeSeason.fulfilled, (state, action) => {
        state.seasons = state.seasons.map((s) =>
          s.id === action.payload.id ? action.payload : s
        );
        state.activeSeason = null;
      });
  },
});

export const { clearError } = seasonsSlice.actions;
export default seasonsSlice.reducer;
