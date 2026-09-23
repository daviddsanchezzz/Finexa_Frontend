import React, { ReactNode, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { COMMON_CURRENCIES } from "../../utils/exchangeRate";
import CurrencyPickerModal from "../CurrencyPickerModal";
import AppSwitch from "../AppSwitch";
import WalletIcon from "../WalletIcon";
import CrossPlatformDateTimePicker from "../CrossPlatformDateTimePicker";

type IoniconName = keyof typeof Ionicons.glyphMap;

export function FormSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {title ? (
        <View style={{ marginBottom: -4 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.45, color: colors.textSecondary }}>{title}</Text>
          {description ? (
            <Text style={{ fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 3 }}>{description}</Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function FormError({ message }: { message?: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return <Text style={{ fontSize: 11.5, lineHeight: 16, fontWeight: "600", color: colors.error, marginTop: 6 }}>{message}</Text>;
}

export interface FormTextFieldProps extends Omit<TextInputProps, "value" | "onChangeText"> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  icon?: IoniconName;
  hint?: string;
  error?: string | null;
  showError?: boolean;
  required?: boolean;
  suffix?: string;
  minHeight?: number;
}

export function FormTextField({
  label,
  value,
  onChangeText,
  icon,
  hint,
  error,
  showError = false,
  required = false,
  suffix,
  multiline,
  minHeight,
  onBlur,
  ...inputProps
}: FormTextFieldProps) {
  const { colors } = useTheme();
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const visibleError = error && (touched || showError) ? error : null;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary }}>
          {label}{required ? <Text style={{ color: colors.error }}> *</Text> : null}
        </Text>
      </View>
      <View
        style={{
          minHeight: multiline ? 88 : 44,
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          borderWidth: 1,
          borderColor: visibleError ? "#FCA5A5" : focused ? colors.primary : colors.border,
          borderRadius: radii.input,
          backgroundColor: colors.surface,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
        }}
      >
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }} /> : null}
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            setTouched(true);
            onBlur?.(event);
          }}
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            minHeight: multiline ? 66 : 42,
            paddingVertical: 0,
            textAlignVertical: multiline ? "top" : "center",
            fontSize: 15,
            fontWeight: "600",
            color: colors.text,
          }}
        />
        {suffix ? <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "700", color: colors.textSecondary }}>{suffix}</Text> : null}
      </View>
      {hint && !visibleError ? <Text style={{ fontSize: 11.5, lineHeight: 16, color: colors.textMuted, marginTop: 6 }}>{hint}</Text> : null}
      <FormError message={visibleError} />
    </View>
  );
}

export function FormMoneyField(props: FormTextFieldProps & { currency?: string }) {
  const { currency, ...rest } = props;
  return <FormTextField {...rest} keyboardType="decimal-pad" suffix={currency} />;
}

export function FormNumberField(props: FormTextFieldProps) {
  return <FormTextField {...props} keyboardType="decimal-pad" />;
}

export function FormNotesField(props: FormTextFieldProps) {
  return <FormTextField {...props} multiline numberOfLines={4} />;
}

// Campo de emoji: una casilla donde el usuario escribe/pega directamente un
// emoji desde el teclado nativo del sistema (mismo patrón ya usado en
// EditWalletModal/EditCategoryModal, ahora disponible para los módulos que
// usan el shell de creación).
export function FormEmojiField({
  label = "Emoji",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.slice(0, 2))}
        maxLength={2}
        style={{
          width: 52,
          height: 44,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.input,
          backgroundColor: colors.surface,
          textAlign: "center",
          fontSize: 24,
        }}
      />
    </View>
  );
}

export function FormSelect({
  label,
  value,
  onPress,
  required = false,
  error,
}: {
  label?: string;
  value: string;
  onPress: () => void;
  required?: boolean;
  error?: string | null;
}) {
  const { colors } = useTheme();
  return (
    <View>
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 5 }}>
          {label}{required ? <Text style={{ color: colors.error }}> *</Text> : null}
        </Text>
      ) : null}
      <TouchableOpacity
        onPress={() => {
          Keyboard.dismiss();
          onPress();
        }}
        activeOpacity={0.75}
        accessibilityRole="button"
        style={{
          minHeight: 44,
          paddingHorizontal: 12,
          borderRadius: radii.input,
          borderWidth: 1,
          borderColor: error ? "#FCA5A5" : colors.border,
          backgroundColor: colors.surface,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.text }}>{value}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      <FormError message={error} />
    </View>
  );
}

export function FormCurrencyPicker({
  value,
  onChange,
  required = false,
}: {
  value: string;
  onChange: (currency: string) => void;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const selected = COMMON_CURRENCIES.find((currency) => currency.code === value);
  const displayValue = selected ? `${selected.code} — ${selected.label}` : value;

  return (
    <>
      <FormSelect label="Divisa" value={displayValue} required={required} onPress={() => setVisible(true)} />
      <CurrencyPickerModal
        visible={visible}
        value={value}
        onSelect={onChange}
        onClose={() => setVisible(false)}
      />
    </>
  );
}

export function FormSegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
  onClear,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  required?: boolean;
  onClear?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary }}>
          {label}{required ? <Text style={{ color: colors.error }}> *</Text> : null}
        </Text>
        {value && onClear ? (
          <TouchableOpacity onPress={onClear} hitSlop={8}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted }}>Quitar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", padding: 3, borderRadius: radii.input, backgroundColor: colors.card }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              activeOpacity={0.75}
              style={{
                flex: 1,
                minHeight: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 11,
                backgroundColor: selected ? colors.surface : "transparent",
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: selected ? "800" : "600", color: selected ? colors.text : colors.textSecondary }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function FormOptionCard({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: IoniconName;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        minHeight: 44,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? `${colors.primary}1A` : colors.surface,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? colors.primary : colors.textSecondary} /> : null}
      <Text style={{ marginLeft: icon ? 6 : 0, fontSize: 12.5, fontWeight: "700", color: selected ? colors.primary : colors.textSecondary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function FormToggle({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{label}</Text>
        {description ? (
          <Text style={{ fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 4 }}>{description}</Text>
        ) : null}
      </View>
      <AppSwitch accessibilityLabel={label} value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

export function FormDateField({
  label,
  value,
  onChange,
  required = false,
}: {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const displayValue = value.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <View>
      <FormSelect label={label} value={displayValue} required={required} onPress={() => setVisible(true)} />
      <CrossPlatformDateTimePicker
        isVisible={visible}
        mode="date"
        date={value}
        onConfirm={(date) => {
          setVisible(false);
          onChange(date);
        }}
        onCancel={() => setVisible(false)}
      />
    </View>
  );
}

// Bottom sheet compartido para elegir 1 categoría de una lista, excluyendo las
// que el llamador ya tiene seleccionadas (p.ej. sublímites de un presupuesto).
export function FormCategoryPicker({
  visible,
  title = "Selecciona una categoría",
  categories,
  excludeIds = [],
  onSelect,
  onClose,
}: {
  visible: boolean;
  title?: string;
  categories: { id: number; name: string; emoji?: string | null }[];
  excludeIds?: number[];
  onSelect: (category: { id: number; name: string; emoji?: string | null }) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const available = categories.filter((c) => !excludeIds.includes(c.id));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.38)" }} />
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "72%",
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 24,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: colors.text }}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {available.length === 0 ? (
          <Text style={{ padding: 24, fontSize: 13, color: colors.textMuted, textAlign: "center" }}>
            No quedan categorías disponibles.
          </Text>
        ) : (
          <FlatList
            data={available}
            keyExtractor={(category) => String(category.id)}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onSelect(item)}
                activeOpacity={0.72}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, minHeight: 54, gap: 12 }}
              >
                <Text style={{ fontSize: 20 }}>{item.emoji || "💸"}</Text>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: colors.text }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

// Selector de UNA sola cartera (p.ej. cuenta asociada a una deuda) — a
// diferencia de FormAccountPicker (multi-selección + "Todas"), aquí siempre
// hay exactamente una cartera elegida o ninguna.
export function FormWalletPicker({
  label = "Cuenta",
  wallets,
  selectedId,
  onChange,
  required = false,
}: {
  label?: string;
  wallets: { id: number; name: string; emoji?: string | null }[];
  selectedId: number | null;
  onChange: (id: number) => void;
  required?: boolean;
}) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const displayValue = wallets.find((w) => w.id === selectedId)?.name || "Selecciona una cuenta";

  return (
    <View>
      <FormSelect label={label} value={displayValue} required={required} onPress={() => setVisible(true)} />
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable onPress={() => setVisible(false)} style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.38)" }} />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "72%",
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: colors.text }}>Cuentas</Text>
            <TouchableOpacity onPress={() => setVisible(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {wallets.map((w) => {
              const active = w.id === selectedId;
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => {
                    onChange(w.id);
                    setVisible(false);
                  }}
                  activeOpacity={0.72}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, minHeight: 54, gap: 12 }}
                >
                  <WalletIcon emoji={w.emoji} size={18} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: colors.text }}>{w.name}</Text>
                  {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Selector de cuenta(s)/cartera(s): multi-selección + opción "Todas". Un array
// de seleccionados vacío significa "todas las carteras".
export function FormAccountPicker({
  label = "Cartera",
  wallets,
  selectedIds,
  onChange,
}: {
  label?: string;
  wallets: { id: number; name: string; emoji?: string | null }[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const displayValue =
    selectedIds.length === 0
      ? "Todas las carteras"
      : selectedIds.length === 1
      ? wallets.find((w) => w.id === selectedIds[0])?.name || "1 cartera"
      : `${selectedIds.length} carteras`;

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <View>
      <FormSelect label={label} value={displayValue} onPress={() => setVisible(true)} />
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable onPress={() => setVisible(false)} style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.38)" }} />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "72%",
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: colors.text }}>Carteras</Text>
            <TouchableOpacity onPress={() => setVisible(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => onChange([])}
              activeOpacity={0.72}
              style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, minHeight: 54, gap: 12 }}
            >
              <Ionicons name="apps-outline" size={18} color={colors.text} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: colors.text }}>Todas las carteras</Text>
              {selectedIds.length === 0 ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
            </TouchableOpacity>
            {wallets.map((w) => {
              const active = selectedIds.includes(w.id);
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => toggle(w.id)}
                  activeOpacity={0.72}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, minHeight: 54, gap: 12 }}
                >
                  <WalletIcon emoji={w.emoji} size={18} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: colors.text }}>{w.name}</Text>
                  {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
