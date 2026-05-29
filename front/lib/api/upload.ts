import { apiClient } from "@/lib/api/client";
import type { UploadedMedia } from "@/types/chat";

async function uploadFile(endpoint: string, file: File): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<UploadedMedia>(endpoint, form);
  return data;
}

export async function uploadImage(file: File): Promise<UploadedMedia> {
  return uploadFile("/upload/image", file);
}

export async function uploadDocument(file: File): Promise<UploadedMedia> {
  return uploadFile("/upload/document", file);
}

export async function uploadVoice(file: File): Promise<UploadedMedia> {
  return uploadFile("/upload/audio", file);
}
