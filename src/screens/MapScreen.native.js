import React, { useState, useEffect, useRef } from "react";
import { iniciarOAbrirChat } from "../services/chats";
import { obtenerOCrearPerfil } from "../services/perfiles";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Circle } from "react-native-maps";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { loginAnonimo } from "../services/auth";
import Svg, { Circle as SvgCircle, Text as SvgText } from "react-native-svg";
import { db } from "../services/firebase";
import { ui } from "../theme/colors";

export default function MapScreen({ route, navigation }) {
  const [estados, setEstados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [miUserId, setMiUserId] = useState(null);
  const mapRef = useRef(null);
  const [miEstado, setMiEstado] = useState(null);
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
    const q = query(collection(db, "estados"), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (d) =>
            d.ubicacion && d.ubicacion.lat && d.ubicacion.lng && !d.expirado,
        );
      setTodosEstados(datos);
      setCargando(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setEstados(todosEstados.filter((d) => !bloqueados.includes(d.id)));
  }, [todosEstados, bloqueados]);

  useEffect(() => {
    const focusEmocion = route?.params?.focusEmocion;
    if (focusEmocion?.ubicacion && mapRef.current) {
      setTimeout(() => {
        mapRef.current.animateToRegion(
          {
            latitude: focusEmocion.ubicacion.lat,
            longitude: focusEmocion.ubicacion.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          800,
        );
        setSeleccionado(focusEmocion);
      }, 500);
    }
  }, [route?.params?.focusEmocion]);

  function emocionAleatoria() {
    if (estados.length === 0) return;
    const random = estados[Math.floor(Math.random() * estados.length)];
    setSeleccionado(random);
    mapRef.current?.animateToRegion(
      {
        latitude: random.ubicacion.lat,
        longitude: random.ubicacion.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      800,
    );
  }

  function ubicacionTexto(item) {
    if (!item.ubicacion) return null;
    const { ciudad, pais } = item.ubicacion;
    if (ciudad && pais) return `${ciudad}, ${pais}`;
    if (pais) return pais;
    return null;
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
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 40.4168,
          longitude: -3.7038,
          latitudeDelta: 8,
          longitudeDelta: 8,
        }}
        onPress={() => setSeleccionado(null)}
      >
        {estados.map((item) => (
          <React.Fragment key={item.id}>
            <Circle
              center={{
                latitude: item.ubicacion.lat,
                longitude: item.ubicacion.lng,
              }}
              radius={3000}
              fillColor={item.color + "33"}
              strokeColor={item.color + "88"}
              strokeWidth={1}
            />
            <Marker
              coordinate={{
                latitude: item.ubicacion.lat,
                longitude: item.ubicacion.lng,
              }}
              onPress={() => setSeleccionado(item)}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Svg width={64} height={64} viewBox="0 0 64 64">
                <SvgCircle
                  cx="32"
                  cy="32"
                  r="20"
                  fill={item.color}
                  stroke={
                    seleccionado?.id === item.id || item.id === miUserId
                      ? ui.accent
                      : "#ffffff"
                  }
                  strokeWidth={item.id === miUserId ? 3 : 2}
                />
                <SvgText x="32" y="38" textAnchor="middle" fontSize="20">
                  {item.emoji}
                </SvgText>
              </Svg>
            </Marker>
          </React.Fragment>
        ))}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.title}>Mapa emocional</Text>
        <Text style={styles.subtitle}>
          {estados.length} emociones en el mundo
        </Text>
      </View>

      {seleccionado && (
        <View style={[styles.card, { borderColor: seleccionado.color }]}>
          <Text style={styles.cardEmoji}>{seleccionado.emoji}</Text>
          <View style={styles.cardInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardEmotion, { color: seleccionado.color }]}>
                {seleccionado.emotion}
              </Text>
              {seleccionado.id === miUserId && (
                <Text style={styles.cardTuTag}>Tu estado</Text>
              )}
            </View>
            {seleccionado.texto ? (
              <Text style={styles.cardTexto}>{seleccionado.texto}</Text>
            ) : null}
            {ubicacionTexto(seleccionado) && (
              <Text style={styles.cardUbicacion}>
                📍 {ubicacionTexto(seleccionado)}
              </Text>
            )}
            <Text style={styles.cardUbicacion}>
              {tiempoPublicado(seleccionado.timestamp)}
            </Text>
            {seleccionado.id !== miUserId && (
              <TouchableOpacity
                style={styles.btnChat}
                onPress={() => handleIniciarChat(seleccionado)}
              >
                <Text style={styles.btnChatTexto}>💬 Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.botonAleatorio}
        onPress={emocionAleatoria}
      >
        <Text style={styles.botonTexto}>✨ Emoción aleatoria</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  map: { flex: 1 },
  header: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    textShadowColor: "#000",
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 12,
    color: "#ddd",
    textShadowColor: "#000",
    textShadowRadius: 8,
  },
  card: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: ui.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderWidth: 1.5,
  },
  cardEmoji: { fontSize: 32, marginTop: 2 },
  cardInfo: { flex: 1, gap: 3 },
  cardEmotion: { fontSize: 16, fontWeight: "600" },
  cardTexto: { fontSize: 13, color: ui.textMuted, lineHeight: 18 },
  cardUbicacion: { fontSize: 11, color: ui.textMuted },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTuTag: { fontSize: 11, color: ui.accent, fontWeight: "600" },
  botonAleatorio: {
    position: "absolute",
    bottom: 36,
    alignSelf: "center",
    backgroundColor: ui.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  botonTexto: { color: "#000", fontWeight: "600", fontSize: 14 },
  btnChat: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ui.border,
    alignSelf: "flex-start",
  },
  btnChatTexto: { fontSize: 12, color: ui.textMuted },
});
