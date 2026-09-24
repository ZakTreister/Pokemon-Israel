import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import teamsService from './teamsService';
import type {
  Team,
  ManageablePlayer,
  CreateTeamInput,
  UpdateTeamInput,
} from '../../types/team';

interface TeamsState {
  teams: Team[];
  manageablePlayers: ManageablePlayer[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TeamsState = {
  teams: [],
  manageablePlayers: [],
  isLoading: false,
  error: null,
};

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export const fetchTeams = createAsyncThunk(
  'teams/fetchAll',
  async (_, thunkAPI) => {
    try {
      return await teamsService.getTeams();
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה בטעינת קבוצות';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const fetchManageablePlayers = createAsyncThunk(
  'teams/fetchManageablePlayers',
  async (_, thunkAPI) => {
    try {
      return await teamsService.getManageablePlayers();
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה בטעינת שחקנים';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createTeam = createAsyncThunk(
  'teams/create',
  async (input: CreateTeamInput, thunkAPI) => {
    try {
      return await teamsService.createTeam(input);
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה ביצירת קבוצה';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateTeam = createAsyncThunk(
  'teams/update',
  async ({ id, input }: { id: string; input: UpdateTeamInput }, thunkAPI) => {
    try {
      return await teamsService.updateTeam(id, input);
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה בעדכון קבוצה';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const assignPlayer = createAsyncThunk(
  'teams/assignPlayer',
  async ({ teamId, playerId }: { teamId: string; playerId: string }, thunkAPI) => {
    try {
      return await teamsService.assignPlayer(teamId, playerId);
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה בשיוך שחקן';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const removePlayer = createAsyncThunk(
  'teams/removePlayer',
  async ({ teamId, playerId }: { teamId: string; playerId: string }, thunkAPI) => {
    try {
      return await teamsService.removePlayer(teamId, playerId);
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.message || err.message || 'שגיאה בהסרת שחקן';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.isLoading = false;
        state.teams = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchManageablePlayers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchManageablePlayers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.manageablePlayers = action.payload;
      })
      .addCase(fetchManageablePlayers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.teams.push(action.payload);
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.teams = state.teams.map((t) =>
          t.id === action.payload.id ? action.payload : t
        );
      })
      .addCase(assignPlayer.fulfilled, (state, action) => {
        state.manageablePlayers = state.manageablePlayers.map((p) =>
          p.id === action.payload.id ? action.payload : p
        );
        state.teams = state.teams.map((t) => {
          if (t.id === action.payload.team?.id) {
            return { ...t, playerCount: t.playerCount + 1 };
          }
          return t;
        });
      })
      .addCase(removePlayer.fulfilled, (state, action) => {
        state.manageablePlayers = state.manageablePlayers.map((p) =>
          p.id === action.payload.id ? action.payload : p
        );
        state.teams = state.teams.map((t) => {
          if (t.playerCount > 0) {
            return { ...t, playerCount: t.playerCount - 1 };
          }
          return t;
        });
      });
  },
});

export const { clearError } = teamsSlice.actions;
export default teamsSlice.reducer;
