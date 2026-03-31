import {
  collection, doc, setDoc, getDoc, onSnapshot,
  addDoc, serverTimestamp, query, where, orderBy,
  updateDoc, getDocs
} from 'firebase/firestore';
import { db } from './firebase';

export function chatId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

export async function iniciarOAbrirChat(miId, otroId, miEstado, otroEstado) {
  const id = chatId(miId, otroId);
  const ref = doc(db, 'chats', id);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    if (data.fase === 'expirado') {
      await setDoc(ref, {
        id,
        usuarios: [miId, otroId],
        iniciador: miId,
        fase: 'efimero',
        expiraEn: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        creadoEn: serverTimestamp(),
        ultimoMensaje: null,
        ultimoMensajeAt: null,
        resonancia: { [miId]: false, [otroId]: false },
        leido: { [miId]: true, [otroId]: false },
        estadoA: miEstado,
        estadoB: otroEstado,
        bloqueados: [],
      });
    }
    return id;
  }

  await setDoc(ref, {
    id,
    usuarios: [miId, otroId],
    iniciador: miId,
    fase: 'efimero',
    expiraEn: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    creadoEn: serverTimestamp(),
    ultimoMensaje: null,
    ultimoMensajeAt: null,
    resonancia: { [miId]: false, [otroId]: false },
    leido: { [miId]: true, [otroId]: false },
    estadoA: miEstado,
    estadoB: otroEstado,
    bloqueados: [],
  });

  return id;
}

export async function enviarMensaje(chatIdStr, userId, texto) {
  const ref = doc(db, 'chats', chatIdStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const data = snap.data();
  const haExpirado = data.fase === 'efimero' &&
    data.expiraEn && new Date(data.expiraEn) < new Date();
  if (haExpirado) return false;

  await addDoc(collection(db, 'chats', chatIdStr, 'mensajes'), {
    userId,
    texto,
    timestamp: serverTimestamp(),
    leido: false,
  });

  const otroId = data.usuarios.find(u => u !== userId);
  await updateDoc(ref, {
    ultimoMensaje: texto.slice(0, 50),
    ultimoMensajeAt: serverTimestamp(),
    [`leido.${otroId}`]: false,
    [`leido.${userId}`]: true,
  });

  return true;
}

export async function marcarLeido(chatIdStr, userId) {
  await updateDoc(doc(db, 'chats', chatIdStr), {
    [`leido.${userId}`]: true,
  });
}

export async function resonar(chatIdStr, userId) {
  const ref = doc(db, 'chats', chatIdStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const otroId = data.usuarios.find(u => u !== userId);
  const nuevaResonancia = { ...data.resonancia, [userId]: true };

  if (nuevaResonancia[otroId] === true) {
    await updateDoc(ref, {
      resonancia: nuevaResonancia,
      fase: 'persistente',
      expiraEn: null,
    });
  } else {
    await updateDoc(ref, { resonancia: nuevaResonancia });
  }
}

export async function bloquearEstado(chatIdStr, userId) {
  const ref = doc(db, 'chats', chatIdStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const bloqueados = data.bloqueados ?? [];
  if (!bloqueados.includes(userId)) {
    await updateDoc(ref, { bloqueados: [...bloqueados, userId] });
  }
}

export function escucharMisChats(userId, callback) {
  const q = query(
    collection(db, 'chats'),
    where('usuarios', 'array-contains', userId),
    orderBy('ultimoMensajeAt', 'desc')
  );
  return onSnapshot(q, snapshot => {
    const chats = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.fase !== 'expirado' || c.ultimoMensaje);
    callback(chats);
  });
}

export function escucharMensajes(chatIdStr, callback) {
  const q = query(
    collection(db, 'chats', chatIdStr, 'mensajes'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, snapshot => {
    const mensajes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(mensajes);
  });
}

export async function verificarYExpirarChat(chatIdStr) {
  const ref = doc(db, 'chats', chatIdStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.fase === 'efimero' && data.expiraEn &&
    new Date(data.expiraEn) < new Date()) {
    await updateDoc(ref, { fase: 'expirado' });
    return { ...data, fase: 'expirado' };
  }
  return data;
}

export async function enviarMensajeMedia(chatIdStr, userId, tipo, url, duracion = null) {
  const ref = doc(db, 'chats', chatIdStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const data = snap.data();
  if (data.fase !== 'persistente') return false;

  await addDoc(collection(db, 'chats', chatIdStr, 'mensajes'), {
    userId,
    tipo,
    url,
    duracion,
    timestamp: serverTimestamp(),
    leido: false,
    reacciones: {},
  });

  const otroId = data.usuarios.find(u => u !== userId);
  const preview = tipo === 'imagen' ? '📷 Foto' : '🎤 Mensaje de voz';

  await updateDoc(ref, {
    ultimoMensaje: preview,
    ultimoMensajeAt: serverTimestamp(),
    [`leido.${otroId}`]: false,
    [`leido.${userId}`]: true,
  });

  return true;
}

export async function agregarReaccion(chatIdStr, mensajeId, userId, emoji) {
  const ref = doc(db, 'chats', chatIdStr, 'mensajes', mensajeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const reacciones = snap.data().reacciones ?? {};
  if (reacciones[userId] === emoji) {
    delete reacciones[userId];
  } else {
    reacciones[userId] = emoji;
  }

  await updateDoc(ref, { reacciones });
}

export async function marcarMensajesLeidos(chatIdStr, userId) {
  const q = query(
    collection(db, 'chats', chatIdStr, 'mensajes'),
    where('leido', '==', false)
  );
  const snap = await getDocs(q);
  const updates = snap.docs
    .filter(d => d.data().userId !== userId)
    .map(d => updateDoc(d.ref, { leido: true }));
  await Promise.all(updates);
  await updateDoc(doc(db, 'chats', chatIdStr), {
    [`leido.${userId}`]: true,
  });
}

export async function actualizarPresencia(userId, activo) {
  await setDoc(doc(db, 'presencia', userId), {
    activo,
    ultimaVez: serverTimestamp(),
  });
}

export function escucharPresencia(userId, callback) {
  return onSnapshot(doc(db, 'presencia', userId), snap => {
    if (!snap.exists()) { callback({ activo: false }); return; }
    callback(snap.data());
  });
}