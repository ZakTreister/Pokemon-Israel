export const TRIAL_REGISTRATION_URL = 'https://lp.cardschool.co.il';
export function isPublicPage(path: string) {
  return (
    path === '/' ||
    /^\/(rankings|all-stars|teams|tournaments|news|store|birthday)(\/|$)/.test(
      path,
    )
  );
}
