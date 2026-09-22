import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InitialsAvatar from './InitialsAvatar';

type Item = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };
type Props = {
  activeRoute: string;
  user: { name?: string | null; email?: string | null } | null;
  onNavigate: (route: string) => void;
  onCreate: () => void;
  onLogout: () => void;
};
const groups: { label: string; items: Item[] }[] = [
  { label: 'MI DINERO', items: [
    { key: 'dashboard', label: 'Resumen', icon: 'grid-outline' },
    { key: 'registre', label: 'Patrimonio', icon: 'wallet-outline' },
    { key: 'investments', label: 'Inversiones', icon: 'trending-up-outline' },
    { key: 'reports', label: 'Reportes', icon: 'bar-chart-outline' },
  ] },
  { label: 'MIS PLANES', items: [
    { key: 'budgets', label: 'Presupuestos', icon: 'pie-chart-outline' },
    { key: 'debts', label: 'Deudas', icon: 'receipt-outline' },
    { key: 'goals', label: 'Objetivos', icon: 'flag-outline' },
    { key: 'Projects', label: 'Proyectos', icon: 'briefcase-outline' },
    { key: 'travels', label: 'Viajes', icon: 'airplane-outline' },
  ] },
];
const FONT = Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : 'System';
const BLUE = '#2458E8';

export default function DesktopSidebar({ activeRoute, user, onNavigate, onCreate, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen || Platform.OS !== 'web') return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  const navigate = (key: string) => { setMenuOpen(false); setTooltip(null); onNavigate(key); };
  const row = (item: Item) => {
    const active = activeRoute === item.key;
    return <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: active }}
      onPress={() => navigate(item.key)} onHoverIn={() => setTooltip(item.key)} onHoverOut={() => setTooltip(null)}
      onFocus={() => setTooltip(item.key)} onBlur={() => setTooltip(null)}
      style={({ hovered, pressed }: any) => [s.navRow, collapsed && s.centered, active ? s.active : hovered && s.hover, pressed && { opacity: 0.7 }]}>
      {active && <View style={s.activeLine} />}
      <Ionicons name={item.icon} size={20} color={active ? BLUE : '#7C879B'} />
      {!collapsed && <Text numberOfLines={1} style={[s.navText, active && s.activeText]}>{item.label}</Text>}
      {collapsed && tooltip === item.key && <View pointerEvents="none" style={s.tooltip}><Text style={s.tooltipText}>{item.label}</Text></View>}
    </Pressable>;
  };

  return <View style={[s.sidebar, collapsed && s.collapsed]}>
    <View style={[s.header, collapsed && { flexDirection: 'column', gap: 16 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Finexa, ir al resumen" onPress={() => navigate('dashboard')} style={s.brand}>
        <View style={s.logoCrop}><Image source={require('../../assets/finex_logo.png')} style={s.logo} /></View>
        {!collapsed && <Text style={s.wordmark}>finexa<Text style={{ color: BLUE }}>.</Text></Text>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? 'Expandir menú' : 'Contraer menú'}
        onPress={() => { setCollapsed(!collapsed); setMenuOpen(false); setTooltip(null); }}
        style={({ hovered }: any) => [s.collapseButton, hovered && s.hover]}>
        <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={15} color="#8893A5" />
      </Pressable>
    </View>

    <Pressable accessibilityRole="button" accessibilityLabel="Nuevo movimiento" onPress={onCreate}
      style={({ hovered, pressed }: any) => [s.create, collapsed && { paddingHorizontal: 0 }, hovered && { backgroundColor: '#1946CB' }, pressed && { opacity: 0.8 }]}>
      <Ionicons name="add" size={21} color="white" />
      {!collapsed && <Text style={s.createText}>Nuevo movimiento</Text>}
    </Pressable>

    <ScrollView style={s.navigation} contentContainerStyle={s.navigationContent} showsVerticalScrollIndicator={false}>
      {groups.map((group, index) => <View key={group.label} style={s.group}>
        {collapsed ? <View style={[s.groupRule, index === 0 && { marginTop: 0 }]} /> : <Text style={s.groupLabel}>{group.label}</Text>}
        <View style={{ gap: 4 }}>{group.items.map(row)}</View>
      </View>)}
    </ScrollView>

    <View style={s.footer}>
      {row({ key: 'settings', label: 'Ajustes', icon: 'settings-outline' })}
      <View style={s.profileContainer}>
        <Pressable accessibilityRole="button" accessibilityLabel="Menú de cuenta" accessibilityState={{ expanded: menuOpen }}
          onPress={() => { setMenuOpen(!menuOpen); setTooltip(null); }}
          style={({ hovered }: any) => [s.profile, collapsed && { paddingHorizontal: 0, justifyContent: 'center' }, (hovered || menuOpen) && { backgroundColor: '#EEF2F8' }]}>
          <InitialsAvatar name={user?.name ?? undefined} email={user?.email ?? undefined} size={34} />
          {!collapsed && <><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={s.userName}>{user?.name || 'Mi cuenta'}</Text><Text numberOfLines={1} style={s.email}>{user?.email || 'Cuenta personal'}</Text></View><Ionicons name={menuOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#8893A5" /></>}
        </Pressable>
        {menuOpen && <>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar menú de cuenta" onPress={() => setMenuOpen(false)} style={[s.backdrop, Platform.OS === 'web' && { position: 'fixed' as any }]} />
          <View style={[s.accountMenu, collapsed && { left: 0, width: 220 }]}>
            <Text style={s.accountLabel}>TU CUENTA</Text>
            <Text numberOfLines={1} style={s.menuEmail}>{user?.email || 'Cuenta personal'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Ajustes de la cuenta" onPress={() => navigate('settings')} style={({ hovered }: any) => [s.menuRow, hovered && s.hover]}><Ionicons name="settings-outline" size={18} color="#637087" /><Text style={s.menuText}>Ajustes de la cuenta</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" onPress={() => { setMenuOpen(false); onLogout(); }} style={({ hovered }: any) => [s.menuRow, hovered && { backgroundColor: '#FFF1F2' }]}><Ionicons name="log-out-outline" size={18} color="#BD4552" /><Text style={[s.menuText, { color: '#BD4552' }]}>Cerrar sesión</Text></Pressable>
          </View>
        </>}
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  sidebar: { width: 232, backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: '#E9EDF4', paddingHorizontal: 12, paddingTop: 26, paddingBottom: 16, zIndex: 20 },
  collapsed: { width: 80, paddingHorizontal: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 5, marginBottom: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoCrop: { width: 29, height: 33, overflow: 'hidden', backgroundColor: 'white', borderRadius: 5 },
  logo: { position: 'absolute', width: 47, height: 47, left: -10, top: -7, resizeMode: 'contain' },
  wordmark: { fontFamily: FONT, fontSize: 26, fontWeight: '700', letterSpacing: -1, color: '#18253B' },
  collapseButton: { width: 27, height: 27, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  create: { height: 44, borderRadius: 9, backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 28 },
  createText: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  navigation: { flex: 1, overflow: 'visible' },
  navigationContent: { paddingBottom: 20 },
  group: { marginBottom: 26 },
  groupLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '600', letterSpacing: 1.6, color: '#9AA4B4', paddingLeft: 13, marginBottom: 12 },
  groupRule: { height: 1, marginHorizontal: 15, marginBottom: 16, backgroundColor: '#E9EDF4' },
  navRow: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, borderRadius: 9, position: 'relative' },
  centered: { justifyContent: 'center', paddingHorizontal: 0 },
  navText: { fontFamily: FONT, fontSize: 13, fontWeight: '500', color: '#59667C' },
  active: { backgroundColor: '#EDF2FF' },
  activeText: { color: BLUE, fontWeight: '600' },
  activeLine: { position: 'absolute', left: 0, width: 3, height: 17, borderRadius: 2, backgroundColor: BLUE },
  hover: { backgroundColor: '#F5F7FB' },
  tooltip: { position: 'absolute', left: 62, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 7, backgroundColor: '#25334A', zIndex: 50, minWidth: 110 },
  tooltipText: { fontFamily: FONT, color: 'white', fontSize: 12 },
  footer: { borderTopWidth: 1, borderTopColor: '#EDF0F5', paddingTop: 12, gap: 12 },
  profileContainer: { position: 'relative' },
  profile: { minHeight: 61, borderRadius: 10, backgroundColor: '#F7F9FC', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  userName: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: '#34435B' },
  email: { fontFamily: FONT, fontSize: 10, color: '#8B96A8', marginTop: 4 },
  backdrop: { position: 'absolute', top: -10000, bottom: -10000, left: -10000, right: -10000, zIndex: 99 },
  accountMenu: { position: 'absolute', bottom: 70, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 12, padding: 8, shadowColor: '#223656', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 5 }, zIndex: 100 },
  accountLabel: { fontFamily: FONT, fontSize: 9, color: '#9AA4B4', letterSpacing: 1.3, padding: 8 },
  menuEmail: { fontFamily: FONT, fontSize: 11, color: '#637087', paddingHorizontal: 8, paddingBottom: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 39, paddingHorizontal: 8, borderRadius: 6 },
  menuText: { fontFamily: FONT, fontSize: 12, color: '#34435B' },
});
