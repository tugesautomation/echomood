import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import BanScreen from './src/screens/BanScreen';
import { loginAnonimo } from './src/services/auth';
import { ui } from './src/theme/colors';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './src/services/firebase';

export default function App() {
  const [estado, setEstado] = useState('cargando');
  const [banInfo, setBanInfo] = useState(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    async function iniciar() {
      const user = await loginAnonimo();
      if (!user) { setEstado('ok'); return; }

      // Escuchar baneo en tiempo real
      unsubRef.current = onSnapshot(doc(db, 'baneados', user.uid), (snap) => {
        if (!snap.exists()) {
          setEstado('ok');
          setBanInfo(null);
          return;
        }

        const data = snap.data();

        // Verificar si el baneo ha expirado
        if (data.expira && new Date(data.expira) < new Date()) {
          setEstado('ok');
          setBanInfo(null);
          return;
        }

        setBanInfo({ nivel: data.nivel, motivo: data.motivo, expira: data.expira });
        setEstado('baneado');
      });
    }

    iniciar();
    return () => unsubRef.current?.();
  }, []);

  // Verificar expiración periódicamente para baneos temporales
  useEffect(() => {
    if (estado !== 'baneado' || !banInfo?.expira) return;
    const interval = setInterval(() => {
      if (new Date(banInfo.expira) < new Date()) {
        setEstado('ok');
        setBanInfo(null);
      }
    }, 30000); // cada 30 segundos
    return () => clearInterval(interval);
  }, [estado, banInfo]);

  if (estado === 'cargando') {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: ui.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={ui.accent} size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (estado === 'baneado') {
    return (
      <SafeAreaProvider>
        <BanScreen nivel={banInfo.nivel} motivo={banInfo.motivo} expira={banInfo.expira} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}