import React, { ReactNode, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../../theme/theme";
import { COMMON_CURRENCIES } from "../../utils/exchangeRate";

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
  return (
    <View style={{ gap: 12 }}>
      {title ? (
        <View style={{ marginBottom: -4 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.45, color: "#64748B" }}>{title}</Text>
          {description ? (
            <Text style={{ fontSize: 12, lineHeight: 17, color: "#94A3B8", marginTop: 3 }}>{description}</Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function FormError({ message }: { message?: string | null }) {
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
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const visibleError = error && (touched || showError) ? error : null;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>
          {label}{required ? <Text style={{ color: colors.error }}> *</Text> : null}
        </Text>
      </View>
      <View
        style={{
          minHeight: multiline ? 88 : 44,
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          borderWidth: 1,
          borderColor: visibleError ? "#FCA5A5" : focused ? colors.primary : "#E2E8F0",
          borderRadius: radii.input,
          backgroundColor: "white",
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
        }}
      >
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.primary : "#94A3B8"} style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }} /> : null}
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
          placeholderTextColor="#A3ADBC"
          style={{
            flex: 1,
            minHeight: multiline ? 66 : 42,
            paddingVertical: 0,
            textAlignVertical: multiline ? "top" : "center",
            fontSize: 15,
            fontWeight: "600",
            color: colors.ink,
          }}
        />
        {suffix ? <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "700", color: "#64748B" }}>{suffix}</Text> : null}
      </View>
      {hint && !visibleError ? <Text style={{ fontSize: 11.5, lineHeight: 16, color: "#94A3B8", marginTop: 6 }}>{hint}</Text> : null}
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

export function FormSelect({
  label,
  value,
  onPress,
  required = false,
  error,
}: {
  label: string;
  value: string;
  onPress: () => void;
  required?: boolean;
  error?: string | null;
}) {
  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 5 }}>
        {label}{required ? <Text style={{ color: colors.error }}> *</Text> : null}
      </Text>
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
          borderColor: error ? "#FCA5A5" : "#E2E8F0",
          backgroundColor: "white",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink }}>{value}</Text>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable
          onPress={() => setVisible(false)}
          style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.38)" }}
        />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "72%",
            backgroundColor: "white",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: "#EEF1F5" }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: colors.ink }}>Seleccionar divisa</Text>
            <TouchableOpacity onPress={() => setVisible(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={COMMON_CURRENCIES}
            keyExtractor={(currency) => currency.code}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = item.code === value;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onChange(item.code);
                    setVisible(false);
                  }}
                  activeOpacity={0.72}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, minHeight: 54 }}
                >
                  <Text style={{ width: 48, fontSize: 14, fontWeight: "800", color: colors.ink }}>{item.code}</Text>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#64748B" }}>{item.label}</Text>
                  {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
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
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>
          {label}{required ? <Text style={{ color: colors.error }}> *</Text> : null}
        </Text>
        {value && onClear ? (
          <TouchableOpacity onPress={onClear} hitSlop={8}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>Quitar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", padding: 3, borderRadius: radii.input, backgroundColor: "#E9EDF3" }}>
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
                backgroundColor: selected ? "white" : "transparent",
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: selected ? "800" : "600", color: selected ? colors.ink : "#64748B" }}>
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
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        minHeight: 44,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? colors.primary : "#E2E8F0",
        backgroundColor: selected ? "#EEF3FF" : "white",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? colors.primary : "#64748B"} /> : null}
      <Text style={{ marginLeft: icon ? 6 : 0, fontSize: 12.5, fontWeight: "700", color: selected ? colors.primary : "#475569" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
