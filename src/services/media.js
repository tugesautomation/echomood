import * as FileSystem from 'expo-file-system';

const CLOUD_NAME = 'dwluibayg';
const API_KEY = '715686365719774';
const API_SECRET = 'TU_NUEVO_API_SECRET';

function sha1(str) {
  // En React Native usamos fetch a la API de Cloudinary con unsigned upload
  return str;
}

export async function subirImagen(uri) {
  try {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const type = 'image/jpeg';

    formData.append('file', { uri, name: filename, type });
    formData.append('upload_preset', 'echomood_unsigned');
    formData.append('folder', 'echomood/fotos');

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
    throw new Error(data.error?.message ?? 'Error subiendo imagen');
  } catch (e) {
    console.error('Error subiendo imagen:', e);
    return null;
  }
}

export async function subirAudio(uri) {
  try {
    const formData = new FormData();
    const filename = 'audio_' + Date.now() + '.m4a';

    formData.append('file', { uri, name: filename, type: 'audio/m4a' });
    formData.append('upload_preset', 'echomood_unsigned');
    formData.append('folder', 'echomood/audios');
    formData.append('resource_type', 'video');

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      { method: 'POST', body: formData }
    );
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
    throw new Error(data.error?.message ?? 'Error subiendo audio');
  } catch (e) {
    console.error('Error subiendo audio:', e);
    return null;
  }
}