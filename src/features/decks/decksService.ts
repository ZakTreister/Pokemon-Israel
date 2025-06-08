import api from '../../services/api';
import { Deck } from '../../types/deck';

const getDecks = async () => {
  const { data } = await api.get<Deck[]>('/api/decks');
  return data;
};

const createDeck = async (deckData: { archetype: string; image: string }) => {
  const { data } = await api.post<Deck>('/api/decks', deckData);
  return data;
};

const updateDeck = async (id: string, deckData: { archetype: string; image: string }) => {
  const { data } = await api.put<Deck>(`/api/decks/${id}`, deckData);
  return data;
};

const deleteDeck = async (id: string) => {
  await api.delete(`/api/decks/${id}`);
};

const decksService = {
  getDecks,
  createDeck,
  updateDeck,
  deleteDeck,
};

export default decksService;