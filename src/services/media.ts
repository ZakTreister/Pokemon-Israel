import api from './api';
export interface UploadedImage {
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
}
export async function uploadImage(file: File): Promise<UploadedImage> {
  return (
    await api.post<UploadedImage>('/api/media/images', file, {
      headers: { 'Content-Type': file.type },
      timeout: 30000,
    })
  ).data;
}
