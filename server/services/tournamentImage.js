// Historical generated defaults may still exist in saved tournament records.
// Treat them as absent rather than overwriting every old document.
export function tournamentImage(value) {
  if(typeof value!=='string')return '';
  const image=value.trim();
  if(image==='/pokemon_kids_logo.png'||/^https:\/\/images\.pexels\.com\/photos\/163064\/play-stone-network-networked-interactive-163064\.jpeg(?:\?.*)?$/i.test(image))return '';
  return image;
}
