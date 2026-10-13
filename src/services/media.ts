import axios from 'axios';
import api from './api';
export type UploadPurpose = 'team-logo' | 'player-photo' | 'badge-image';
export interface UploadTarget {
  purpose: UploadPurpose;
  entityId?: string;
  playerType?: 'team' | 'quarterly';
}
export interface StoredMedia {
  storageKey: string;
  contentType: string;
  size: number;
}
export interface UploadedImage extends StoredMedia {
  uploadId: string;
  entityId: string;
  url: string;
}
export async function uploadImage(
  file: File,
  target: UploadTarget,
  progress?: (value: number) => void,
): Promise<UploadedImage> {
  const { data: authorization } = await api.post<{
    uploadId: string;
    upload: { url: string; fields: Record<string, string> };
  }>('/api/media/presign', {
    ...target,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
  const form = new FormData();
  for (const [name, value] of Object.entries(authorization.upload.fields))
    form.append(name, value);
  form.append('file', file);
  // Never use the authenticated app client for a third-party upload destination.
  await axios.post(authorization.upload.url, form, {
    withCredentials: false,
    timeout: 60000,
    onUploadProgress: (event) =>
      progress?.(Math.round((event.loaded / (event.total || file.size)) * 100)),
  });
  return (
    await api.post<UploadedImage>(
      `/api/media/${authorization.uploadId}/complete`,
    )
  ).data;
}
export async function getPlayerPhotoPreview(id: string): Promise<string> {
  return (await api.get<{ url: string }>(`/api/media/players/${id}/photo`)).data
    .url;
}
