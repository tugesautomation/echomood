import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ui } from '../theme/colors';

export default function BanScreen({ nivel, motivo, expira }) {
  const [tiempoRestante, setTiempoRestante] = useState('');

  useEffect(() => {
    if (!expira) return;
    function calcular() {
      const diff = new Date(expira) - new Date();
      if (diff <= 0) { setTiempoRestante('Expirado'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setTiempoRestante(`${h}h ${m}min restantes`);
      else if (m > 0) setTiempoRestante(`${m}min ${s}s restantes`);
      else setTiempoRestante(`${s}s restantes`);
    }
    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [expira]);

  const mensajes = {
    1: { titulo: 'Acceso restringido', sub: 'Has recibido una advertencia temporal.', emoji: '⚠️', color: '#FF7043' },
    2: { titulo: 'Cuenta suspendida', sub: 'Tu cuenta ha sido suspendida temporalmente.', emoji: '🔶', color: '#FF7043' },
    3: { titulo: 'Cuenta baneada', sub: 'Tu cuenta ha sido baneada permanentemente.', emoji: '🔴', color: '#EF5350' },
    4: { titulo: 'Acceso denegado', sub: 'Tu acceso ha sido bloqueado permanentemente.', emoji: '⛔️', color: '#EF5350' },
  };

  const info = mensajes[nivel] ?? mensajes[3];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{info.emoji}</Text>
        <Text style={styles.titulo}>{info.titulo}</Text>
        <Text style={styles.sub}>{info.sub}</Text>

        {motivo && (
          <View style={[styles.motivoBox, { borderColor: info.color + '44' }]}>
            <Text style={styles.motivoLabel}>Motivo</Text>
            <Text style={styles.motivoTexto}>{motivo}</Text>
          </View>
        )}

        {tiempoRestante ? (
          <View style={styles.timerBox}>
            <Text style={styles.timerTexto}>{tiempoRestante}</Text>
          </View>
        ) : null}

        <Text style={styles.contacto}>
          Si crees que es un error contacta con soporte@echomood.app
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: ui.background },
  content:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  emoji:        { fontSize: 64 },
  titulo:       { fontSize: 22, fontWeight: '600', color: ui.text, textAlign: 'center' },
  sub:          { fontSize: 14, color: ui.textMuted, textAlign: 'center', lineHeight: 22 },
  motivoBox:    { backgroundColor: ui.card, borderRadius: 12, padding: 16, width: '100%', gap: 4, borderWidth: 1 },
  motivoLabel:  { fontSize: 11, color: ui.textMuted, fontWeight: '500' },
  motivoTexto:  { fontSize: 14, color: ui.text },
  timerBox:     { backgroundColor: ui.card, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  timerTexto:   { fontSize: 15, fontWeight: '600', color: ui.accent },
  contacto:     { fontSize: 12, color: ui.textMuted, textAlign: 'center', marginTop: 8 },
});