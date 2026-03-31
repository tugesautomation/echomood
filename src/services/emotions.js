import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import * as Location from "expo-location";
import { obtenerOCrearPerfil } from "./perfiles";
import { Platform } from "react-native";
import { getDocs, where, updateDoc } from 'firebase/firestore';

function difuminarUbicacion(lat, lng) {
  const radio = Math.random() * 0.015 + 0.005;
  const angulo = Math.random() * 2 * Math.PI;
  return {
    lat: lat + radio * Math.cos(angulo),
    lng: lng + radio * Math.sin(angulo),
  };
}

export async function obtenerUbicacion() {
  try {
    let lat, lng;

    if (Platform.OS === "web") {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
        });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({}),
        new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      if (!loc) return null;
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    }

    const coords = difuminarUbicacion(lat, lng);

    let ciudad = null;
    let pais = null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`,
        { headers: { "Accept-Language": "es", "User-Agent": "EchoMood/1.0" } },
      );
      const data = await res.json();
      ciudad =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        null;
      pais = data.address?.country || null;
    } catch (_) {}

    return { ...coords, ciudad, pais };
  } catch (error) {
    console.error("Error obteniendo ubicación:", error);
    return null;
  }
}

export async function publicarEmocion(
  userId,
  emotion,
  texto = "",
  ubicacionExistente = null,
) {
  const ubicacion = ubicacionExistente ?? (await obtenerUbicacion());

  if (!ubicacion) {
    return { ok: false, error: "ubicacion" };
  }

  const expiraEn = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const perfil = await obtenerOCrearPerfil(userId);

  await setDoc(doc(db, "estados", userId), {
    userId,
    emotion: emotion.label,
    color: emotion.color,
    emoji: emotion.emoji,
    texto: texto.slice(0, 100),
    timestamp: serverTimestamp(),
    expiraEn,
    ubicacion,
    expirado: false,
    nombre: perfil.nombre,
    avatar: perfil.avatar,
  });

  try {
    const {
      collection: col,
      query: q,
      where,
      getDocs,
      updateDoc,
    } = await import("firebase/firestore");
    const chatsRef = col(db, "chats");
    const snap = await getDocs(
      q(chatsRef, where("usuarios", "array-contains", userId)),
    );
    snap.docs.forEach(async (chatDoc) => {
      const data = chatDoc.data();
      if (data.bloqueados && data.bloqueados.length > 0) {
        await updateDoc(chatDoc.ref, { bloqueados: [] });
      }
    });
  } catch (_) {}

  return { ok: true };
}

export async function editarTexto(userId, texto) {
  const expiraEn = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const perfil = await obtenerOCrearPerfil(userId);
  await setDoc(doc(db, 'estados', userId), {
    texto: texto.slice(0, 100),
    expiraEn,
    timestamp: serverTimestamp(),
    expirado: false,
    nombre: perfil.nombre,
    avatar: perfil.avatar,
  }, { merge: true });

  // Limpiar bloqueos al editar texto
  try {
    const chatsSnap = await getDocs(
      query(collection(db, 'chats'), where('usuarios', 'array-contains', userId))
    );
    chatsSnap.docs.forEach(async chatDoc => {
      const data = chatDoc.data();
      if (data.bloqueados && data.bloqueados.length > 0) {
        await updateDoc(chatDoc.ref, { bloqueados: [] });
      }
    });
  } catch (_) {}
}

export async function prolongarEmocion(userId) {
  const snap = await getDoc(doc(db, "estados", userId));
  if (!snap.exists()) return;
  const data = snap.data();
  const expiraEn = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  await setDoc(doc(db, "estados", userId), {
    ...data,
    expiraEn,
    timestamp: serverTimestamp(),
    expirado: false,
  });
}

export async function borrarEmocion(userId) {
  await deleteDoc(doc(db, "estados", userId));
}

export async function obtenerMiEmocion(userId) {
  const snap = await getDoc(doc(db, "estados", userId));
  if (!snap.exists()) return null;
  const data = snap.data();

  const haExpirado = data.expiraEn && new Date(data.expiraEn) < new Date();

  if (haExpirado && !data.expirado) {
    await setDoc(
      doc(db, "estados", userId),
      {
        expirado: true,
      },
      { merge: true },
    );
    return { ...data, expirado: true };
  }

  return data;
}
