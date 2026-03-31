import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isWeb = Platform.OS === 'web';
export const isTablet = width >= 768;
export const isSmall = width < 375;

export const W = width;
export const H = height;

// Columnas del grid de emociones
export const gridColumns = isTablet ? 4 : isSmall ? 2 : 2;

// Ancho máximo del contenido en tablet/web
export const maxWidth = isTablet || isWeb ? 600 : width;

// Tamaños de fuente escalados
export const fontSize = {
  xs:   isTablet ? 13 : 11,
  sm:   isTablet ? 15 : 13,
  md:   isTablet ? 17 : 15,
  lg:   isTablet ? 20 : 18,
  xl:   isTablet ? 26 : 22,
  xxl:  isTablet ? 30 : 26,
};

// Espaciado
export const spacing = {
  xs:  isTablet ? 8  : 6,
  sm:  isTablet ? 12 : 10,
  md:  isTablet ? 20 : 16,
  lg:  isTablet ? 32 : 24,
  xl:  isTablet ? 48 : 36,
};

// Wrapper centrado para tablet/web
export const containerStyle = {
  width: '100%',
  maxWidth: maxWidth,
  alignSelf: 'center',
};