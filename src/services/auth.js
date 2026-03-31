import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

export async function loginAnonimo() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Error en login anónimo:', error);
    return null;
  }
}

export function escucharUsuario(callback) {
  return onAuthStateChanged(auth, callback);
}