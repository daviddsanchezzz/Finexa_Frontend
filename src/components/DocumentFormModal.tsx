import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Modal, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";
import CrossPlatformDateTimePicker from "./CrossPlatformDateTimePicker";
import { CountrySelect } from "./CountrySelect";
import { type DocFieldConfig, type DocTypeConfig, type DocLike } from "../utils/documentTypeConfig";
import { pickAndUploadSingleTripAttachment } from "../utils/uploadTripAttachments";
import { appAlert } from "../utils/appAlert";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function readField(doc: DocLike | null, key: string): string {
  if (!doc) return "";
  if (key.startsWith("metadata.")) {
    const v = doc.metadata?.[key.slice("metadata.".length)];
    return v == null ? "" : String(v);
  }
  const v = doc[key];
  return v == null ? "" : String(v);
}

interface Props {
  config: DocTypeConfig;
  doc: DocLike | null;
  /** Si se indica, el país queda fijado desde fuera (ej. "por país del viaje") y no se pide en el formulario. */
  presetCountry?: string | null;
  presetCountryLabel?: string | null;
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSave: (input: Record<string, any>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function DocumentFormModal({ config, doc, presetCountry, presetCountryLabel, saving, deleting, onClose, onSave, onDelete }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of config.fields) init[f.key] = readField(doc, f.key);
    return init;
  });
  const [countryNames, setCountryNames] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of config.fields) if (f.type === "country") init[f.key] = readField(doc, f.key);
    return init;
  });
  const [datePickerKey, setDatePickerKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(doc?.fileUrl ?? null);
  const [fileName, setFileName] = useState(doc?.fileName ?? null);
  const [fileMimeType, setFileMimeType] = useState(doc?.fileMimeType ?? null);

  const visibleFields = useMemo(
    () => config.fields.filter((f) => !(f.type === "country" && presetCountry != null)),
    [config.fields, presetCountry]
  );

  const requiredMissing = useMemo(
    () => visibleFields.some((f) => !f.optional && !values[f.key]?.trim()),
    [visibleFields, values]
  );

  const setValue = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const handleAttach = async () => {
    setUploading(true);
    try {
      const uploaded = await pickAndUploadSingleTripAttachment();
      if (uploaded) {
        setFileUrl(uploaded.url);
        setFileName(uploaded.filename);
        setFileMimeType(uploaded.mimeType);
      }
    } catch {
      appAlert("No se pudo subir el archivo", "Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const input: Record<string, any> = {};
    const metadata: Record<string, any> = doc?.metadata ? { ...doc.metadata } : {};

    for (const f of config.fields) {
      if (f.type === "country") continue; // se resuelve aparte más abajo
      const raw = values[f.key]?.trim() ?? "";
      if (f.key.startsWith("metadata.")) {
        const metaKey = f.key.slice("metadata.".length);
        if (f.type === "boolean") {
          metadata[metaKey] = raw === "true" ? true : raw === "false" ? false : null;
        } else if (raw) {
          metadata[metaKey] = f.type === "date" ? new Date(raw).toISOString() : raw;
        } else {
          delete metadata[metaKey];
        }
      } else if (f.type === "date") {
        input[f.key] = raw ? new Date(raw).toISOString() : null;
      } else {
        input[f.key] = raw || null;
      }
    }

    const countryField = config.fields.find((f) => f.type === "country");
    if (countryField) {
      input.country = presetCountry ?? (values[countryField.key]?.trim() || null);
    }

    input.metadata = Object.keys(metadata).length ? metadata : null;
    input.fileUrl = fileUrl;
    input.fileName = fileName;
    input.fileMimeType = fileMimeType;

    onSave(input);
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, maxHeight: "88%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>{config.title}</Text>
              {!!presetCountryLabel && (
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#94A3B8", marginTop: 2 }}>{presetCountryLabel}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleAttach}
            disabled={uploading}
            style={{
              borderWidth: 1.5, borderColor: fileUrl ? "#BBF7D0" : "#DBEAFE", borderStyle: fileUrl ? "solid" : "dashed",
              borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 18,
              flexDirection: "row", alignItems: "center", gap: 10,
              backgroundColor: fileUrl ? "#F0FDF4" : "#F8FAFC",
            }}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name={fileUrl ? "checkmark-circle" : "cloud-upload-outline"} size={20} color={fileUrl ? "#16A34A" : colors.primary} />
            )}
            <View style={{ flex: 1 }}>
              {fileUrl ? (
                <>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#16A34A" }} numberOfLines={1}>
                    {fileName || "Archivo adjuntado"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#16A34A" }}>Toca para reemplazar</Text>
                </>
              ) : (
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>{config.attachLabel}</Text>
              )}
            </View>
            {!!fileUrl && (
              <TouchableOpacity onPress={() => Linking.openURL(fileUrl)} style={{ padding: 4 }}>
                <Ionicons name="eye-outline" size={18} color="#16A34A" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {visibleFields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={values[f.key] ?? ""}
              countryName={countryNames[f.key] ?? ""}
              onChange={(v) => setValue(f.key, v)}
              onChangeCountry={(name, code) => {
                setCountryNames((prev) => ({ ...prev, [f.key]: name }));
                setValue(f.key, code);
              }}
              onOpenDatePicker={() => setDatePickerKey(f.key)}
            />
          ))}

          <CrossPlatformDateTimePicker
            isVisible={datePickerKey != null}
            date={(datePickerKey && values[datePickerKey] ? new Date(values[datePickerKey]) : new Date())}
            mode="date"
            onConfirm={(d) => {
              if (datePickerKey) setValue(datePickerKey, d.toISOString());
              setDatePickerKey(null);
            }}
            onCancel={() => setDatePickerKey(null)}
          />

          <TouchableOpacity
            disabled={requiredMissing || saving}
            onPress={handleSave}
            style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: requiredMissing || saving ? 0.5 : 1, marginTop: 4, marginBottom: doc && onDelete ? 10 : 0 }}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>{config.saveLabel}</Text>}
          </TouchableOpacity>

          {doc && onDelete && (
            <TouchableOpacity disabled={deleting} onPress={onDelete} style={{ alignItems: "center", paddingVertical: 10, opacity: deleting ? 0.5 : 1 }}>
              {deleting ? <ActivityIndicator color="#DC2626" /> : <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 13 }}>Eliminar</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function FieldInput({
  field,
  value,
  countryName,
  onChange,
  onChangeCountry,
  onOpenDatePicker,
}: {
  field: DocFieldConfig;
  value: string;
  countryName: string;
  onChange: (v: string) => void;
  onChangeCountry: (name: string, code: string) => void;
  onOpenDatePicker: () => void;
}) {
  const label = field.label.toUpperCase() + (field.optional ? " (OPCIONAL)" : "");

  if (field.type === "country") {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>{label}</Text>
        <CountrySelect
          valueName={countryName}
          valueCode={value}
          onChange={(x) => onChangeCountry(x.name, x.code)}
          placeholder="Selecciona un país"
        />
      </View>
    );
  }

  if (field.type === "date") {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>{label}</Text>
        <TouchableOpacity
          onPress={onOpenDatePicker}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 14, color: value ? "#0F172A" : "#9CA3AF" }}>
            {value ? fmtDate(value) : "Selecciona una fecha"}
          </Text>
          <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    );
  }

  if (field.type === "boolean") {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>{label}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["true", "false"] as const).map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center",
                borderWidth: 1, borderColor: value === opt ? colors.primary : "#E5E7EB",
                backgroundColor: value === opt ? colors.primary : "white",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: value === opt ? "white" : "#6B7280" }}>
                {opt === "true" ? "Sí" : "No"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={field.placeholder}
        autoCapitalize={field.autoCapitalize}
        style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A" }}
      />
    </View>
  );
}
