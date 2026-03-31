import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginAnonimo } from '../services/auth';
import { obtenerOCrearPerfil, actualizarPerfil, avatares, palabras, nombreAleatorio } from '../services/perfiles';
import { ui } from '../theme/colors';

const IDIOMAS = [
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
];

export default function PerfilScreen() {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [nombre, setNombre] = useState('');
  const [avatarSelected, setAvatarSelected] = useState('');
  const [idiomaSelected, setIdiomaSelected] = useState('es');
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    loginAnonimo().then(async user => {
      setUsuario(user);
      if (user) {
        const p = await obtenerOCrearPerfil(user.uid);
        setPerfil(p);
        setNombre(p.nombre);
        setAvatarSelected(p.avatar);
        setIdiomaSelected(p.idioma ?? 'es');
      }
      setCargando(false);
    });
  }, []);

  function handleGenerarNombre() {
    setNombre(nombreAleatorio(idiomaSelected));
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      Alert.alert('El nombre no puede estar vacío');
      return;
    }
    setGuardando(true);
    const actualizado = {
      ...perfil,
      nombre: nombre.trim(),
      avatar: avatarSelected,
      idioma: idiomaSelected,
    };
    await actualizarPerfil(usuario.uid, actualizado);
    setPerfil(actualizado);
    setEditando(false);
    setGuardando(false);
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Tu perfil anónimo</Text>
        <Text style={styles.subtitle}>Nadie sabe quién eres realmente</Text>

        <View style={styles.card}>
          <Text style={styles.avatarGrande}>{perfil?.avatar}</Text>
          <Text style={styles.nombre}>{perfil?.nombre}</Text>
          <Text style={styles.uid}>ID: {usuario?.uid?.slice(0, 8)}...</Text>
        </View>

        {editando ? (
          <View style={styles.editContainer}>

            <Text style={styles.label}>Idioma del nombre</Text>
            <View style={styles.idiomaRow}>
              {IDIOMAS.map(id => (
                <TouchableOpacity
                  key={id.code}
                  style={[
                    styles.idiomaBtn,
                    idiomaSelected === id.code && styles.idiomaBtnSelected,
                  ]}
                  onPress={() => setIdiomaSelected(id.code)}
                >
                  <Text style={styles.idiomaTexto}>{id.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nombre</Text>
            <View style={styles.nombreRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={nombre}
                onChangeText={setNombre}
                maxLength={30}
                placeholderTextColor={ui.textMuted}
                placeholder="Tu nombre anónimo"
              />
              <TouchableOpacity style={styles.btnAleatorio} onPress={handleGenerarNombre}>
                <Text style={styles.btnAleatorioTexto}>🎲</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.contador}>{nombre.length}/30</Text>

            <Text style={styles.label}>Avatar</Text>
            <View style={styles.avatarGrid}>
              {avatares.map(av => (
                <TouchableOpacity
                  key={av}
                  style={[
                    styles.avatarOpcion,
                    avatarSelected === av && styles.avatarOpcionSelected,
                  ]}
                  onPress={() => setAvatarSelected(av)}
                >
                  <Text style={styles.avatarEmoji}>{av}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.btnPrimario}
              onPress={handleGuardar}
              disabled={guardando}
            >
              {guardando
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.btnPrimarioTexto}>Guardar cambios</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditando(false)}>
              <Text style={styles.btnSecundario}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => setEditando(true)}
          >
            <Text style={styles.btnOutlineTexto}>✏️ Editar perfil</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTexto}>
            🔒 Tu identidad real nunca se comparte. Este nombre y avatar son lo único que otros usuarios pueden ver de ti.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: ui.background },
  scroll:               { paddingBottom: 40 },
  title:                { fontSize: 24, fontWeight: '600', color: ui.text, textAlign: 'center', marginTop: 48, marginBottom: 8 },
  subtitle:             { fontSize: 13, color: ui.textMuted, textAlign: 'center', marginBottom: 32 },
  card:                 { margin: 24, borderRadius: 20, borderWidth: 1, borderColor: ui.border, padding: 24, alignItems: 'center', gap: 8, backgroundColor: ui.card },
  avatarGrande:         { fontSize: 64 },
  nombre:               { fontSize: 22, fontWeight: '600', color: ui.text },
  uid:                  { fontSize: 11, color: ui.textMuted, marginTop: 4 },
  editContainer:        { paddingHorizontal: 24, gap: 8 },
  label:                { fontSize: 13, color: ui.textMuted, fontWeight: '500', marginTop: 12 },
  nombreRow:            { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input:                { backgroundColor: ui.card, borderRadius: 12, padding: 14, color: ui.text, fontSize: 14, borderWidth: 0.5, borderColor: ui.border },
  contador:             { fontSize: 11, color: ui.textMuted, textAlign: 'right' },
  idiomaRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  idiomaBtn:            { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: ui.border, backgroundColor: ui.card },
  idiomaBtnSelected:    { borderColor: ui.accent, backgroundColor: ui.accent + '22' },
  idiomaTexto:          { fontSize: 12, color: ui.text },
  avatarGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
  avatarOpcion:         { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.card, borderWidth: 1, borderColor: ui.border },
  avatarOpcionSelected: { borderColor: ui.accent, borderWidth: 2, backgroundColor: ui.accent + '22' },
  avatarEmoji:          { fontSize: 24 },
  btnAleatorio:         { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.card, borderWidth: 1, borderColor: ui.border },
  btnAleatorioTexto:    { fontSize: 22 },
  btnPrimario:          { backgroundColor: ui.accent, paddingVertical: 14, borderRadius: 30, alignItems: 'center', marginTop: 16 },
  btnPrimarioTexto:     { color: '#000', fontWeight: '600', fontSize: 15 },
  btnOutline:           { borderWidth: 1, borderColor: ui.border, paddingVertical: 12, borderRadius: 30, alignItems: 'center', marginHorizontal: 24 },
  btnOutlineTexto:      { color: ui.text, fontSize: 14 },
  btnSecundario:        { color: ui.textMuted, textAlign: 'center', fontSize: 14, paddingVertical: 8 },
  infoBox:              { margin: 24, padding: 16, borderRadius: 12, backgroundColor: ui.card, borderWidth: 0.5, borderColor: ui.border },
  infoTexto:            { fontSize: 12, color: ui.textMuted, lineHeight: 18 },
});