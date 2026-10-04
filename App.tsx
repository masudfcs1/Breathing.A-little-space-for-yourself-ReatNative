import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from './src/hooks/useAppFonts';
import { Home, Compass, Heart, CalendarDays, ChartNoAxesCombined, Settings2, ArrowUpRight, ArrowRight, Search, Moon, Sun, Check, X, ShieldCheck, Wind, UserRound, Sparkles } from 'lucide-react-native';
import { AppProvider, useAppStore } from './src/hooks/useAppStore';
import { ThemeProvider, useTheme, fonts } from './src/theme';
import { Text, Button, IconButton } from './src/components/ui';
import { BrandMark, ExerciseArtwork } from './src/components/Artwork';
import { HomeScreen } from './src/screens/HomeScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { JourneyScreen } from './src/screens/JourneyScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BreathingFlow } from './src/features/breathing/BreathingFlow';
import { Onboarding } from './src/features/onboarding/Onboarding';
import { BreathingExercise } from './src/types';

type Route='home'|'explore'|'journey'|'progress'|'favorites'|'settings';
const navigation=[{id:'home',label:'Home',icon:Home},{id:'explore',label:'Explore',icon:Compass},{id:'favorites',label:'Favorites',icon:Heart},{id:'journey',label:'Your journey',icon:CalendarDays},{id:'progress',label:'Your progress',icon:ChartNoAxesCombined}] as const;
const routes:Route[]=['home','explore','journey','progress','favorites','settings'];
function getRoute():Route{if(Platform.OS==='web'){const hash=window.location.hash.slice(1) as Route;return routes.includes(hash)?hash:'home'}return 'home'}

export default function App() {
 const[loaded,fontError]=useAppFonts();
 if(!loaded&&!fontError)return <View style={{flex:1,minHeight:'100%',alignItems:'center',justifyContent:'center',gap:20,backgroundColor:'#F6F7F3'}}><BrandMark size={56}/><ActivityIndicator color="#7D9B77"/></View>;
 return <AppErrorBoundary><SafeAreaProvider><AppProvider><ThemeProvider><AppShell/></ThemeProvider></AppProvider></SafeAreaProvider></AppErrorBoundary>
}

function AppShell(){
 const{width}=useWindowDimensions();const desktop=width>=900;const{colors,isDark}=useTheme();const{ready,error,preferences,demoMode,setDemoMode,updatePreferences,exercises,favorites}=useAppStore();
 const[route,setRoute]=useState<Route>(getRoute);const[exercise,setExercise]=useState<BreathingExercise|null>(null);const[onboarding,setOnboarding]=useState(false);const[toast,setToast]=useState('');const scroll=useRef<ScrollView>(null);const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const notify=useCallback((message:string)=>{setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),4400)},[]);
 useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current)},[]);
 const navigate=useCallback((next:Route)=>{setRoute(next);scroll.current?.scrollTo({y:0,animated:false});if(Platform.OS==='web'&&window.location.hash!=='#'+next)window.history.pushState({},'',next==='home'?window.location.pathname:'#'+next)},[]);
 useEffect(()=>{if(Platform.OS==='web'){const pop=()=>{setRoute(getRoute());scroll.current?.scrollTo({y:0,animated:false})};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop)}const back=BackHandler.addEventListener('hardwareBackPress',()=>{if(route!=='home'){navigate('home');return true}return false});return()=>back.remove()},[navigate,route]);
 const begin=(e?:BreathingExercise)=>setExercise(e||exercises.find(x=>x.category===preferences.defaultCategory)||exercises[0]);
 const title=route==='home'?'Overview':route==='journey'?'Your journey':route==='progress'?'Your progress':route==='settings'?'Your space':route==='favorites'?'Favorites':'Explore';
 if(!ready)return <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:18,backgroundColor:colors.background}}><BrandMark size={50} color={colors.primary}/><Text muted>Making a little space for you…</Text></View>;
 return <SafeAreaView edges={['top','left','right']} style={{flex:1,backgroundColor:colors.background}}>
 <View style={{flex:1,flexDirection:'row'}}>
 {desktop&&<View style={{width:width>=1350?224:205,paddingHorizontal:22,paddingTop:33,paddingBottom:24,borderRightWidth:1,borderColor:colors.line,backgroundColor:colors.nav}}>
 <Pressable accessibilityRole="button" accessibilityLabel="Breathing home" onPress={()=>navigate('home')} style={{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:3}}><BrandMark size={35} color={colors.primary}/><Text style={{fontFamily:fonts.semibold,fontSize:23,letterSpacing:-1,color:colors.primary}}>breathing<Text style={{color:colors.sage,fontSize:25}}>.</Text></Text></Pressable>
 <Text variant="caption" style={{fontSize:9,color:colors.subtle,marginTop:45,marginLeft:15,marginBottom:16,letterSpacing:1.6}}>YOUR SPACE</Text>
 <View style={{gap:7}}>{navigation.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:route===item.id}} accessibilityLabel={item.label} onPress={()=>navigate(item.id)} style={({pressed,hovered}:any)=>[{flexDirection:'row',alignItems:'center',gap:13,paddingHorizontal:16,minHeight:47,borderRadius:12,backgroundColor:route===item.id?colors.primaryLight:hovered?colors.surfaceAlt:'transparent',opacity:pressed?.6:1}]}><item.icon size={18} strokeWidth={route===item.id?1.8:1.5} color={route===item.id?colors.primary:colors.muted}/><Text style={{fontSize:12,fontFamily:route===item.id?fonts.semibold:fonts.regular,color:route===item.id?colors.primary:colors.muted}}>{item.label}</Text>{item.id==='favorites'&&favorites.length>0&&<View style={{marginLeft:'auto',borderRadius:6,backgroundColor:colors.surfaceAlt,paddingHorizontal:5}}><Text style={{fontSize:9,color:colors.muted}}>{favorites.length}</Text></View>}</Pressable>)}</View>
 <View style={{flex:1,minHeight:45}}/>
 <View style={{backgroundColor:colors.surfaceAlt,borderRadius:18,padding:17,overflow:'hidden',marginBottom:24}}><View style={{height:62,overflow:'hidden',marginHorizontal:-20,marginTop:-13,marginBottom:6}}><ExerciseArtwork kind="leaf" color="#7D9B77" height={100}/></View><Text style={{fontFamily:fonts.serif,fontSize:19,lineHeight:26}}>Small moments.{'\n'}Meaningful change.</Text><Text variant="small" muted style={{fontSize:10,lineHeight:17,marginTop:9}}>A gentle reminder to make{'\n'}a little time for you.</Text><Pressable accessibilityRole="button" onPress={()=>preferences.onboardingComplete?begin():setOnboarding(true)} style={{flexDirection:'row',alignItems:'center',gap:7,marginTop:13,minHeight:28}}><Text style={{fontSize:10,fontFamily:fonts.semibold,color:colors.primary}}>{preferences.onboardingComplete?'Take a breath':'Make it yours'}</Text><ArrowRight size={12} color={colors.primary}/></Pressable></View>
 <Pressable accessibilityRole="tab" accessibilityLabel="Settings" accessibilityState={{selected:route==='settings'}} onPress={()=>navigate('settings')} style={{flexDirection:'row',gap:12,paddingVertical:13,paddingHorizontal:15,alignItems:'center',backgroundColor:route==='settings'?colors.primaryLight:'transparent',borderRadius:12}}><Settings2 size={17} color={colors.muted} strokeWidth={1.5}/><Text variant="small" muted>Settings</Text></Pressable>
 <View style={{height:1,backgroundColor:colors.line,marginVertical:13}}/><Pressable onPress={()=>navigate('settings')} accessibilityRole="button" accessibilityLabel="Your profile" style={{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:6}}><View style={{width:34,height:34,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:colors.primaryLight}}><Text style={{fontSize:12,color:colors.primary,fontFamily:fonts.semibold}}>{preferences.name.slice(0,1).toUpperCase()||'M'}</Text></View><View style={{flex:1}}><Text style={{fontSize:11,fontFamily:fonts.medium}}>{preferences.name}</Text><Text style={{fontSize:9,color:colors.muted,marginTop:2}}>Your personal space</Text></View><ArrowUpRight size={14} color={colors.muted}/></Pressable>
 </View>}
 <View style={{flex:1,minWidth:0}}>
 <View style={{height:desktop?83:70,paddingHorizontal:desktop?40:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
 {desktop?<View style={{flexDirection:'row',alignItems:'center',gap:10}}><Text style={{fontSize:10,color:colors.muted}}>My wellbeing</Text><Text style={{fontSize:10,color:colors.subtle}}>/</Text><Text style={{fontSize:10,color:colors.ink}}>{title}</Text></View>:<Pressable onPress={()=>navigate('home')} accessibilityRole="button" accessibilityLabel="Breathing home" style={{flexDirection:'row',gap:7,alignItems:'center'}}><BrandMark size={29} color={colors.primary}/><Text style={{fontFamily:fonts.semibold,fontSize:19,color:colors.primary,letterSpacing:-.6}}>breathing.</Text></Pressable>}
 <View style={{flexDirection:'row',alignItems:'center',gap:desktop?17:5}}>{width>1150&&<Text variant="caption" style={{fontSize:9,color:colors.muted,letterSpacing:1.2}}>{new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}).toUpperCase()}</Text>}<Pressable accessibilityRole="button" accessibilityLabel={demoMode?'Switch to my real activity':'View example activity'} onPress={()=>{setDemoMode(!demoMode);notify(demoMode?'Showing your personal activity. Your journey starts here.':'Showing example activity. Your personal history stays separate.')}} style={{paddingHorizontal:9,paddingVertical:5,borderWidth:1,borderColor:colors.line,borderRadius:7,flexDirection:'row',gap:5,alignItems:'center'}}><View style={{height:4,width:4,backgroundColor:colors.sage,borderRadius:2}}/><Text style={{fontSize:9,color:colors.muted}}>{demoMode?'Example mode':'My activity'}</Text></Pressable>{desktop&&<IconButton icon={Search} label="Search exercises" onPress={()=>navigate('explore')} style={{width:30,height:34}}/>}<IconButton icon={isDark?Sun:Moon} label={isDark?'Use light appearance':'Use dark appearance'} onPress={()=>updatePreferences({appearance:isDark?'light':'dark'})} style={{width:34,height:34}}/>{desktop&&<View style={{width:1,height:21,backgroundColor:colors.line}}/>}<Pressable onPress={()=>navigate('settings')} accessibilityRole="button" accessibilityLabel="Open profile" style={{height:32,width:32,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:colors.primaryLight}}><Text style={{fontSize:11,color:colors.primary,fontFamily:fonts.medium}}>{preferences.name.slice(0,1).toUpperCase()||'M'}</Text></Pressable></View>
 </View>
 <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:desktop?40:20,paddingTop:desktop?17:16,paddingBottom:desktop?40:28,alignItems:'center'}} showsVerticalScrollIndicator={false}>
 <View style={{width:'100%',maxWidth:1180}}>
 {error&&<View accessibilityRole="alert" style={{padding:15,borderRadius:12,backgroundColor:colors.peach,marginBottom:20}}><Text style={{color:colors.danger,fontSize:12}}>{error}</Text></View>}
 {route==='home'&&<HomeScreen onStart={begin} onExplore={()=>navigate('explore')} onProgress={()=>navigate('progress')} onJourney={()=>navigate('journey')} onPersonalize={()=>setOnboarding(true)}/>}
 {route==='explore'&&<ExploreScreen key="explore" onStart={begin} onToast={notify}/>}
 {route==='favorites'&&<ExploreScreen key="favorites" onlyFavorites onStart={begin} onToast={notify}/>}
 {route==='progress'&&<ProgressScreen onStart={()=>begin()}/>}
 {route==='journey'&&<JourneyScreen onStart={id=>begin(exercises.find(e=>e.id===id))}/>}
 {route==='settings'&&<SettingsScreen onToast={notify} onPersonalize={()=>setOnboarding(true)}/>}
 {!preferences.onboardingComplete&&!desktop&&route==='home'&&<Pressable accessibilityRole="button" onPress={()=>setOnboarding(true)} style={{padding:18,marginTop:25,borderRadius:15,backgroundColor:colors.primaryLight,flexDirection:'row',gap:12,alignItems:'center'}}><Sparkles size={19} color={colors.primary}/><View style={{flex:1}}><Text variant="label">Make this space yours.</Text><Text variant="small" muted>Set your intention and a gentle daily goal.</Text></View><ArrowRight size={17} color={colors.primary}/></Pressable>}
 <View style={{flexDirection:'row',justifyContent:'center',gap:6,marginTop:29,alignItems:'center'}}><ShieldCheck size={11} color={colors.subtle}/><Text style={{fontSize:9,color:colors.subtle}}>A private practice. Saved only on your device.</Text></View>
 </View></ScrollView>
 {!desktop&&<SafeAreaView edges={['bottom']} style={{backgroundColor:colors.surface,borderTopWidth:1,borderColor:colors.line}}><View style={{height:70,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:8}}>{([{id:'home',label:'Home',icon:Home},{id:'explore',label:'Explore',icon:Compass},{id:'breathe',label:'Breathe',icon:Wind},{id:'progress',label:'Progress',icon:ChartNoAxesCombined},{id:'settings',label:'Profile',icon:UserRound}] as const).map(n=><Pressable key={n.id} accessibilityRole="tab" accessibilityState={{selected:route===n.id}} accessibilityLabel={n.label} onPress={()=>n.id==='breathe'?begin():navigate(n.id)} style={{flex:1,alignItems:'center',justifyContent:'center',gap:5,height:60}}>{n.id==='breathe'?<View style={{height:42,width:42,borderRadius:15,backgroundColor:colors.primary,justifyContent:'center',alignItems:'center',marginTop:-7}}><BrandMark size={28} color={colors.white}/></View>:<n.icon size={20} color={route===n.id?colors.primary:colors.muted} strokeWidth={1.65}/>}<Text style={{fontSize:9,color:route===n.id?colors.primary:colors.muted,fontFamily:route===n.id?fonts.semibold:fonts.regular}}>{n.label}</Text></Pressable>)}</View><View style={{flexDirection:'row',justifyContent:'center',gap:24,paddingBottom:6,marginTop:-1}}><Pressable onPress={()=>navigate('favorites')} accessibilityRole="button"><Text style={{fontSize:9,color:colors.muted}}>Favorites</Text></Pressable><Pressable onPress={()=>navigate('journey')} accessibilityRole="button"><Text style={{fontSize:9,color:colors.muted}}>Your journey</Text></Pressable></View></SafeAreaView>}
 </View></View>
 {!!toast&&<View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{position:'absolute',bottom:desktop?26:113,left:desktop?'35%':16,right:desktop?'20%':16,paddingLeft:18,paddingRight:7,paddingVertical:7,borderRadius:14,backgroundColor:colors.primary,flexDirection:'row',gap:10,alignItems:'center',shadowColor:'#000',shadowOpacity:.12,shadowRadius:15,shadowOffset:{width:0,height:6},elevation:8}}><Check size={16} color={colors.white}/><Text style={{flex:1,color:colors.white,fontSize:12}}>{toast}</Text><IconButton icon={X} label="Dismiss notification" onPress={()=>setToast('')} color={colors.white}/></View>}
 <BreathingFlow exercise={exercise} onClose={()=>setExercise(null)} onViewProgress={()=>{setExercise(null);navigate('progress')}}/>
 <Onboarding visible={onboarding} onClose={()=>setOnboarding(false)}/>
 </SafeAreaView>
}

class AppErrorBoundary extends React.Component<{children:React.ReactNode},{error:boolean}> {
 state={error:false};
 static getDerivedStateFromError(){return {error:true}}
 render(){if(this.state.error)return <View style={{flex:1,minHeight:'100%',padding:30,alignItems:'center',justifyContent:'center',backgroundColor:'#F6F7F3',gap:18}}><BrandMark size={50}/><Text variant="heading">Let’s take a fresh breath.</Text><Text muted style={{textAlign:'center'}}>Something interrupted the app. Your saved practice stays on this device.</Text><Button label="Try again" onPress={()=>this.setState({error:false})}/></View>;return this.props.children}
}
