import React, { createContext, useContext, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { useAppStore } from '../hooks/useAppStore';

export const light = {
  background: '#FCFBFE', surface: '#FFFFFF', surfaceAlt: '#F4F1F9',
  ink: '#393249', muted: '#6E627D', subtle: '#6E627D', line: '#EAE5F1',
  primary: '#7056A3', primaryLight: '#EEE8F7', accent: '#D5C7EC',
  sage: '#AB96CC', cream: '#F6F0FA', lavender: '#F1EBFA', peach: '#F6F0FA',
  nav: '#FFFFFF', white: '#FFFFFF', danger: '#AC465E',
  pink: '#8A597F', pinkLight: '#F9EFF7', pinkLine: '#EDDBE9',
  blue: '#9380BB', blueLight: '#F0ECFA', lilac: '#8E75B6', lilacLight: '#F1EBFA', lilacLine: '#E4D8F0',
  heroStart: '#F6F0FC', heroMiddle: '#FAF7FD', heroEnd: '#EEE7FA', heroLine: '#E7DCF3',
  overlay: 'rgba(46,36,65,0.42)',
};
export const dark: typeof light = {
  background: '#17221D', surface: '#202E26', surfaceAlt: '#29382E',
  ink: '#EAF0E5', muted: '#ABB8AA', subtle: '#798A7A', line: '#36443A',
  primary: '#B6CF9E', primaryLight: '#344934', accent: '#667E57',
  sage: '#A5BF95', cream: '#37362D', lavender: '#32303C', peach: '#3E332B',
  nav: '#1B2820', white: '#19271E', danger: '#E99B92',
  pink: '#C3A8B5', pinkLight: '#3A3036', pinkLine: '#54414C',
  blue: '#A5BF95', blueLight: '#344934', lilac: '#BBB8CD', lilacLight: '#32303C', lilacLine: '#36443A',
  heroStart: '#2D4131', heroMiddle: '#283D2E', heroEnd: '#23382B', heroLine: '#36443A',
  overlay: 'rgba(20,36,27,0.42)',
};
export const fonts = {regular:'DMSans_400Regular',medium:'DMSans_500Medium',semibold:'DMSans_600SemiBold',bold:'DMSans_700Bold',serif:'Fraunces_400Regular',serifMedium:'Fraunces_500Medium'};
export type Theme = {colors:typeof light;isDark:boolean;largeText:boolean;reducedMotion:boolean;highContrast:boolean};
const ThemeContext = createContext<Theme>({colors:light,isDark:false,largeText:false,reducedMotion:false,highContrast:false});
export function ThemeProvider({children}:{children:React.ReactNode}) {const {preferences:p}=useAppStore();const system=useColorScheme();const isDark=p.appearance==='dark'||(p.appearance==='system'&&system==='dark');const value=useMemo(()=>({colors:p.highContrast?{...(isDark?dark:light),muted:isDark?'#D0DCCC':'#4D405F',subtle:isDark?'#ABB8AA':'#594A6B',line:isDark?'#76856F':'#A89AB9'}:isDark?dark:light,isDark,largeText:p.largeText,reducedMotion:p.reducedMotion,highContrast:p.highContrast}),[isDark,p.largeText,p.reducedMotion,p.highContrast]);return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>}
export const useTheme=()=>useContext(ThemeContext);
export const shadow = Platform.select({web:{boxShadow:'0 8px 30px rgba(74, 51, 107, 0.045)'},default:{shadowColor:'#4A336B',shadowOffset:{width:0,height:5},shadowOpacity:0.04,shadowRadius:14,elevation:2}});
