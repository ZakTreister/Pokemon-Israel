export interface Deck {
  id: string;
  archetype: string;
  image: string; // Legacy image field for backward compatibility
  iconImage1?: string | null;
  iconImage2?: string | null;
  attackerImage1?: string | null;
  attackerImage2?: string | null;
}