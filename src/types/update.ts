export interface Update {
  id: string;
  title: string;
  content: string;
  description?: string;
  image?: string;
  ctaText?: string;
  ctaUrl?: string;
  date: string;
}
export interface UpdateInput {
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  imageUploadId?: string | null;
}
