import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Image,
  Linking,
  Clipboard,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import {
  enviarMensaje,
  escucharMensajes,
  resonar,
  marcarLeido,
  verificarYExpirarChat,
  bloquearEstado,
  enviarMensajeMedia,
  agregarReaccion,
  marcarMensajesLeidos,
  actualizarPresencia,
  escucharPresencia,
} from "../services/chats";
import { enviarReporte } from "../services/reportes";
import { subirImagen, subirAudio } from "../services/media";
import { ui } from "../theme/colors";

const MOTIVOS_REPORTE = [
  "Acoso o intimidación",
  "Contenido ofensivo o inapropiado",
  "Spam o comportamiento repetitivo",
  "Suplantación de identidad",
  "Contenido ilegal",
  "Otro",
];

const EMOJIS_REACCION = ["❤️", "😂", "😮", "😢", "👍", "👎"];

export default function ChatScreen({ route, navigation }) {
  const { chatIdStr, miId, otroNombre, otroAvatar, otroEstado } = route.params;

  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [chat, setChat] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reporteVisible, setReporteVisible] = useState(false);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(null);
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [reaccionMenuMsg, setReaccionMenuMsg] = useState(null);
  const [grabando, setGrabando] = useState(false);
  const [subiendoMedia, setSubiendoMedia] = useState(false);
  const [otroActivo, setOtroActivo] = useState(false);
  const [velocidadAudio, setVelocidadAudio] = useState(1.0);
  const [audioActual, setAudioActual] = useState(null);
  const [audioReproduciendo, setAudioReproduciendo] = useState(null);

  const flatRef = useRef(null);
  const timerRef = useRef(null);
  const grabacionRef = useRef(null);
  const soundRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const otroId = chat?.usuarios?.find((u) => u !== miId);
  const estoyBloqueado = chat?.bloqueados?.length > 0;
  const silenciado = chat?.silenciados?.includes(miId);
  const fasePersistente = chat?.fase === "persistente";
  const faseExpirada = chat?.fase === "expirado" || tiempoRestante === 0;
  const yoResoné = chat?.resonancia?.[miId];
  const otroResonó = chat?.resonancia?.[otroId];

  useEffect(() => {
    const unsubMsg = escucharMensajes(chatIdStr, (msgs) => {
      setMensajes(msgs);
      if (fasePersistente) marcarMensajesLeidos(chatIdStr, miId);
      else marcarLeido(chatIdStr, miId);
    });
    return () => unsubMsg();
  }, [fasePersistente]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await verificarYExpirarChat(chatIdStr);
      if (!data) return;
      setChat(data);
      if (data.fase === "efimero" && data.expiraEn) {
        const diff = new Date(data.expiraEn) - new Date();
        if (diff <= 0) {
          setTiempoRestante(0);
          clearInterval(interval);
        } else setTiempoRestante(Math.ceil(diff / 1000));
      }
    }, 1000);
    timerRef.current = interval;
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mensajes.length > 0)
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [mensajes]);

  // Presencia
  useEffect(() => {
    actualizarPresencia(miId, true);
    const sub = AppState.addEventListener("change", (state) => {
      actualizarPresencia(miId, state === "active");
    });
    return () => {
      actualizarPresencia(miId, false);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!otroId) return;
    const unsub = escucharPresencia(otroId, (data) => {
      setOtroActivo(data.activo === true);
    });
    return () => unsub();
  }, [otroId]);

  async function handleEnviar() {
    if (!texto.trim() || enviando || estoyBloqueado) return;
    setEnviando(true);
    await enviarMensaje(chatIdStr, miId, texto.trim());
    setTexto("");
    setEnviando(false);
  }

  async function handleGrabar() {
    if (grabando) {
      setGrabando(false);
      setSubiendoMedia(true);
      try {
        const status = await grabacionRef.current.stopAndUnloadAsync();
        const uri = grabacionRef.current.getURI();
        grabacionRef.current = null;
        const url = await subirAudio(uri);
        if (url) {
          const duracion = Math.round((status.durationMillis ?? 0) / 1000);
          await enviarMensajeMedia(chatIdStr, miId, "audio", url, duracion);
        }
      } catch (e) {
        console.error(e);
      }
      setSubiendoMedia(false);
      return;
    }

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    grabacionRef.current = recording;
    setGrabando(true);
  }

  async function handleFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setSubiendoMedia(true);
      const url = await subirImagen(result.assets[0].uri);
      if (url) await enviarMensajeMedia(chatIdStr, miId, "imagen", url);
      setSubiendoMedia(false);
    }
  }

  async function handleReproducirAudio(url, msgId) {
    try {
      if (audioReproduciendo === msgId) {
        await soundRef.current?.pauseAsync();
        setAudioReproduciendo(null);
        return;
      }
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, rate: velocidadAudio },
      );
      soundRef.current = sound;
      setAudioReproduciendo(msgId);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setAudioReproduciendo(null);
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCambiarVelocidad() {
    const velocidades = [1.0, 1.5, 2.0];
    const idx = velocidades.indexOf(velocidadAudio);
    const nueva = velocidades[(idx + 1) % velocidades.length];
    setVelocidadAudio(nueva);
    if (soundRef.current) await soundRef.current.setRateAsync(nueva, true);
  }

  function handleCopiar(texto) {
    Clipboard.setString(texto);
    if (Platform.OS === "web") {
      navigator.clipboard?.writeText(texto);
    }
  }

  function detectarLinks(texto) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return texto.match(urlRegex) ?? [];
  }

  async function handleResonar() {
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "¿Resonar? Si la otra persona también resuena, el chat se vuelve persistente.",
        )
      )
        await resonar(chatIdStr, miId);
    } else {
      Alert.alert(
        "¿Resonar?",
        "Si la otra persona también resuena, el chat se vuelve persistente.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "✨ Resonar", onPress: () => resonar(chatIdStr, miId) },
        ],
      );
    }
  }

  async function handleBloquear() {
    setMenuVisible(false);
    const confirmar =
      Platform.OS === "web"
        ? window.confirm(
            "El chat se pausará para ambos hasta que alguno cambie su estado.",
          )
        : await new Promise((resolve) =>
            Alert.alert(
              "Bloquear estado",
              "El chat se pausará para ambos hasta que alguno cambie su estado.",
              [
                {
                  text: "Cancelar",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Bloquear",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            ),
          );
    if (confirmar) {
      await bloquearEstado(chatIdStr, miId);
      navigation.goBack();
    }
  }

  async function handleSilenciar() {
    setMenuVisible(false);
    const { updateDoc, doc } = await import("firebase/firestore");
    const { db } = await import("../services/firebase");
    const silenciados = chat?.silenciados ?? [];
    const nuevos = silenciados.includes(miId)
      ? silenciados.filter((id) => id !== miId)
      : [...silenciados, miId];
    await updateDoc(doc(db, "chats", chatIdStr), { silenciados: nuevos });
  }

  async function handleBorrarConversacion() {
    setMenuVisible(false);
    const confirmar =
      Platform.OS === "web"
        ? window.confirm(
            "¿Borrar toda la conversación? Esta acción no se puede deshacer.",
          )
        : await new Promise((resolve) =>
            Alert.alert(
              "Borrar conversación",
              "Esta acción no se puede deshacer.",
              [
                {
                  text: "Cancelar",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Borrar",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            ),
          );
    if (confirmar) {
      const { deleteDoc, doc, collection, getDocs } =
        await import("firebase/firestore");
      const { db } = await import("../services/firebase");
      const snap = await getDocs(
        collection(db, "chats", chatIdStr, "mensajes"),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "chats", chatIdStr));
      navigation.goBack();
    }
  }

  async function handleEnviarReporte() {
    if (!motivoSeleccionado) return;
    setEnviandoReporte(true);
    await enviarReporte({
      reportadorId: miId,
      reportadoId: otroId,
      chatIdStr,
      motivo: motivoSeleccionado,
      mensajes,
    });
    setEnviandoReporte(false);
    setReporteVisible(false);
    setMotivoSeleccionado(null);
    if (Platform.OS === "web") window.alert("Reporte enviado.");
    else Alert.alert("Reporte enviado", "Revisaremos la conversación.");
  }

  function formatTime(seconds) {
    if (seconds === null) return "";
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function timerColor() {
    if (tiempoRestante === null) return ui.textMuted;
    if (tiempoRestante <= 30) return "#EF5350";
    if (tiempoRestante <= 60) return "#FF7043";
    return ui.textMuted;
  }

  function renderMensaje({ item }) {
    const esMio = item.userId === miId;
    const links = item.texto ? detectarLinks(item.texto) : [];
    const reacciones = item.reacciones ?? {};
    const totalReacciones = Object.values(reacciones);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => setReaccionMenuMsg(item)}
        delayLongPress={400}
        style={[
          styles.burbujaWrap,
          esMio ? styles.burbujaWrapPropia : styles.burbujaWrapAjena,
        ]}
      >
        <View
          style={[
            styles.burbuja,
            esMio ? styles.burbujaPropia : styles.burbujaAjena,
          ]}
        >
          {/* Imagen */}
          {item.tipo === "imagen" && (
            <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
              <Image
                source={{ uri: item.url }}
                style={styles.imagenMensaje}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Audio */}
          {item.tipo === "audio" && (
            <View style={styles.audioRow}>
              <TouchableOpacity
                onPress={() => handleReproducirAudio(item.url, item.id)}
              >
                <Text style={styles.audioBtn}>
                  {audioReproduciendo === item.id ? "⏸" : "▶️"}
                </Text>
              </TouchableOpacity>
              <View style={styles.audioBar} />
              <Text
                style={[
                  styles.audioDur,
                  esMio ? { color: "#000" } : { color: ui.textMuted },
                ]}
              >
                {item.duracion ? `${item.duracion}s` : ""}
              </Text>
              <TouchableOpacity onPress={handleCambiarVelocidad}>
                <Text
                  style={[
                    styles.audioVel,
                    esMio ? { color: "#000" } : { color: ui.accent },
                  ]}
                >
                  x{velocidadAudio}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Texto */}
          {item.texto && (
            <Text
              style={[
                styles.burbujaTexto,
                esMio ? styles.textoPropio : styles.textoAjeno,
              ]}
            >
              {item.texto}
            </Text>
          )}

          {/* Links */}
          {links.map((link) => (
            <TouchableOpacity key={link} onPress={() => Linking.openURL(link)}>
              <Text style={styles.link}>{link}</Text>
            </TouchableOpacity>
          ))}

          {/* Hora + ticks */}
          <View style={styles.metaRow}>
            <Text style={[styles.burbujaHora, esMio && { color: "#00000088" }]}>
              {item.timestamp?.toMillis
                ? new Date(item.timestamp.toMillis()).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </Text>
            {esMio && fasePersistente && (
              <Text style={styles.ticks}>{item.leido ? "✓✓" : "✓"}</Text>
            )}
          </View>
        </View>

        {/* Reacciones */}
        {totalReacciones.length > 0 && (
          <View
            style={[
              styles.reaccionesRow,
              esMio ? styles.reaccionesPropia : styles.reaccionesAjena,
            ]}
          >
            {[...new Set(totalReacciones)].map((e) => (
              <Text key={e} style={styles.reaccionEmoji}>
                {e}
              </Text>
            ))}
            {totalReacciones.length > 1 && (
              <Text style={styles.reaccionCount}>{totalReacciones.length}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backTexto}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerAvatar}>{otroAvatar}</Text>
          <View>
            <Text style={styles.headerNombre}>{otroNombre}</Text>
            <View style={styles.presenciaRow}>
              <View
                style={[
                  styles.presenciaDot,
                  { backgroundColor: otroActivo ? "#66BB6A" : ui.textMuted },
                ]}
              />
              <Text style={styles.presenciaTexto}>
                {otroActivo ? "Activo ahora" : "Inactivo"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {chat?.fase === "efimero" && tiempoRestante !== null && (
            <Text style={[styles.timer, { color: timerColor() }]}>
              ⏱ {formatTime(tiempoRestante)}
            </Text>
          )}
          {fasePersistente && (
            <Text style={styles.persistenteTag}>✨ Persistente</Text>
          )}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.menuBtn}
          >
            <Text style={styles.menuBtnTexto}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {estoyBloqueado && (
        <View style={styles.bloqueadoBanner}>
          <Text style={styles.bloqueadoTexto}>
            Esta conversación está pausada
          </Text>
        </View>
      )}

      <FlatList
        ref={flatRef}
        data={mensajes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={renderMensaje}
      />

      {faseExpirada && (
        <View style={styles.expiradoBanner}>
          <Text style={styles.expiradoTexto}>La conversación ha terminado</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.expiradoBtn}>Volver</Text>
          </TouchableOpacity>
        </View>
      )}

      {!faseExpirada && !fasePersistente && !estoyBloqueado && (
        <View style={styles.resonanciaBar}>
          <TouchableOpacity
            style={[styles.btnResonar, yoResoné && styles.btnResonarActivo]}
            onPress={handleResonar}
            disabled={!!yoResoné}
          >
            <Text style={styles.btnResonarTexto}>
              {yoResoné ? "✨ Resonando..." : "✨ Resonar"}
            </Text>
          </TouchableOpacity>
          {otroResonó && !yoResoné && (
            <Text style={styles.otroResonó}>¡La otra persona resonó!</Text>
          )}
        </View>
      )}

      {!faseExpirada && !estoyBloqueado && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.inputRow}>
            {fasePersistente && (
              <>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={handleFoto}
                  disabled={subiendoMedia}
                >
                  <Text style={styles.mediaBtnTexto}>📷</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.mediaBtn,
                    grabando && { backgroundColor: "#EF535033" },
                  ]}
                  onPress={handleGrabar}
                  disabled={subiendoMedia}
                >
                  <Text style={styles.mediaBtnTexto}>
                    {grabando ? "⏹" : "🎤"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {subiendoMedia ? (
              <ActivityIndicator color={ui.accent} style={{ flex: 1 }} />
            ) : (
              <TextInput
                style={styles.input}
                value={texto}
                onChangeText={setTexto}
                placeholder={grabando ? "Grabando..." : "Escribe algo..."}
                placeholderTextColor={ui.textMuted}
                maxLength={300}
                multiline={Platform.OS !== 'web'}
                onSubmitEditing={handleEnviar}
                blurOnSubmit={false}
                returnKeyType="send"
                editable={!grabando}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
                    handleEnviar();
                  }
                }}
              />
            )}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { opacity: texto.trim() && !grabando ? 1 : 0.4 },
              ]}
              onPress={handleEnviar}
              disabled={!texto.trim() || enviando || grabando}
            >
              <Text style={styles.sendTexto}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Menú reacciones */}
      <Modal visible={!!reaccionMenuMsg} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setReaccionMenuMsg(null)}
        >
          <View style={styles.reaccionMenuContainer}>
            <View style={styles.reaccionMenuEmojis}>
              {EMOJIS_REACCION.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={async () => {
                    await agregarReaccion(
                      chatIdStr,
                      reaccionMenuMsg.id,
                      miId,
                      e,
                    );
                    setReaccionMenuMsg(null);
                  }}
                >
                  <Text style={styles.reaccionMenuEmoji}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {reaccionMenuMsg?.texto && (
              <TouchableOpacity
                style={styles.reaccionMenuCopiar}
                onPress={() => {
                  handleCopiar(reaccionMenuMsg.texto);
                  setReaccionMenuMsg(null);
                }}
              >
                <Text style={styles.reaccionMenuCopiarTexto}>
                  📋 Copiar mensaje
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Menú tres puntos */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleSilenciar}>
              <Text style={styles.menuItemTexto}>
                {silenciado
                  ? "🔔 Activar notificaciones"
                  : "🔕 Silenciar notificaciones"}
              </Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setReporteVisible(true);
              }}
            >
              <Text style={[styles.menuItemTexto, { color: "#FF7043" }]}>
                🚩 Reportar
              </Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleBloquear}>
              <Text style={[styles.menuItemTexto, { color: "#FF7043" }]}>
                🚫 Bloquear estado
              </Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleBorrarConversacion}
            >
              <Text style={[styles.menuItemTexto, { color: "#EF5350" }]}>
                🗑 Borrar conversación
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal reporte */}
      <Modal visible={reporteVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.reporteContainer}>
            <Text style={styles.reporteTitulo}>
              ¿Por qué reportas esta conversación?
            </Text>
            <ScrollView>
              {MOTIVOS_REPORTE.map((motivo) => (
                <TouchableOpacity
                  key={motivo}
                  style={[
                    styles.motivoItem,
                    motivoSeleccionado === motivo && styles.motivoItemSelected,
                  ]}
                  onPress={() => setMotivoSeleccionado(motivo)}
                >
                  <Text
                    style={[
                      styles.motivoTexto,
                      motivoSeleccionado === motivo && { color: ui.accent },
                    ]}
                  >
                    {motivo}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.btnPrimario,
                { opacity: motivoSeleccionado ? 1 : 0.4 },
              ]}
              onPress={handleEnviarReporte}
              disabled={!motivoSeleccionado || enviandoReporte}
            >
              {enviandoReporte ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnPrimarioTexto}>Enviar reporte</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setReporteVisible(false);
                setMotivoSeleccionado(null);
              }}
            >
              <Text style={styles.btnCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: ui.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backTexto: { fontSize: 22, color: ui.text },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { fontSize: 28 },
  headerNombre: { fontSize: 15, fontWeight: "600", color: ui.text },
  presenciaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  presenciaDot: { width: 7, height: 7, borderRadius: 4 },
  presenciaTexto: { fontSize: 11, color: ui.textMuted },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  timer: { fontSize: 14, fontWeight: "600" },
  persistenteTag: { fontSize: 11, color: ui.accent, fontWeight: "600" },
  menuBtn: { padding: 8 },
  menuBtnTexto: { fontSize: 22, color: ui.text, letterSpacing: 2 },
  bloqueadoBanner: {
    backgroundColor: ui.card,
    padding: 10,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: ui.border,
  },
  bloqueadoTexto: { fontSize: 13, color: ui.textMuted },
  lista: { padding: 16, gap: 8 },
  burbujaWrap: { maxWidth: "80%", gap: 4 },
  burbujaWrapPropia: { alignSelf: "flex-end" },
  burbujaWrapAjena: { alignSelf: "flex-start" },
  burbuja: { padding: 12, borderRadius: 16, gap: 4 },
  burbujaPropia: { backgroundColor: ui.accent, borderBottomRightRadius: 4 },
  burbujaAjena: { backgroundColor: ui.card, borderBottomLeftRadius: 4 },
  burbujaTexto: { fontSize: 14, lineHeight: 20 },
  textoPropio: { color: "#000" },
  textoAjeno: { color: ui.text },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-end",
  },
  burbujaHora: { fontSize: 10, color: ui.textMuted },
  ticks: { fontSize: 10, color: "#00000066" },
  imagenMensaje: { width: 200, height: 200, borderRadius: 12 },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 160,
  },
  audioBtn: { fontSize: 22 },
  audioBar: {
    flex: 1,
    height: 3,
    backgroundColor: "#00000033",
    borderRadius: 2,
  },
  audioDur: { fontSize: 11 },
  audioVel: { fontSize: 11, fontWeight: "600" },
  link: {
    color: "#4FC3F7",
    fontSize: 13,
    textDecorationLine: "underline",
    marginTop: 2,
  },
  reaccionesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: ui.card,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  reaccionesPropia: { alignSelf: "flex-end" },
  reaccionesAjena: { alignSelf: "flex-start" },
  reaccionEmoji: { fontSize: 14 },
  reaccionCount: { fontSize: 11, color: ui.textMuted },
  expiradoBanner: {
    padding: 20,
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: ui.border,
    gap: 8,
  },
  expiradoTexto: { color: ui.textMuted, fontSize: 14 },
  expiradoBtn: { color: ui.accent, fontSize: 14, fontWeight: "600" },
  resonanciaBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    borderTopWidth: 0.5,
    borderTopColor: ui.border,
  },
  btnResonar: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ui.accent,
  },
  btnResonarActivo: { backgroundColor: ui.accent + "33" },
  btnResonarTexto: { color: ui.accent, fontSize: 13, fontWeight: "600" },
  otroResonó: { fontSize: 12, color: ui.accent, flex: 1 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: ui.border,
    alignItems: "flex-end",
  },
  mediaBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  mediaBtnTexto: { fontSize: 22 },
  input: {
    flex: 1,
    backgroundColor: ui.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: ui.text,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ui.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendTexto: { fontSize: 18, color: "#000", fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  reaccionMenuContainer: {
    backgroundColor: ui.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  reaccionMenuEmojis: { flexDirection: "row", justifyContent: "space-around" },
  reaccionMenuEmoji: { fontSize: 32 },
  reaccionMenuCopiar: {
    padding: 14,
    backgroundColor: ui.background,
    borderRadius: 12,
    alignItems: "center",
  },
  reaccionMenuCopiarTexto: { fontSize: 14, color: ui.text },
  menuContainer: {
    backgroundColor: ui.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  menuItem: { padding: 18, paddingHorizontal: 24 },
  menuItemTexto: { fontSize: 16, color: ui.text },
  menuDivider: {
    height: 0.5,
    backgroundColor: ui.border,
    marginHorizontal: 24,
  },
  reporteContainer: {
    backgroundColor: ui.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  reporteTitulo: {
    fontSize: 17,
    fontWeight: "600",
    color: ui.text,
    marginBottom: 16,
  },
  motivoItem: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: ui.background,
    borderWidth: 1,
    borderColor: ui.border,
  },
  motivoItemSelected: {
    borderColor: ui.accent,
    backgroundColor: ui.accent + "11",
  },
  motivoTexto: { fontSize: 14, color: ui.text },
  btnPrimario: {
    backgroundColor: ui.accent,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 16,
  },
  btnPrimarioTexto: { color: "#000", fontWeight: "600", fontSize: 15 },
  btnCancelar: {
    color: ui.textMuted,
    textAlign: "center",
    fontSize: 14,
    paddingVertical: 12,
  },
});
