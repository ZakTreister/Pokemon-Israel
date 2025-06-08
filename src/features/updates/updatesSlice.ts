import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import updatesService from './updatesService';
import { Update } from '../../types/update';

interface UpdatesState {
  updates: Update[];
  isLoading: boolean;
  error: string | null;
}

const initialState: UpdatesState = {
  updates: [],
  isLoading: false,
  error: null,
};

export const fetchUpdates = createAsyncThunk(
  'updates/fetchAll',
  async (_, thunkAPI) => {
    try {
      return await updatesService.getUpdates();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בטעינת העדכונים';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const updatesSlice = createSlice({
  name: 'updates',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUpdates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUpdates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.updates = action.payload;
      })
      .addCase(fetchUpdates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = updatesSlice.actions;
export default updatesSlice.reducer;