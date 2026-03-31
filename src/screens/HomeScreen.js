import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { emotions, ui } from "../theme/colors";
import { fontSize, spacing, isTablet, isWeb } from "../theme/dimensions";
import Screen from "../components/Screen";
import { loginAnonimo } from "../services/auth";
import {
  publicarEmocion,
  obtenerMiEmocion,
  editarTexto,
  prolongarEmocion,
  borrarEmocion,
} from "../services/emotions";

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const bubbleSize = width < 375 ? 110 : isTablet ? 160 : 140;
  const cols = isTablet ? 4 : 2;

  const [usuario, setUsuario] = useState(null);
  const [miEmocion, setMiEmocion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [texto, setTexto] = useState("");
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loginAnonimo().then(async (user) => {
      setUsuario(user);
      if (user) {
        const emocion = await obtenerMiEmocion(user.uid);
        setMiEmocion(emocion);
      }
      setCargando(false);
    });
  }, []);

  function handleVerEnMapa() {
    if (!miEmocion?.ubicacion) return;
    navigation.navigate("Map", {
      focusEmocion: { ...miEmocion, id: usuario.uid },
    });
  }

  async function handlePublicar() {
    if (!selected || !usuario) return;
    setGuardando(true);
    const result = await publicarEmocion(usuario.uid, selected, texto);
    if (!result.ok) {
      Alert.alert(
        "Ubicación necesaria",
        "EchoMood necesita tu ubicación para publicar tu estado. Actívala en los ajustes de tu dispositivo.",
      );
      setGuardando(false);
      return;
    }
    const emocion = await obtenerMiEmocion(usuario.uid);
    setMiEmocion(emocion);
    setSelected(null);
    setTexto("");
    setGuardando(false);
  }

  async function handleEditarTexto() {
    if (!usuario) return;
    setGuardando(true);
    await editarTexto(usuario.uid, texto);
    const emocion = await obtenerMiEmocion(usuario.uid);
    setMiEmocion(emocion);
    setEditando(false);
    setGuardando(false);
  }

  async function handleBorrar() {
    Alert.alert("Borrar emoción", "¿Seguro que quieres eliminar tu estado?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await borrarEmocion(usuario.uid);
          setMiEmocion(null);
        },
      },
    ]);
  }

  async function handleProlongar() {
    if (!usuario) return;
    setGuardando(true);
    await prolongarEmocion(usuario.uid);
    const emocion = await obtenerMiEmocion(usuario.uid);
    setMiEmocion(emocion);
    setGuardando(false);
  }

  function tiempoRestante(expiraEn) {
    if (!expiraEn) return "";
    const diff = new Date(expiraEn) - new Date();
    if (diff <= 0) return "Expirado";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h === 0) return `Expira en ${m}min`;
    return `Expira en ${h}h ${m}min`;
  }

  if (cargando) {
    return (
      <Screen>
        <ActivityIndicator
          color={ui.accent}
          size="large"
          style={{ marginTop: 80 }}
        />
      </Screen>
    );
  }

  if (miEmocion?.expirado) {
    return (
      <Screen>
        <Text style={styles.title}>Tu estado expiró</Text>
        <Text style={styles.subtitle}>¿Qué quieres hacer?</Text>
        <View
          style={[
            styles.estadoCard,
            { borderColor: miEmocion.color, opacity: 0.6 },
          ]}
        >
          <Text style={styles.estadoEmoji}>{miEmocion.emoji}</Text>
          <Text style={[styles.estadoLabel, { color: miEmocion.color }]}>
            {miEmocion.emotion}
          </Text>
          {miEmocion.texto ? (
            <Text style={styles.estadoTexto}>{miEmocion.texto}</Text>
          ) : null}
        </View>
        <View style={styles.acciones}>
          <TouchableOpacity
            style={[styles.btnPrimario, { backgroundColor: miEmocion.color }]}
            onPress={handleProlongar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnPrimarioTexto}>⏱ Prolongar 6h</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => {
              setMiEmocion(null);
              setSelected(null);
            }}
          >
            <Text style={styles.btnOutlineTexto}>🔄 Elegir nueva emoción</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBorrar}>
            <Text style={styles.btnPeligro}>Eliminar estado</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (miEmocion && !selected) {
    return (
      <Screen>
        <Text style={styles.title}>Tu estado actual</Text>
        <Text style={styles.subtitle}>
          {tiempoRestante(miEmocion.expiraEn)}
        </Text>
        <View style={[styles.estadoCard, { borderColor: miEmocion.color }]}>
          <Text style={styles.estadoEmoji}>{miEmocion.emoji}</Text>
          <Text style={[styles.estadoLabel, { color: miEmocion.color }]}>
            {miEmocion.emotion}
          </Text>
          {miEmocion.texto ? (
            <Text style={styles.estadoTexto}>{miEmocion.texto}</Text>
          ) : null}
        </View>
        {editando ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.input}
              value={texto}
              onChangeText={setTexto}
              placeholder="¿Algo que añadir?"
              placeholderTextColor={ui.textMuted}
              maxLength={100}
              multiline
            />
            <Text style={styles.contador}>{texto.length}/100</Text>
            <TouchableOpacity
              style={styles.btnPrimario}
              onPress={handleEditarTexto}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnPrimarioTexto}>Guardar texto</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditando(false)}>
              <Text style={styles.btnSecundario}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.acciones}>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => {
                setTexto(miEmocion.texto || "");
                setEditando(true);
              }}
            >
              <Text style={styles.btnOutlineTexto}>✏️ Editar texto</Text>
            </TouchableOpacity>
            {miEmocion?.ubicacion && (
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={handleVerEnMapa}
              >
                <Text style={styles.btnOutlineTexto}>🗺️ Ver en el mapa</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => {
                setMiEmocion(null);
                setSelected(null);
              }}
            >
              <Text style={styles.btnOutlineTexto}>🔄 Cambiar emoción</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBorrar}>
              <Text style={styles.btnPeligro}>Eliminar estado</Text>
            </TouchableOpacity>
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>¿Cómo te sientes ahora?</Text>
      <Text style={styles.subtitle}>Solo tú decides lo que compartes</Text>
      <ScrollView
        contentContainerStyle={[styles.grid, { paddingHorizontal: spacing.md }]}
      >
        {Object.values(emotions).map((emotion) => (
          <TouchableOpacity
            key={emotion.label}
            style={[
              styles.bubble,
              {
                width: bubbleSize,
                height: bubbleSize * 0.72,
                backgroundColor: emotion.color + "22",
                borderColor: emotion.color,
              },
              selected?.label === emotion.label && styles.bubbleSelected,
            ]}
            onPress={() => setSelected(emotion)}
          >
            <Text style={styles.emoji}>{emotion.emoji}</Text>
            <Text style={[styles.label, { color: emotion.color }]}>
              {emotion.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {selected && (
        <View style={styles.footer}>
          <TextInput
            style={styles.input}
            value={texto}
            onChangeText={setTexto}
            placeholder="¿Algo que añadir? (opcional)"
            placeholderTextColor={ui.textMuted}
            maxLength={100}
            multiline
          />
          <Text style={styles.contador}>{texto.length}/100</Text>
          <TouchableOpacity
            style={[styles.btnPrimario, { backgroundColor: selected.color }]}
            onPress={handlePublicar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnPrimarioTexto}>
                Compartir con el mundo
              </Text>
            )}
          </TouchableOpacity>
          {miEmocion && (
            <TouchableOpacity
              onPress={() => {
                setSelected(null);
                setMiEmocion(miEmocion);
              }}
            >
              <Text style={styles.btnSecundario}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    color: ui.text,
    textAlign: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: ui.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  bubble: {
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bubbleSelected: { borderWidth: 3, transform: [{ scale: 1.05 }] },
  emoji: { fontSize: isTablet ? 34 : 28 },
  label: { fontSize: fontSize.sm, fontWeight: "500" },
  estadoCard: {
    margin: spacing.lg,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: spacing.lg,
    alignItems: "center",
    gap: 8,
    backgroundColor: ui.card,
  },
  estadoEmoji: { fontSize: isTablet ? 64 : 48 },
  estadoLabel: { fontSize: fontSize.xl, fontWeight: "600" },
  estadoTexto: {
    fontSize: fontSize.md,
    color: ui.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  acciones: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  editContainer: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  footer: { padding: spacing.lg, gap: spacing.sm },
  input: {
    backgroundColor: ui.card,
    borderRadius: 12,
    padding: spacing.md,
    color: ui.text,
    fontSize: fontSize.md,
    borderWidth: 0.5,
    borderColor: ui.border,
    minHeight: 70,
  },
  contador: { fontSize: fontSize.xs, color: ui.textMuted, textAlign: "right" },
  btnPrimario: {
    backgroundColor: ui.accent,
    paddingVertical: spacing.md,
    borderRadius: 30,
    alignItems: "center",
  },
  btnPrimarioTexto: { color: "#000", fontWeight: "600", fontSize: fontSize.md },
  btnOutline: {
    borderWidth: 1,
    borderColor: ui.border,
    paddingVertical: spacing.sm,
    borderRadius: 30,
    alignItems: "center",
  },
  btnOutlineTexto: { color: ui.text, fontSize: fontSize.md },
  btnSecundario: {
    color: ui.textMuted,
    textAlign: "center",
    fontSize: fontSize.md,
    paddingVertical: 8,
  },
  btnPeligro: {
    color: "#EF5350",
    textAlign: "center",
    fontSize: fontSize.sm,
    marginTop: 8,
  },
});
