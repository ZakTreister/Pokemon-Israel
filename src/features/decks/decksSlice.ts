import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import decksService from './decksService';
import { Deck } from '../../types/deck';

interface DecksState {
  decks: Deck[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DecksState = {
  decks: [],
  isLoading: false,
  error: null,
};

export const fetchDecks = createAsyncThunk(
  'decks/fetchAll',
  async (_, thunkAPI) => {
    try {
      return await decksService.getDecks();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בטעינת הדקים';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createDeck = createAsyncThunk(
  'decks/create',
  async (deckData: { archetype: string; image: string }, thunkAPI) => {
    try {
      return await decksService.createDeck(deckData);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה ביצירת הדק';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateDeck = createAsyncThunk(
  'decks/update',
  async ({ id, deckData }: { id: string; deckData: { archetype: string; image: string } }, thunkAPI) => {
    try {
      return await decksService.updateDeck(id, deckData);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בעדכון הדק';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteDeck = createAsyncThunk(
  'decks/delete',
  async (id: string, thunkAPI) => {
    try {
      await decksService.deleteDeck(id);
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה במחיקת הדק';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const decksSlice = createSlice({
  name: 'decks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDecks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDecks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.decks = action.payload;
      })
      .addCase(fetchDecks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createDeck.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createDeck.fulfilled, (state, action) => {
        state.isLoading = false;
        state.decks.push(action.payload);
      })
      .addCase(createDeck.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateDeck.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDeck.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.decks.findIndex(deck => deck.id === action.payload.id);
        if (index !== -1) {
          state.decks[index] = action.payload;
        }
      })
      .addCase(updateDeck.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteDeck.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDeck.fulfilled, (state, action) => {
        state.isLoading = false;
        state.decks = state.decks.filter(deck => deck.id !== action.payload);
      })
      .addCase(deleteDeck.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = decksSlice.actions;
export default decksSlice.reducer;