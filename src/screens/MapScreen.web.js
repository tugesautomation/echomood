import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { loginAnonimo } from '../services/auth';
import { iniciarOAbrirChat } from '../services/chats';
import { obtenerOCrearPerfil } from '../services/perfiles';
import { db } from '../services/firebase';
import { ui } from '../theme/colors';

export default function MapScreen({ navigation }) {
  const [estados, setEstados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [miUserId, setMiUserId] = useState(null);
  const [miEstado, setMiEstado] = useState(null);
  const [MapComponents, setMapComponents] = useState(null);

  useEffect(() => {
    loginAnonimo().then(async user => {
      if (user) {
        setMiUserId(user.uid);
        const perfil = await obtenerOCrearPerfil(user.uid);
        setMiEstado(perfil);
      }
    });
  }, []);

  useEffect(() => {
    import('react-leaflet').then(mod => {
      import('leaflet').then(L => {
        delete L.default.Icon.Default.prototype._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
      });
      setMapComponents({
        MapContainer: mod.MapContainer,
        TileLayer: mod.TileLayer,
        CircleMarker: mod.CircleMarker,
        Popup: mod.Popup,
      });
    });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'estados'), limit(100));
    const unsub = onSnapshot(q, snapshot => {
      const datos = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(d => d.ubicacion && d.ubicacion.lat && d.ubicacion.lng && !d.expirado);
      setEstados(datos);
      setCargando(false);
    });
    return () => unsub();
  }, []);

  async function handleIniciarChat(item) {
    if (!miUserId || !miEstado) return;
    const otroEstado = {
      nombre: item.nombre ?? 'Anónimo',
      avatar: item.avatar ?? '👤',
      emotion: item.emotion,
      emoji: item.emoji,
    };
    const id = await iniciarOAbrirChat(miUserId, item.id, miEstado, otroEstado);
    navigation.navigate('Chat', {
      chatIdStr: id,
      miId: miUserId,
      otroNombre: otroEstado.nombre,
      otroAvatar: otroEstado.avatar,
      otroEstado: otroEstado.emotion,
    });
  }

  if (cargando || !MapComponents) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={ui.accent} size="large" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = MapComponents;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mapa emocional</Text>
        <Text style={styles.subtitle}>{estados.length} emociones en el mundo</Text>
      </View>

      <div style={{ flex: 1, height: 'calc(100vh - 120px)' }}>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%', background: '#1a1a1a' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CartoDB'
          />
          {estados.map(item => (
            <CircleMarker
              key={item.id}
              center={[item.ubicacion.lat, item.ubicacion.lng]}
              radius={item.id === seleccionado?.id ? 18 : 12}
              pathOptions={{
                color: item.color,
                fillColor: item.color,
                fillOpacity: 0.8,
                weight: item.id === miUserId ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => setSeleccionado(item) }}
            >
              <Popup>
                <div style={{ background: '#1a1a1a', padding: 8, borderRadius: 8, minWidth: 160 }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{item.emoji}</div>
                  <div style={{ color: item.color, fontWeight: 600, fontSize: 15 }}>{item.emotion}</div>
                  {item.texto && <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{item.texto}</div>}
                  {item.ubicacion?.ciudad && (
                    <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
                      📍 {item.ubicacion.ciudad}, {item.ubicacion.pais}
                    </div>
                  )}
                  {item.id !== miUserId && (
                    <button
                      onClick={() => handleIniciarChat(item)}
                      style={{ marginTop: 8, background: ui.accent, border: 'none', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                    >
                      💬 Chat
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header:    { padding: 16, alignItems: 'center' },
  title:     { fontSize: 20, fontWeight: '600', color: '#fff' },
  subtitle:  { fontSize: 12, color: '#888', marginTop: 2 },
});