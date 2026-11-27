import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse } from '@schoolos/types';
import type { NewSchoolPost, PostTargets, SchoolPost, SchoolPostKind } from '../types';

const BASE = '/school-posts';

async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    return (await request).data.data as T;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export const schoolPostsApi = {
  getTargets: () => unwrap<PostTargets>(apiClient.get(`${BASE}/targets`)),

  list: (kind?: SchoolPostKind) =>
    unwrap<SchoolPost[]>(apiClient.get(BASE, { params: kind ? { kind } : undefined })),

  create(post: NewSchoolPost) {
    const form = new FormData();
    form.append('kind', post.kind);
    form.append('title', post.title);
    form.append('description', post.description);
    form.append('classes', JSON.stringify(post.classes));
    if (post.subject) form.append('subject', post.subject);
    if (post.dueDate) form.append('dueDate', post.dueDate);
    if (post.category) form.append('category', post.category);
    if (post.activityDate) form.append('activityDate', post.activityDate);
    post.photos.forEach((photo, i) => form.append('photos', photo, `photo-${i + 1}.jpg`));
    return unwrap<SchoolPost>(
      apiClient.post(BASE, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    );
  },

  remove: (id: string) => unwrap<null>(apiClient.delete(`${BASE}/${id}`)),

  // Photos need the signed-in user's token, so they are fetched as blobs
  // rather than put straight into <img src>.
  async getPhoto(postId: string, photoId: string): Promise<Blob> {
    const res = await apiClient.get<Blob>(`${BASE}/${postId}/photos/${photoId}`, { responseType: 'blob' });
    return res.data;
  },
};
