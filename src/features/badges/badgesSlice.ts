import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import badgesService from './badgesService';
import type {
  BadgeDefinition,
  BadgeAward,
  CreateBadgeInput,
  UpdateBadgeInput,
} from '../../types/badge';

interface BadgesState {
  badges: BadgeDefinition[];
  awards: BadgeAward[];
  isLoading: boolean;
  error: string | null;
}

const initialState: BadgesState = {
  badges: [],
  awards: [],
  isLoading: false,
  error: null,
};

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export const fetchBadges = createAsyncThunk(
  'badges/fetchAll',
  async (_, thunkAPI) => {
    try {
      return await badgesService.getBadges();
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה בטעינת תגים';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const fetchBadgeAwards = createAsyncThunk(
  'badges/fetchAwards',
  async (params: { playerId?: string; teamId?: string } | undefined, thunkAPI) => {
    try {
      return await badgesService.getBadgeAwards(params);
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה בטעינת הענקות';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createBadge = createAsyncThunk(
  'badges/create',
  async (input: CreateBadgeInput, thunkAPI) => {
    try {
      return await badgesService.createBadge(input);
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה ביצירת תג';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateBadge = createAsyncThunk(
  'badges/update',
  async ({ id, input }: { id: string; input: UpdateBadgeInput }, thunkAPI) => {
    try {
      return await badgesService.updateBadge(id, input);
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה בעדכון תג';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const awardBadge = createAsyncThunk(
  'badges/award',
  async ({ badgeId, playerId }: { badgeId: string; playerId: string }, thunkAPI) => {
    try {
      return await badgesService.awardBadge(badgeId, playerId);
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה בהענקת תג';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const badgesSlice = createSlice({
  name: 'badges',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBadges.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBadges.fulfilled, (state, action) => {
        state.isLoading = false;
        state.badges = action.payload;
      })
      .addCase(fetchBadges.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBadgeAwards.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBadgeAwards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.awards = action.payload;
      })
      .addCase(fetchBadgeAwards.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createBadge.fulfilled, (state, action) => {
        state.badges.push(action.payload);
      })
      .addCase(updateBadge.fulfilled, (state, action) => {
        state.badges = state.badges.map((b) =>
          b.id === action.payload.id ? action.payload : b
        );
      })
      .addCase(awardBadge.fulfilled, (state, action) => {
        state.awards.unshift(action.payload);
      });
  },
});

export const { clearError } = badgesSlice.actions;
export default badgesSlice.reducer;
