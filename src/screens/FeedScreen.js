import React, { useState, useEffect, useRef } from "react";
import { iniciarOAbrirChat } from "../services/chats";
import { obtenerOCrearPerfil } from "../services/perfiles";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import { loginAnonimo } from "../services/auth";
import { db } from "../services/firebase";
import { ui } from "../theme/colors";

export default function FeedScreen({ navigation }) {
  const [estados, setEstados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ahora, setAhora] = useState(new Date());
  const timerRef = useRef(null);
  const [miEstado, setMiEstado] = useState(null);
  const [miUserId, setMiUserId] = useState(null);
  const [bloqueados, setBloqueados] = useState([]);
  const [todosEstados, setTodosEstados] = useState([]);

  useEffect(() => {
    loginAnonimo().then(async (user) => {
      if (user) {
        setMiUserId(user.uid);
        const perfil = await obtenerOCrearPerfil(user.uid);
        setMiEstado(perfil);
      }
    });
  }, []);

  useEffect(() => {
    if (!miUserId) return;
    const { escucharMisChats } = require("../services/chats");
    const unsub = escucharMisChats(miUserId, (chats) => {
      const ids = chats
        .filter((c) => c.bloqueados && c.bloqueados.length > 0)
        .map((c) => c.usuarios.find((u) => u !== miUserId));
      setBloqueados(ids.filter(Boolean));
    });
    return () => unsub();
  }, [miUserId]);

  useEffect(() => {
    const q = query(collection(db, "estados"), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((d) => !d.expirado)
        .sort((a, b) => {
          const ta = a.timestamp?.toMillis?.() ?? 0;
          const tb = b.timestamp?.toMillis?.() ?? 0;
          return tb - ta;
        });
      setTodosEstados(datos);
      setCargando(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setEstados(todosEstados.filter((d) => !bloqueados.includes(d.id)));
  }, [todosEstados, bloqueados]);

  function tiempoPublicado(timestamp) {
    if (!timestamp) return "";
    const fecha = timestamp?.toMillis
      ? new Date(timestamp.toMillis())
      : new Date(timestamp);
    if (isNaN(fecha)) return "";
    const diff = new Date() - fecha;
    if (diff < 60000) return "ahora mismo";
    if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)} h`;
    return `hace ${Math.floor(diff / 86400000)} días`;
  }

  function ubicacionTexto(item) {
    if (!item.ubicacion) return null;
    const { ciudad, pais } = item.ubicacion;
    if (ciudad && pais) return `${ciudad}, ${pais}`;
    if (pais) return pais;
    return null;
  }

  function irAlMapa(item) {
    if (!item.ubicacion?.lat) return;
    navigation.navigate("Map", { focusEmocion: item });
  }

  if (cargando) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          color={ui.accent}
          size="large"
          style={{ marginTop: 80 }}
        />
      </SafeAreaView>
    );
  }

  async function handleIniciarChat(item) {
    if (!miUserId || !miEstado) return;
    const otroEstado = {
      nombre: item.nombre ?? "Anónimo",
      avatar: item.avatar ?? "👤",
      emotion: item.emotion,
      emoji: item.emoji,
    };
    const id = await iniciarOAbrirChat(miUserId, item.id, miEstado, otroEstado);
    navigation.navigate("Chat", {
      chatIdStr: id,
      miId: miUserId,
      otroNombre: otroEstado.nombre,
      otroAvatar: otroEstado.avatar,
      otroEstado: otroEstado.emotion,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>En el mundo ahora</Text>
      <Text style={styles.subtitle}>
        {estados.filter((d) => !bloqueados.includes(d.id)).length} personas
        compartiendo
      </Text>

      <FlatList
        data={estados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              item.id === miUserId
                ? styles.cardPropio
                : { borderLeftColor: item.color, borderLeftWidth: 3 },
            ]}
            onPress={() =>
              item.id === miUserId
                ? navigation.navigate("Home")
                : irAlMapa(item)
            }
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <View style={styles.cardMid}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardEmotion, { color: item.color }]}>
                    {item.emotion}
                  </Text>
                  {item.id === miUserId && (
                    <Text style={styles.cardTuTag}>Tú ✏️</Text>
                  )}
                </View>
                {ubicacionTexto(item) && (
                  <Text style={styles.cardUbicacion}>
                    📍 {ubicacionTexto(item)}
                  </Text>
                )}
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardTimer}>
                  {tiempoPublicado(item.timestamp)}
                </Text>
                {item.id !== miUserId && item.ubicacion?.lat && (
                  <Text style={styles.cardMapa}>Ver mapa →</Text>
                )}
              </View>
            </View>
            {item.texto ? (
              <Text style={styles.cardTexto}>{item.texto}</Text>
            ) : null}
            {item.id !== miUserId && (
              <TouchableOpacity
                style={styles.btnChat}
                onPress={() => handleIniciarChat(item)}
              >
                <Text style={styles.btnChatTexto}>💬 Iniciar chat</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const sw = Dimensions.get("window").width;
const isTab = sw >= 768;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  title: {
    fontSize: isTab ? 26 : 22,
    fontWeight: "600",
    color: ui.text,
    textAlign: "center",
    marginTop: isTab ? 56 : 48,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: isTab ? 15 : 13,
    color: ui.textMuted,
    textAlign: "center",
    marginBottom: isTab ? 32 : 24,
  },
  lista: {
    paddingHorizontal: isTab ? 40 : 20,
    gap: isTab ? 14 : 10,
    paddingBottom: 40,
    maxWidth: isTab ? 700 : undefined,
    alignSelf: isTab ? "center" : undefined,
    width: isTab ? "100%" : undefined,
  },
  card: {
    backgroundColor: ui.card,
    borderRadius: 12,
    padding: isTab ? 20 : 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: isTab ? 14 : 10,
  },
  cardEmoji: { fontSize: isTab ? 32 : 26, marginTop: 2 },
  cardMid: { flex: 1, gap: 3 },
  cardEmotion: { fontSize: isTab ? 17 : 15, fontWeight: "600" },
  cardUbicacion: { fontSize: isTab ? 13 : 11, color: ui.textMuted },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardTimer: { fontSize: isTab ? 13 : 11, color: ui.textMuted },
  cardMapa: { fontSize: isTab ? 13 : 11, color: ui.accent },
  cardPropio: {
    borderWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: ui.accent,
    backgroundColor: "#F5C84208",
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTuTag: { fontSize: isTab ? 13 : 11, color: ui.accent, fontWeight: "600" },
  cardTexto: {
    fontSize: isTab ? 15 : 13,
    color: ui.textMuted,
    marginTop: 10,
    lineHeight: isTab ? 22 : 18,
  },
  btnChat: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ui.border,
    alignSelf: "flex-start",
  },
  btnChatTexto: { fontSize: isTab ? 13 : 12, color: ui.textMuted },
});
