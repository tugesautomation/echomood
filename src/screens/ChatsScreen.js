import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginAnonimo } from '../services/auth';
import { escucharMisChats } from '../services/chats';
import { ui } from '../theme/colors';

export default function ChatsScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [miId, setMiId] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    loginAnonimo().then(async user => {
      if (!user) return;
      setMiId(user.uid);
      const unsub = escucharMisChats(user.uid, (data) => {
        setChats(data);
        setCargando(false);
      });
      return () => unsub();
    });
  }, []);

  function tiempoRestante(expiraEn) {
    if (!expiraEn) return null;
    const diff = new Date(expiraEn) - new Date();
    if (diff <= 0) return 'Expirado';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (m > 0) return `${m}m restante`;
    return `${s}s restante`;
  }

  function faseLabel(chat) {
    if (chat.fase === 'persistente') return { texto: '✨ Persistente', color: ui.accent };
    if (chat.fase === 'expirado') return { texto: 'Expirado', color: ui.textMuted };
    const tr = tiempoRestante(chat.expiraEn);
    return { texto: tr ?? 'Efímero', color: tr === 'Expirado' ? '#EF5350' : '#FF7043' };
  }

  function abrirChat(chat) {
    const esIniciador = chat.iniciador === miId;
    const otroEstado = esIniciador ? chat.estadoB : chat.estadoA;
    navigation.navigate('Chat', {
      chatIdStr: chat.id,
      miId,
      otroNombre: otroEstado?.nombre ?? 'Anónimo',
      otroAvatar: otroEstado?.avatar ?? '👤',
      otroEstado: otroEstado?.emotion ?? '',
    });
  }

  if (cargando) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={ui.accent} size="large" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Conversaciones</Text>
      <Text style={styles.subtitle}>{chats.length} activas</Text>

      {chats.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioEmoji}>💬</Text>
          <Text style={styles.vacioTexto}>Aún no tienes conversaciones</Text>
          <Text style={styles.vacioSub}>
            Toca el estado de alguien en el mundo o en el mapa para iniciar un chat
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => {
            const fase = faseLabel(item);
            const noLeido = item.leido?.[miId] === false;
            const esIniciador = item.iniciador === miId;
            const otroEstado = esIniciador ? item.estadoB : item.estadoA;

            return (
              <TouchableOpacity
                style={[styles.card, noLeido && styles.cardNoLeido]}
                onPress={() => abrirChat(item)}
              >
                <Text style={styles.avatar}>{otroEstado?.avatar ?? '👤'}</Text>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardNombre}>
                      {otroEstado?.nombre ?? 'Anónimo'}
                    </Text>
                    <Text style={[styles.cardFase, { color: fase.color }]}>
                      {fase.texto}
                    </Text>
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.cardMensaje} numberOfLines={1}>
                      {item.ultimoMensaje ?? 'Chat iniciado'}
                    </Text>
                    {noLeido && <View style={styles.puntoNoLeido} />}
                  </View>
                  <Text style={styles.cardEstado}>
                    {otroEstado?.emoji} {otroEstado?.emotion}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const sw = Dimensions.get('window').width;
const isTab = sw >= 768;

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: ui.background },
  title:        { fontSize: isTab ? 26 : 22, fontWeight: '600', color: ui.text, textAlign: 'center', marginTop: isTab ? 56 : 48, marginBottom: 4 },
  subtitle:     { fontSize: isTab ? 15 : 13, color: ui.textMuted, textAlign: 'center', marginBottom: isTab ? 32 : 24 },
  lista:        { paddingHorizontal: isTab ? 40 : 20, gap: isTab ? 14 : 10, paddingBottom: 40, maxWidth: isTab ? 700 : undefined, alignSelf: isTab ? 'center' : undefined, width: isTab ? '100%' : undefined },
  card:         { backgroundColor: ui.card, borderRadius: 12, padding: isTab ? 20 : 16, flexDirection: 'row', gap: isTab ? 18 : 14, alignItems: 'center', borderWidth: 0.5, borderColor: ui.border },
  cardNoLeido:  { borderColor: ui.accent, borderWidth: 1 },
  avatar:       { fontSize: isTab ? 40 : 32 },
  cardInfo:     { flex: 1, gap: 3 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNombre:   { fontSize: isTab ? 16 : 14, fontWeight: '600', color: ui.text },
  cardFase:     { fontSize: isTab ? 13 : 11, fontWeight: '500' },
  cardBottom:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMensaje:  { fontSize: isTab ? 15 : 13, color: ui.textMuted, flex: 1 },
  puntoNoLeido: { width: 8, height: 8, borderRadius: 4, backgroundColor: ui.accent },
  cardEstado:   { fontSize: isTab ? 13 : 11, color: ui.textMuted },
  vacio:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: isTab ? 60 : 40, gap: isTab ? 16 : 12 },
  vacioEmoji:   { fontSize: isTab ? 64 : 48 },
  vacioTexto:   { fontSize: isTab ? 20 : 16, fontWeight: '600', color: ui.text, textAlign: 'center' },
  vacioSub:     { fontSize: isTab ? 15 : 13, color: ui.textMuted, textAlign: 'center', lineHeight: 20 },
});
