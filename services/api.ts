import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage as firebaseStorage } from './firebase';
import { supabase } from './supabase';
import { processImage } from '../utils/imageProcessor';

export const api = {
  /**
   * Upload image to Storage (Firebase or Supabase)
   */
  async uploadImage(file: File): Promise<string> {
    // 1. Process and compress image client-side first
    const dataUrl = await processImage(file);
    
    // Convert DataURL back to Blob for upload
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Generate unique path: images/{timestamp}_{filename}
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${timestamp}_${cleanName}`;

    // TRY SUPABASE FIRST
    if (supabase) {
        try {
            const { error } = await supabase.storage
                .from('images')
                .upload(fileName, blob, {
                    contentType: file.type,
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.warn("Supabase upload failed, falling back to Firebase if available.", error);
        }
    }

    // FALLBACK TO FIREBASE
    if (!firebaseStorage) {
        console.warn("Nenhum serviço de armazenamento configurado (Firebase ou Supabase). Usando DataURL local (não persistirá entre sessões longas).");
        return dataUrl; // Fallback to Data URL for offline mode
    }

    try {
      const storageRef = ref(firebaseStorage, `images/${fileName}`);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(`[STORAGE] Erro ao fazer upload:`, error);
      console.warn("Falha no upload, usando DataURL local.");
      return dataUrl; // Fallback to Data URL
    }
  }
};