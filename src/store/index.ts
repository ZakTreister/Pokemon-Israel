import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import tournamentsReducer from '../features/tournaments/tournamentsSlice';
import updatesReducer from '../features/updates/updatesSlice';
import userReducer from '../features/user/userSlice';
import decksReducer from '../features/decks/decksSlice';
import seasonsReducer from '../features/seasons/seasonsSlice';
import { setStore } from '../services/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tournaments: tournamentsReducer,
    updates: updatesReducer,
    user: userReducer,
    decks: decksReducer,
    seasons: seasonsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/loginSuccess', 'auth/checkAuth/fulfilled'],
        ignoredActionPaths: ['payload.timestamp', 'meta.arg'],
        ignoredPaths: ['auth.user', 'auth.token'],
      },
    }),
});

// Set the store instance in the API service after initialization
setStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;