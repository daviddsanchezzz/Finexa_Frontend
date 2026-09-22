import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../../context/AuthContext';
import { useGoogleAuthRequest } from '../../../hooks/useGoogleAuth';
import api from '../../../api/api';

const BLUE = '#2458E8';
const INK = '#18253B';
const MUTED = '#738096';
const FONT = Platform.OS === 'web' ? '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : 'System';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Brand() {
  return <View style={s.brand}>
    <View style={s.logoCrop}><Image source={require('../../../../assets/finex_logo.png')} style={s.logo} /></View>
    <Text style={s.wordmark}>finexa<Text style={{ color: BLUE }}>.</Text></Text>
  </View>;
}

function GoogleMark() {
  return <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityLabel="Google">
    <Path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z" />
    <Path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
    <Path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.35-2.59Z" />
    <Path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59A5.98 5.98 0 0 1 12 5.96Z" />
  </Svg>;
}

function ProductPreview({ compact }: { compact: boolean }) {
  return <View style={[s.preview, compact && { padding: 20, marginBottom: 0 }]} accessibilityLabel="Vista de ejemplo de tus finanzas">
    <View style={s.rowBetween}><Text style={s.previewLabel}>TU MES, DE UN VISTAZO</Text><View style={s.example}><Text style={s.exampleText}>Ejemplo</Text></View></View>
    <Text style={s.balance}>2.450<Text style={s.balanceDecimal}>,00 €</Text></Text>
    <Text style={s.small}>Disponible este mes</Text>
    <View style={[s.chart, compact && { height: 48, marginTop: 14 }]}>
      {[34, 49, 40, 63, 53, 72, 61, 82, 74, 90, 80, 100].map((height, i) => <View key={i} style={{ flex: 1, height: `${height}%`, borderRadius: 5, backgroundColor: i === 11 ? BLUE : i > 7 ? '#A7BDFF' : '#DDE6FF' }} />)}
    </View>
    <View style={s.rowBetween}><Text style={s.small}>1 sept.</Text><Text style={s.small}>30 sept.</Text></View>
    <View style={s.previewDivider} />
    <View style={s.rowBetween}>
      <View style={s.metric}><View style={[s.metricIcon, { backgroundColor: '#E8F6F0' }]}><Ionicons name="arrow-down" size={16} color="#258466" /></View><View><Text style={s.small}>Ingresos</Text><Text style={s.metricAmount}>3.200,00 €</Text></View></View>
      <View style={s.metric}><View style={[s.metricIcon, { backgroundColor: '#FFF2E9' }]}><Ionicons name="arrow-up" size={16} color="#C27C40" /></View><View><Text style={s.small}>Gastos</Text><Text style={s.metricAmount}>750,00 €</Text></View></View>
    </View>
    {!compact && <View style={s.saving}><View style={s.savingIcon}><Ionicons name="airplane-outline" size={22} color={BLUE} /></View><View style={{ flex: 1 }}><Text style={s.savingTitle}>Tu próximo viaje, más cerca</Text><Text style={s.small}>Pequeños ahorros. Grandes planes.</Text></View><Ionicons name="checkmark-circle" size={23} color="#258466" /></View>}
  </View>;
}

function Field({ label, value, onChangeText, placeholder, password, autoComplete, onSubmitEditing, inputRef, editable = true, compact = false }: {
  compact?: boolean; label: string; value: string; onChangeText: (value: string) => void; placeholder: string;
  password?: boolean; autoComplete?: 'email' | 'name' | 'current-password' | 'new-password';
  onSubmitEditing?: () => void; inputRef?: React.RefObject<TextInput | null>; editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <View style={[s.field, compact && { marginBottom: 13 }]}>
    <Text style={s.label}>{label}</Text>
    <View style={[s.inputWrap, compact && { height: 44 }, focused && s.inputFocused]}>
      <TextInput ref={inputRef} accessibilityLabel={label} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor="#9AA4B5" secureTextEntry={password && !visible}
        autoComplete={autoComplete} autoCapitalize={autoComplete === 'name' ? 'words' : 'none'}
        keyboardType={autoComplete === 'email' ? 'email-address' : 'default'} autoCorrect={false}
        editable={editable} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing} style={s.input} />
      {password && <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setVisible(!visible)} style={s.eye}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={MUTED} />
      </Pressable>}
    </View>
  </View>;
}

function errorMessage(error: any, fallback: string): string {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : typeof message === 'string' ? message : fallback;
}

export default function DesktopAuthScreen({ mode, navigation }: { mode: 'login' | 'register'; navigation: any }) {
  const register = mode === 'register';
  const { width, height } = useWindowDimensions();
  const compact = height < 900;
  const fitViewport = height >= 620;
  const wide = width >= 1050;
  const { login, loginWithGoogle } = useAuth();
  const { request, response, promptAsync, isConfigured } = useGoogleAuthRequest();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [forgot, setForgot] = useState(false);
  const lock = useRef(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.params?.id_token) {
      setGoogleBusy(true);
      loginWithGoogle(response.params.id_token)
        .catch(e => setError(errorMessage(e, 'No se pudo continuar con Google. Inténtalo de nuevo.')))
        .finally(() => { setGoogleBusy(false); lock.current = false; });
    } else {
      if (response.type === 'error' || response.type === 'success') setError('No se pudo continuar con Google. Inténtalo de nuevo.');
      setGoogleBusy(false);
      lock.current = false;
    }
  }, [response]);

  const submit = async () => {
    if (lock.current) return;
    setError(''); setNotice('');
    const candidate = email.trim();
    if (!emailPattern.test(candidate)) return setError('Introduce un correo electrónico válido.');
    if (!forgot && ((!password) || (register && !name.trim()))) return setError('Completa todos los campos para continuar.');
    if (!forgot && register && password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    lock.current = true; setBusy(true);
    try {
      if (forgot) {
        await api.post('/auth/forgot-password', { email: candidate });
        setNotice('Si este correo tiene una cuenta, recibirás un enlace para restablecer tu contraseña.');
      } else if (register) {
        await api.post('/auth/register', { name: name.trim(), email: candidate, password });
        setNotice('Tu cuenta ya está creada. Inicia sesión para empezar.');
        setPassword('');
      } else {
        await login(candidate, password);
        // DesktopNavigator abre la aplicación al actualizarse la sesión.
      }
    } catch (e) {
      setError(errorMessage(e, forgot ? 'No se pudo enviar el enlace. Inténtalo de nuevo.' : register ? 'No se pudo crear la cuenta.' : 'No se pudo iniciar sesión. Revisa tu correo y contraseña.'));
    } finally { setBusy(false); lock.current = false; }
  };

  const google = async () => {
    if (lock.current) return;
    setError(''); setNotice('');
    if (!isConfigured) return setError('El acceso con Google todavía no está disponible. Puedes continuar con tu correo.');
    if (!request) return setError('Google se está preparando. Inténtalo de nuevo en unos segundos.');
    lock.current = true; setGoogleBusy(true);
    try { await promptAsync(); }
    catch { setError('No se pudo abrir Google. Inténtalo de nuevo.'); }
    finally { setGoogleBusy(false); lock.current = false; }
  };

  const switchScreen = () => navigation.navigate(register ? 'DesktopLogin' : 'DesktopRegister');
  const disabled = busy || googleBusy;

  return <ScrollView style={s.page} scrollEnabled={!fitViewport} contentContainerStyle={[s.pageContent, fitViewport && { flex: 1 }, compact && { padding: 12 }, !wide && { padding: 0 }]} keyboardShouldPersistTaps="handled">
    <View style={[s.shell, !fitViewport && { minHeight: 620 }]}>
      {wide && <View style={[s.story, compact && { padding: 26 }]}>
        <Brand />
        <View style={[s.storyBody, compact && { paddingVertical: 12 }]}>
          <View style={[s.eyebrow, compact && { marginBottom: 14 }]}><View style={s.dot} /><Text style={s.eyebrowText}>MENOS CUENTAS. MÁS VIDA.</Text></View>
          <Text style={[s.headline, compact && { fontSize: 36, lineHeight: 43 }]}>Tu dinero, claro.{"\n"}<Text style={{ color: BLUE }}>Tus planes, cerca.</Text></Text>
          <Text style={[s.storyCopy, compact && { marginTop: 14, marginBottom: 22 }]}>Entiende tus gastos, organiza tus ahorros y haz espacio para lo que de verdad importa.</Text>
          <ProductPreview compact={compact} />
        </View>
        <View style={s.storyFooter}><Ionicons name="layers-outline" size={17} color={MUTED} /><Text style={s.small}>Tus cuentas, tus gastos y tus metas. En un solo lugar.</Text></View>
      </View>}
      <View style={[s.formSide, !wide && { paddingHorizontal: width < 500 ? 24 : 48 }]}>
        <View style={s.topbar}>
          {!wide ? <Brand /> : <View />}
          <View style={s.switchRow}><Text style={s.small}>{register ? '¿Ya tienes cuenta?' : '¿Primera vez aquí?'}</Text><Pressable disabled={disabled} accessibilityRole="button" onPress={switchScreen} style={s.switchButton}><Text style={s.switchText}>{register ? 'Iniciar sesión' : 'Crear cuenta'} <Ionicons name="arrow-forward" size={13} /></Text></Pressable></View>
        </View>
        <View style={[s.formCenter, compact && { paddingVertical: 16 }]}>
          <View style={s.form}>
            {height >= 760 && <View style={s.welcomeIcon}><Ionicons name={forgot ? 'key-outline' : register ? 'sparkles-outline' : 'wallet-outline'} size={24} color={BLUE} /></View>}
            <Text accessibilityRole="header" style={s.title}>{forgot ? 'Recupera tu acceso' : register ? 'Empieza tu nueva etapa.' : 'Qué bueno verte de nuevo.'}</Text>
            <Text style={[s.subtitle, compact && { marginBottom: 18 }]}>{forgot ? 'Te enviaremos un enlace para crear una nueva contraseña.' : register ? 'Un poco de orden hoy. Más tranquilidad mañana.' : 'Entra y sigue dando forma a tus planes.'}</Text>
            {!forgot && !notice && <>
              <Pressable accessibilityRole="button" onPress={google} disabled={disabled} style={({ hovered, pressed }: any) => [s.googleButton, hovered && { backgroundColor: '#F8FAFC', borderColor: '#B6C3D8' }, pressed && { opacity: 0.75 }, disabled && { opacity: 0.65 }]}>
                {googleBusy ? <ActivityIndicator color={BLUE} /> : <GoogleMark />}<Text style={s.googleText}>{googleBusy ? 'Conectando con Google…' : 'Continuar con Google'}</Text>
              </Pressable>
              <View style={[s.divider, compact && { marginVertical: 16 }]}><View style={s.line} /><Text style={s.dividerText}>o con tu correo</Text><View style={s.line} /></View>
            </>}
            {!!error && <View accessibilityRole="alert" style={s.error}><Ionicons name="alert-circle-outline" size={18} color="#BB3942" /><Text style={s.errorText}>{error}</Text></View>}
            {!!notice ? <>
              <View accessibilityLiveRegion="polite" style={s.success}><Ionicons name="checkmark-circle-outline" size={22} color="#258466" /><Text style={s.successText}>{notice}</Text></View>
              <Pressable accessibilityRole="button" onPress={() => { if (register) navigation.navigate('DesktopLogin'); else { setForgot(false); setNotice(''); } }} style={s.primary}><Text style={s.primaryText}>Volver a iniciar sesión</Text><Ionicons name="arrow-forward" size={18} color="white" /></Pressable>
            </> : <>
              {register && !forgot && <Field compact={compact} label="Tu nombre" placeholder="¿Cómo te llamas?" value={name} onChangeText={setName} autoComplete="name" editable={!disabled} onSubmitEditing={() => emailRef.current?.focus()} />}
              <Field compact={compact} label="Correo electrónico" placeholder="tu@ejemplo.com" value={email} onChangeText={setEmail} autoComplete="email" inputRef={emailRef} editable={!disabled} onSubmitEditing={forgot ? submit : () => passwordRef.current?.focus()} />
              {!forgot && <Field compact={compact} label="Contraseña" placeholder={register ? 'Crea una contraseña' : 'Introduce tu contraseña'} value={password} onChangeText={setPassword} password autoComplete={register ? 'new-password' : 'current-password'} inputRef={passwordRef} editable={!disabled} onSubmitEditing={submit} />}
              {register && !forgot && <Text style={s.passwordHint}>Usa al menos 6 caracteres.</Text>}
              {!register && !forgot && <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { setForgot(true); setError(''); }} style={s.forgot}><Text style={s.link}>¿Has olvidado tu contraseña?</Text></Pressable>}
              <Pressable accessibilityRole="button" disabled={disabled} onPress={submit} style={({ hovered, pressed }: any) => [s.primary, hovered && { backgroundColor: '#1946CB' }, (pressed || disabled) && { opacity: 0.7 }]}>
                {busy ? <ActivityIndicator color="white" /> : <><Text style={s.primaryText}>{forgot ? 'Enviar enlace de recuperación' : register ? 'Crear mi cuenta' : 'Iniciar sesión'}</Text><Ionicons name="arrow-forward" size={18} color="white" /></>}
              </Pressable>
              {forgot && <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { setForgot(false); setError(''); }} style={s.back}><Text style={s.link}>Volver a iniciar sesión</Text></Pressable>}
            </>}
          </View>
        </View>
        <View style={s.formFooter}><View style={s.footerRule} /><Text style={s.footerText}>Un lugar para poner tus finanzas en orden.</Text><Text style={s.copyright}>© {new Date().getFullYear()} Finexa</Text></View>
      </View>
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  pageContent: { flexGrow: 1, padding: 20 },
  shell: { flex: 1, flexDirection: 'row', minHeight: 0 },
  story: { width: '46%', backgroundColor: '#F0F4FC', borderRadius: 24, padding: 42, overflow: 'hidden' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoCrop: { width: 33, height: 37, overflow: 'hidden', borderRadius: 7, backgroundColor: 'white' },
  logo: { width: 52, height: 52, position: 'absolute', left: -10, top: -8, resizeMode: 'contain' },
  wordmark: { fontFamily: FONT, fontSize: 29, fontWeight: '700', letterSpacing: -1.2, color: INK },
  storyBody: { flex: 1, justifyContent: 'center', maxWidth: 510, width: '100%', alignSelf: 'center', paddingVertical: 46 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 22 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE },
  eyebrowText: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#58708F' },
  headline: { fontFamily: FONT, fontSize: 46, lineHeight: 55, fontWeight: '600', letterSpacing: -2, color: INK },
  storyCopy: { fontFamily: FONT, fontSize: 15, lineHeight: 25, color: '#65758D', maxWidth: 360, marginTop: 20, marginBottom: 35 },
  preview: { backgroundColor: 'white', padding: 25, borderRadius: 19, width: '100%', maxWidth: 390, shadowColor: '#506EA5', shadowOpacity: 0.08, shadowRadius: 25, shadowOffset: { width: 0, height: 12 }, marginBottom: 30 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewLabel: { fontFamily: FONT, color: '#6C7890', fontSize: 9, fontWeight: '600', letterSpacing: 1.5 },
  example: { backgroundColor: '#F4F6FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  exampleText: { fontFamily: FONT, color: MUTED, fontSize: 9 },
  balance: { fontFamily: FONT, fontSize: 37, color: INK, fontWeight: '600', letterSpacing: -1.4, marginTop: 18, marginBottom: 4 },
  balanceDecimal: { fontSize: 27, color: '#8E9BAE', fontWeight: '400' },
  small: { fontFamily: FONT, fontSize: 11, color: MUTED, lineHeight: 18 },
  chart: { height: 83, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 20, marginBottom: 10 },
  previewDivider: { height: 1, backgroundColor: '#EDF0F5', marginVertical: 17 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  metricIcon: { height: 32, width: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  metricAmount: { fontFamily: FONT, fontSize: 14, color: INK, fontWeight: '600', marginTop: 1 },
  saving: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EBEFF8', marginTop: 24, marginBottom: -53, marginRight: -42, marginLeft: 24, shadowColor: '#506EA5', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  savingIcon: { width: 38, height: 38, backgroundColor: '#EFF3FF', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  savingTitle: { fontFamily: FONT, color: INK, fontWeight: '600', fontSize: 12, marginBottom: 3 },
  storyFooter: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  formSide: { flex: 1, paddingHorizontal: 48, paddingTop: 14, paddingBottom: 20 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 13, flexWrap: 'wrap' },
  switchButton: { paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 8 },
  switchText: { fontFamily: FONT, color: INK, fontSize: 12, fontWeight: '600' },
  formCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  form: { width: '100%', maxWidth: 400 },
  welcomeIcon: { width: 49, height: 49, borderRadius: 14, backgroundColor: '#EFF3FF', alignItems: 'center', justifyContent: 'center', marginBottom: 23 },
  title: { fontFamily: FONT, color: INK, fontSize: 29, fontWeight: '600', letterSpacing: -1, lineHeight: 37 },
  subtitle: { fontFamily: FONT, color: MUTED, fontSize: 14, lineHeight: 22, marginTop: 10, marginBottom: 29 },
  googleButton: { borderWidth: 1, borderColor: '#DCE2EC', borderRadius: 9, height: 50, flexDirection: 'row', gap: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  googleText: { fontFamily: FONT, fontSize: 14, fontWeight: '500', color: INK },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 17, marginVertical: 25 },
  line: { flex: 1, height: 1, backgroundColor: '#E9EDF3' },
  dividerText: { fontFamily: FONT, fontSize: 12, color: '#909BAC' },
  field: { marginBottom: 18 },
  label: { fontFamily: FONT, fontSize: 12, color: '#34435B', fontWeight: '500', marginBottom: 8 },
  inputWrap: { borderWidth: 1, borderColor: '#DCE2EC', borderRadius: 9, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', height: 50 },
  inputFocused: { borderColor: BLUE, backgroundColor: '#FAFBFF' },
  input: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, color: INK, paddingHorizontal: 15, height: '100%' },
  eye: { padding: 13 },
  passwordHint: { fontFamily: FONT, fontSize: 11, color: MUTED, marginTop: -9, marginBottom: 12 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 3, marginTop: -4, marginBottom: 8 },
  link: { fontFamily: FONT, color: BLUE, fontSize: 12, fontWeight: '500' },
  primary: { height: 50, borderRadius: 9, backgroundColor: BLUE, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 15 },
  primaryText: { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: 'white' },
  error: { flexDirection: 'row', gap: 9, backgroundColor: '#FFF1F2', borderRadius: 9, padding: 13, marginBottom: 18 },
  errorText: { flex: 1, fontFamily: FONT, fontSize: 12, lineHeight: 19, color: '#BB3942' },
  success: { flexDirection: 'row', gap: 10, backgroundColor: '#EDF8F2', padding: 18, borderRadius: 10, marginBottom: 18 },
  successText: { flex: 1, fontFamily: FONT, fontSize: 14, lineHeight: 23, color: '#226B53' },
  back: { alignSelf: 'center', padding: 18 },
  formFooter: { alignItems: 'center', gap: 10 },
  footerRule: { width: 30, height: 1, backgroundColor: '#DDE3ED', marginBottom: 4 },
  footerText: { fontFamily: FONT, fontSize: 11, color: MUTED },
  copyright: { fontFamily: FONT, fontSize: 10, color: '#A3ADBC' },
});
