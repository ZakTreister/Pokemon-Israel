import type { Update } from '../../../types/update';
import Button from '../../../components/ui/Button';
export default function UpdateAction({ update }: { update: Update }) {
  return update.ctaText &&
    update.ctaUrl &&
    /^https?:\/\//i.test(update.ctaUrl) ? (
    <Button asChild variant="outline">
      <a href={update.ctaUrl} target="_blank" rel="noopener noreferrer">
        {update.ctaText}
      </a>
    </Button>
  ) : null;
}
