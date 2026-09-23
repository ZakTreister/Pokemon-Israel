import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import playersService from './playersService';
import type {
  Player,
  CreateQuarterlyPlayerInput,
  CreateTeamPlayerInput,
  UpdatePlayerInput,
} from '../../types/player';

interface PlayersState {
  players: Player[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PlayersState = {
  players: [],
  isLoading: false,
  error: null,
};

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export const fetchPlayers = createAsyncThunk(
  'players/fetchAll',
  async (
    params: { type?: 'team' | 'quarterly'; search?: string } | undefined,
    thunkAPI
  ) => {
    try {
      return await playersService.getPlayers(params);
    } catch (error) {
      const err = error as ApiError;
      const message =
        err.response?.data?.message || err.message || 'שגיאה בטעינת שחקנים';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createQuarterlyPlayer = createAsyncThunk(
  'players/createQuarterly',
  async (input: CreateQuarterlyPlayerInput, thunkAPI) => {
    try {
      return await playersService.createQuarterlyPlayer(input);
    } catch (error) {
      const err = error as ApiError;
      const message =
        err.response?.data?.message || err.message || 'שגיאה ביצירת שחקן חוגים';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createTeamPlayer = createAsyncThunk(
  'players/createTeam',
  async (input: CreateTeamPlayerInput, thunkAPI) => {
    try {
      return await playersService.createTeamPlayer(input);
    } catch (error) {
      const err = error as ApiError;
      const message =
        err.response?.data?.message || err.message || 'שגיאה ביצירת שחקן נבחרת';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updatePlayer = createAsyncThunk(
  'players/update',
  async (
    { id, input }: { id: string; input: UpdatePlayerInput },
    thunkAPI
  ) => {
    try {
      return await playersService.updatePlayer(id, input);
    } catch (error) {
      const err = error as ApiError;
      const message =
        err.response?.data?.message || err.message || 'שגיאה בעדכון שחקן';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const playersSlice = createSlice({
  name: 'players',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPlayers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.players = action.payload;
      })
      .addCase(fetchPlayers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createQuarterlyPlayer.fulfilled, (state, action) => {
        state.players.unshift(action.payload);
      })
      .addCase(createTeamPlayer.fulfilled, (state, action) => {
        state.players.unshift(action.payload);
      })
      .addCase(updatePlayer.fulfilled, (state, action) => {
        state.players = state.players.map((p) =>
          p.id === action.payload.id ? action.payload : p
        );
      });
  },
});

export const { clearError } = playersSlice.actions;
export default playersSlice.reducer;
