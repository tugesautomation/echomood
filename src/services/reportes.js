import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const TELEGRAM_TOKEN = '8668979969:AAGTK5sGes4TY5BlnwwNudNjXC3vUHqvdho';
const TELEGRAM_CHAT_ID = '-1003771962668';

async function enviarATelegram(texto, teclado = null) {
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text: texto,
    parse_mode: 'HTML',
  };
  if (teclado) body.reply_markup = JSON.stringify(teclado);

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('Error enviando a Telegram:', e);
  }
}

export async function enviarReporte({ reportadorId, reportadoId, chatIdStr, motivo, mensajes }) {
  const transcripcion = mensajes
    .map(m => {
      const hora = m.timestamp?.toMillis
        ? new Date(m.timestamp.toMillis()).toLocaleString()
        : 'hora desconocida';
      const quien = m.userId === reportadoId ? 'REPORTADO' : 'REPORTADOR';
      return `[${hora}] ${quien}: ${m.texto ?? '[archivo/voz]'}`;
    })
    .join('\n');

  const reporteRef = await addDoc(collection(db, 'reportes'), {
    reportadorId,
    reportadoId,
    chatIdStr,
    motivo,
    transcripcion,
    estado: 'pendiente',
    timestamp: serverTimestamp(),
  });

  const reporteId = reporteRef.id;
  const uid = reportadoId.slice(0, 12);

  const teclado = {
    inline_keyboard: [
      [
        { text: '✅ Ignorar', callback_data: `ignorar:${reportadoId}:${reporteId}` },
        { text: '⚠️ Nivel 1 — 24h', callback_data: `ban1:${reportadoId}:${reporteId}` },
      ],
      [
        { text: '🔶 Nivel 2 — 7 días', callback_data: `ban2:${reportadoId}:${reporteId}` },
        { text: '🔴 Nivel 3 — Permanente', callback_data: `ban3:${reportadoId}:${reporteId}` },
      ],
      [
        { text: '⛔️ Nivel 4 — Baneo total', callback_data: `ban4:${reportadoId}:${reporteId}` },
      ],
    ],
  };

  const mensaje = `🚨 <b>NUEVO REPORTE</b>

👤 <b>Reportado:</b> <code>${uid}...</code>
📋 <b>Motivo:</b> ${motivo}
💬 <b>Chat:</b> <code>${chatIdStr}</code>

📜 <b>Transcripción:</b>
<pre>${transcripcion.slice(0, 2500)}</pre>`;

  await enviarATelegram(mensaje, teclado);
}

export async function verificarBaneo(userId) {
  try {
    const snap = await getDoc(doc(db, 'baneados', userId));
    if (!snap.exists()) return { baneado: false };
    const data = snap.data();
    if (data.expira && new Date(data.expira) < new Date()) {
      return { baneado: false };
    }
    return { baneado: true, nivel: data.nivel, motivo: data.motivo };
  } catch {
    return { baneado: false };
  }
}