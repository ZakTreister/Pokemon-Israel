const configured = import.meta.env.VITE_RAV_MESSER_URL as string | undefined;
export const ravMesserUrl =
  configured && /^https?:\/\//i.test(configured) ? configured : null;
