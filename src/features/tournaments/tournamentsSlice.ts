import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import tournamentsService from './tournamentsService';
import { Tournament } from '../../types/tournament';

interface TournamentsState {
  tournaments: Tournament[];
  activeTournament: Tournament | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: TournamentsState = {
  tournaments: [],
  activeTournament: null,
  isLoading: false,
  error: null,
};

export const fetchTournaments = createAsyncThunk(
  'tournaments/fetchAll',
  async (_, thunkAPI) => {
    try {
      return await tournamentsService.getTournaments();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בטעינת הטורנירים';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const fetchTournamentById = createAsyncThunk(
  'tournaments/fetchById',
  async (id: string, thunkAPI) => {
    try {
      return await tournamentsService.getTournamentById(id);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בטעינת הטורניר';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const registerForTournament = createAsyncThunk(
  'tournaments/register',
  async (tournamentId: string, thunkAPI) => {
    try {
      return await tournamentsService.registerForTournament(tournamentId);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בהרשמה לטורניר';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const unregisterFromTournament = createAsyncThunk(
  'tournaments/unregister',
  async (tournamentId: string, thunkAPI) => {
    try {
      return await tournamentsService.unregisterFromTournament(tournamentId);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בביטול ההרשמה';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const tournamentsSlice = createSlice({
  name: 'tournaments',
  initialState,
  reducers: {
    clearActiveTournament: (state) => {
      state.activeTournament = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTournaments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTournaments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tournaments = action.payload;
      })
      .addCase(fetchTournaments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTournamentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTournamentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeTournament = action.payload;
      })
      .addCase(fetchTournamentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(registerForTournament.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerForTournament.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Update the tournaments list with updated registration count
        if (state.activeTournament && state.activeTournament.id === action.payload.id) {
          state.activeTournament = action.payload;
        }
        
        state.tournaments = state.tournaments.map((tournament) => 
          tournament.id === action.payload.id ? action.payload : tournament
        );
      })
      .addCase(registerForTournament.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(unregisterFromTournament.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(unregisterFromTournament.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Update the tournaments list with updated registration count
        if (state.activeTournament && state.activeTournament.id === action.payload.id) {
          state.activeTournament = action.payload;
        }
        
        state.tournaments = state.tournaments.map((tournament) => 
          tournament.id === action.payload.id ? action.payload : tournament
        );
      })
      .addCase(unregisterFromTournament.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearActiveTournament, clearError } = tournamentsSlice.actions;
export default tournamentsSlice.reducer;