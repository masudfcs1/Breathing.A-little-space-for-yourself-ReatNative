import React, { createContext, useContext, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { useAppStore } from '../hooks/useAppStore';

export const light = {background:'#F6F7F3',surface:'#FFFFFF',surfaceAlt:'#EFF2EB',ink:'#263D34',muted:'#829087',subtle:'#ADB5AB',line:'#E7EBE3',primary:'#345D4C',primaryLight:'#E3ECDD',accent:'#C5D7B8',sage:'#7D9B77',cream:'#F5F1E6',lavender:'#EEEAF5',peach:'#F6ECE3',nav:'#FBFCF8',white:'#FFFFFF',danger:'#B05249'};
export const dark: typeof light = {background:'#17221D',surface:'#202E26',surfaceAlt:'#29382E',ink:'#EAF0E5',muted:'#ABB8AA',subtle:'#798A7A',line:'#36443A',primary:'#B6CF9E',primaryLight:'#344934',accent:'#667E57',sage:'#A5BF95',cream:'#37362D',lavender:'#32303C',peach:'#3E332B',nav:'#1B2820',white:'#19271E',danger:'#E99B92'};
export const fonts = {regular:'DMSans_400Regular',medium:'DMSans_500Medium',semibold:'DMSans_600SemiBold',bold:'DMSans_700Bold',serif:'Fraunces_400Regular',serifMedium:'Fraunces_500Medium'};
export type Theme = {colors:typeof light;isDark:boolean;largeText:boolean;reducedMotion:boolean;highContrast:boolean};
const ThemeContext = createContext<Theme>({colors:light,isDark:false,largeText:false,reducedMotion:false,highContrast:false});
export function ThemeProvider({children}:{children:React.ReactNode}) {const {preferences:p}=useAppStore();const system=useColorScheme();const isDark=p.appearance==='dark'||(p.appearance==='system'&&system==='dark');const value=useMemo(()=>({colors:p.highContrast?{...(isDark?dark:light),muted:isDark?'#D0DCCC':'#45574B',line:isDark?'#76856F':'#BDC8B6'}:isDark?dark:light,isDark,largeText:p.largeText,reducedMotion:p.reducedMotion,highContrast:p.highContrast}),[isDark,p.largeText,p.reducedMotion,p.highContrast]);return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>}
export const useTheme=()=>useContext(ThemeContext);
export const shadow = Platform.select({web:{boxShadow:'0 8px 30px rgba(35, 62, 42, 0.035)'},default:{shadowColor:'#263D34',shadowOffset:{width:0,height:5},shadowOpacity:0.04,shadowRadius:14,elevation:2}});
