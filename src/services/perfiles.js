import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const palabras = {
  es: {
    adjetivos: [
      'Fugaz', 'Quieto', 'Lejano', 'Suave', 'Tenue', 'Oscuro',
      'Frío', 'Libre', 'Mudo', 'Roto', 'Solo', 'Gris',
      'Viejo', 'Lento', 'Seco', 'Perdido', 'Claro', 'Hondo',
      'Vivo', 'Sereno',
    ],
    sustantivos: [
      'Luna', 'Viento', 'Mar', 'Niebla', 'Eco', 'Luz',
      'Sombra', 'Bruma', 'Río', 'Nube', 'Tierra', 'Fuego',
      'Ola', 'Cielo', 'Piedra', 'Bosque', 'Aire', 'Alba',
      'Polvo', 'Roca',
    ],
  },
  en: {
    adjetivos: [
      'Fading', 'Quiet', 'Distant', 'Soft', 'Dim', 'Dark',
      'Cold', 'Free', 'Silent', 'Broken', 'Lone', 'Grey',
      'Old', 'Slow', 'Dry', 'Lost', 'Clear', 'Deep',
      'Vivid', 'Still',
    ],
    sustantivos: [
      'Moon', 'Wind', 'Sea', 'Mist', 'Echo', 'Light',
      'Shadow', 'Fog', 'River', 'Cloud', 'Earth', 'Fire',
      'Wave', 'Sky', 'Stone', 'Forest', 'Air', 'Dawn',
      'Dust', 'Rock',
    ],
  },
  fr: {
    adjetivos: [
      'Fugace', 'Calme', 'Lointain', 'Doux', 'Terne', 'Sombre',
      'Froid', 'Libre', 'Muet', 'Brisé', 'Seul', 'Gris',
      'Vieux', 'Lent', 'Sec', 'Perdu', 'Clair', 'Profond',
      'Vif', 'Serein',
    ],
    sustantivos: [
      'Lune', 'Vent', 'Mer', 'Brume', 'Écho', 'Lumière',
      'Ombre', 'Brouillard', 'Rivière', 'Nuage', 'Terre', 'Feu',
      'Vague', 'Ciel', 'Pierre', 'Forêt', 'Air', 'Aube',
      'Poussière', 'Roche',
    ],
  },
  de: {
    adjetivos: [
      'Flüchtig', 'Stille', 'Fern', 'Sanft', 'Schwach', 'Dunkel',
      'Kalt', 'Frei', 'Stumm', 'Gebrochen', 'Allein', 'Grau',
      'Alt', 'Langsam', 'Trocken', 'Verloren', 'Klar', 'Tief',
      'Lebendig', 'Ruhig',
    ],
    sustantivos: [
      'Mond', 'Wind', 'Meer', 'Nebel', 'Echo', 'Licht',
      'Schatten', 'Dunst', 'Fluss', 'Wolke', 'Erde', 'Feuer',
      'Welle', 'Himmel', 'Stein', 'Wald', 'Luft', 'Morgen',
      'Staub', 'Fels',
    ],
  },
};

const avatares = [
  '🌙', '🌊', '🌿', '🔥', '⭐', '🌸', '🍃', '❄️',
  '🌑', '🌫️', '🦋', '🌺', '🍂', '🌻', '🐚', '🌾',
  '🦉', '🌵', '🐋', '🌈', '🪨', '🌬️', '🕯️', '🫧',
  '🪸', '🌒', '🍄', '🐺', '🦅', '🌄',
];

function detectarIdioma() {
  // En el futuro esto vendrá de la configuración del usuario
  // Por ahora detecta el idioma del dispositivo
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const lang = locale.split('-')[0];
    return palabras[lang] ? lang : 'es';
  } catch {
    return 'es';
  }
}

function nombreAleatorio(idioma = null) {
  const lang = idioma ?? detectarIdioma();
  const lista = palabras[lang] ?? palabras.es;
  const adj = lista.adjetivos[Math.floor(Math.random() * lista.adjetivos.length)];
  const sus = lista.sustantivos[Math.floor(Math.random() * lista.sustantivos.length)];
  return `${sus} ${adj}`;
}

function avatarAleatorio() {
  return avatares[Math.floor(Math.random() * avatares.length)];
}

export async function obtenerOCrearPerfil(userId) {
  const ref = doc(db, 'perfiles', userId);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const perfil = {
    userId,
    nombre: nombreAleatorio(),
    avatar: avatarAleatorio(),
    idioma: detectarIdioma(),
    creadoEn: new Date().toISOString(),
  };

  await setDoc(ref, perfil);
  return perfil;
}

export async function actualizarPerfil(userId, datos) {
  await setDoc(doc(db, 'perfiles', userId), datos, { merge: true });
  
  // Sincronizar con estado activo si existe
  try {
    const estadoSnap = await getDoc(doc(db, 'estados', userId));
    if (estadoSnap.exists() && !estadoSnap.data().expirado) {
      await setDoc(doc(db, 'estados', userId), {
        nombre: datos.nombre,
        avatar: datos.avatar,
      }, { merge: true });
    }
  } catch (_) {}
}

export { avatares, palabras, nombreAleatorio };