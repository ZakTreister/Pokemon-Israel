export interface Update {
  id: string;
  eventId?: string | null;
  teamIds?: string[];
  showInFieldNews?:boolean;
  imageInGallery?:boolean;
  title: string;
  content: string;
  description?: string;
  image?: string;
  mediaItems?: import('./event').EventMedia[];
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
  eventId?: string | null;
  teamIds?: string[];
  showInFieldNews?:boolean;
  imageInGallery?:boolean;
}
