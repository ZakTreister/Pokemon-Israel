export interface Update {
  id: string;
  eventId?: string | null;
  teamIds?: string[];
  published?:boolean;
  showInNews?:boolean;
  showInFieldNews?:boolean;
  imageInGallery?:boolean;
  title: string;
  content: string;
  description?: string;
  descriptionHtml?: string;
  mobileHtml?: string;
  mobileEnabled?: boolean;
  image?: string;
  mediaItems?: import('./event').EventMedia[];
  ctaText?: string;
  ctaUrl?: string;
  date: string;
}
export interface UpdateInput {
  title: string;
  description?: string;
  descriptionHtml?: string;
  mobileHtml?: string;
  mobileEnabled?: boolean;
  ctaText: string;
  ctaUrl: string;
  imageUploadId?: string | null;
  eventId?: string | null;
  teamIds?: string[];
  published?:boolean;
  showInNews?:boolean;
  showInFieldNews?:boolean;
  imageInGallery?:boolean;
}
