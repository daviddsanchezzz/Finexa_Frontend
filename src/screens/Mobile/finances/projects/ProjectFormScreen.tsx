import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../../api/api';
import CrossPlatformDateTimePicker from '../../../../components/CrossPlatformDateTimePicker';
import { colors } from '../../../../theme/theme';
import { appAlert } from '../../../../utils/appAlert';

type ProjectStatus = 'idea' | 'active' | 'paused' | 'completed' | 'cancelled';
type DateField = 'start' | 'end' | null;

type ProjectFromApi = {
  id: number;
  name: string;
  description?: string | null;
  type?: string | null;
  status: ProjectStatus;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'idea', label: 'Idea', icon: 'bulb-outline' },
  { value: 'active', label: 'Activo', icon: 'play-circle-outline' },
  { value: 'paused', label: 'Pausado', icon: 'pause-circle-outline' },
  { value: 'completed', label: 'Completado', icon: 'checkmark-circle-outline' },
  { value: 'cancelled', label: 'Cancelado', icon: 'close-circle-outline' },
];

function formatDate(date: Date) {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function InputBox({
  icon,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  minHeight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad';
  minHeight?: number;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: multiline ? 'flex-start' : 'center',
      }}
    >
      <Ionicons name={icon} size={16} color="#64748B" style={{ marginTop: multiline ? 3 : 0 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        keyboardType={keyboardType}
        style={{
          flex: 1,
          marginLeft: 8,
          color: '#0F172A',
          fontSize: 16,
          minHeight: minHeight || 0,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export default function ProjectFormScreen({ navigation, route }: any) {
  const editProject: ProjectFromApi | undefined = route?.params?.editProject;
  const isEditing = !!editProject;

  const [name, setName] = useState(editProject?.name || '');
  const [description, setDescription] = useState(editProject?.description || '');
  const [type, setType] = useState(editProject?.type || '');
  const [status, setStatus] = useState<ProjectStatus>(editProject?.status || 'idea');
  const [startDate, setStartDate] = useState<Date>(
    editProject?.startDate ? new Date(editProject.startDate) : new Date(),
  );
  const [endDate, setEndDate] = useState<Date | null>(
    editProject?.endDate ? new Date(editProject.endDate) : null,
  );
  const [notes, setNotes] = useState(editProject?.notes || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dateField, setDateField] = useState<DateField>(null);

  const datePickerDate = useMemo(() => {
    if (dateField === 'end') return endDate || startDate || new Date();
    return startDate || new Date();
  }, [dateField, endDate, startDate]);

  const openDatePicker = (field: DateField) => {
    setDateField(field);
    setDatePickerVisible(true);
  };

  const closeDatePicker = () => {
    setDateField(null);
    setDatePickerVisible(false);
  };

  const handleDateConfirm = (date: Date) => {
    if (dateField === 'start') {
      setStartDate(date);
      if (endDate && endDate < date) setEndDate(date);
    }

    if (dateField === 'end') {
      setEndDate(date);
    }

    closeDatePicker();
  };

  const validate = () => {
    if (!name.trim()) {
      appAlert('Validación', 'El nombre del proyecto es obligatorio.');
      return false;
    }

    if (!status) {
      appAlert('Validación', 'El estado del proyecto es obligatorio.');
      return false;
    }

    if (!startDate || Number.isNaN(startDate.getTime())) {
      appAlert('Validación', 'La fecha de inicio es obligatoria.');
      return false;
    }

    if (endDate && endDate < startDate) {
      appAlert('Validación', 'La fecha de fin no puede ser anterior al inicio.');
      return false;
    }

    return true;
  };

  const payload = {
    name: name.trim(),
    description: description.trim() || null,
    type: type.trim() || null,
    status,
    startDate: startDate.toISOString(),
    endDate: endDate ? endDate.toISOString() : null,
    notes: notes.trim() || null,
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      if (isEditing && editProject) {
        await api.patch(`/projects/${editProject.id}`, payload);
      } else {
        await api.post('/projects', payload);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error guardando proyecto:', error);
      appAlert('Error', 'No se pudo guardar el proyecto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editProject) return;

    appAlert('Eliminar proyecto', '¿Seguro que quieres eliminar este proyecto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await api.delete(`/projects/${editProject.id}`);
            navigation.goBack();
          } catch (error) {
            console.error('Error eliminando proyecto:', error);
            appAlert('Error', 'No se pudo eliminar el proyecto.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View>
            <Text className="text-[16px] font-semibold text-slate-900">
              {isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}
            </Text>
            <Text className="text-[11px] text-slate-500 mt-0.5">Configuración general y fechas</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || deleting}
          className="px-3 py-2 rounded-xl"
          style={{ backgroundColor: '#0F172A', opacity: saving || deleting ? 0.75 : 1 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-[12px] font-semibold">Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 6 }}
      >
        <View
          className="rounded-3xl p-4 mb-3"
          style={{
            borderWidth: 1,
            borderColor: '#E2E8F0',
            backgroundColor: 'white',
            shadowColor: '#0F172A',
            shadowOpacity: 0.04,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Text className="text-[11px] text-slate-500 mb-2">INFORMACIÓN BÁSICA</Text>

          <InputBox
            icon="briefcase-outline"
            value={name}
            onChangeText={setName}
            placeholder="Ej. SaaS para restaurantes"
          />

          <View style={{ marginTop: 10 }}>
            <InputBox
              icon="bookmark-outline"
              value={type}
              onChangeText={setType}
              placeholder="Tipo (SaaS, evento, reforma...)"
            />
          </View>

          <View style={{ marginTop: 10 }}>
            <InputBox
              icon="document-text-outline"
              value={description}
              onChangeText={setDescription}
              placeholder="Descripción breve"
              multiline
              minHeight={78}
            />
          </View>
        </View>

        <View
          className="rounded-3xl p-4 mb-3"
          style={{ borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: 'white' }}
        >
          <Text className="text-[11px] text-slate-500 mb-2">ESTADO</Text>
          <View className="flex-row flex-wrap">
            {STATUS_OPTIONS.map((option) => {
              const active = status === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setStatus(option.value)}
                  className="flex-row items-center px-3 py-2 rounded-full mr-2 mb-2"
                  style={{
                    borderWidth: 1,
                    borderColor: active ? '#0F172A' : '#CBD5E1',
                    backgroundColor: active ? '#0F172A' : '#fff',
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={14}
                    color={active ? 'white' : '#64748B'}
                  />
                  <Text
                    className="text-[12px] font-semibold ml-1.5"
                    style={{ color: active ? 'white' : '#475569' }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View
          className="rounded-3xl p-4 mb-3"
          style={{ borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: 'white' }}
        >
          <Text className="text-[11px] text-slate-500 mb-2">FECHAS</Text>

          <View className="flex-row">
            <TouchableOpacity
              onPress={() => openDatePicker('start')}
              className="flex-1 p-3 rounded-2xl mr-2"
              style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}
            >
              <Text className="text-[10px] text-slate-500">Inicio *</Text>
              <Text className="text-[13px] font-semibold text-slate-900 mt-1">{formatDate(startDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openDatePicker('end')}
              className="flex-1 p-3 rounded-2xl ml-2"
              style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}
            >
              <Text className="text-[10px] text-slate-500">Fin</Text>
              <Text className="text-[13px] font-semibold text-slate-900 mt-1">
                {endDate ? formatDate(endDate) : 'Sin fecha'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setEndDate(null)}
            className="self-start mt-2 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: '#F1F5F9' }}
          >
            <Text className="text-[11px] text-slate-600">Quitar fecha fin</Text>
          </TouchableOpacity>
        </View>

        <View
          className="rounded-3xl p-4 mb-4"
          style={{ borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: 'white' }}
        >
          <Text className="text-[11px] text-slate-500 mb-2">NOTAS</Text>
          <InputBox
            icon="chatbox-ellipses-outline"
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones internas"
            multiline
            minHeight={92}
            keyboardType={Platform.OS === 'ios' ? 'default' : 'default'}
          />
        </View>

        {isEditing && (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting || saving}
            className="items-center justify-center py-3 rounded-2xl"
            style={{
              borderWidth: 1,
              borderColor: '#FECACA',
              backgroundColor: '#FEF2F2',
              opacity: deleting || saving ? 0.7 : 1,
            }}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text className="text-sm font-semibold text-red-600">Eliminar proyecto</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <CrossPlatformDateTimePicker
        isVisible={datePickerVisible}
        mode="date"
        date={datePickerDate}
        onConfirm={handleDateConfirm}
        onCancel={closeDatePicker}
      />
    </SafeAreaView>
  );
}
