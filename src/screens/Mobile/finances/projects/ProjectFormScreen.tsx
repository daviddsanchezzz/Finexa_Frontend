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

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

function formatDate(date: Date) {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
      <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 50 }}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text className="text-[17px] font-medium text-[#111]">
            {isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}
          </Text>
        </View>

        <View style={{ minWidth: 60, alignItems: 'flex-end' }}>
          <TouchableOpacity onPress={handleSave} disabled={saving || deleting}>
            {saving ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="text-[15px] text-primary font-medium">Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        <View className="mt-6">
          <Text className="text-[12px] text-gray-500 mb-1">Nombre *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. SaaS para restaurantes"
            className="border-b border-gray-200 pb-2 text-[16px] text-black"
          />
        </View>

        <View className="mt-5">
          <Text className="text-[12px] text-gray-500 mb-1">Descripción</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe brevemente el proyecto"
            multiline
            className="border border-gray-200 rounded-xl px-3 py-2 text-[14px] text-black"
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />
        </View>

        <View className="mt-5">
          <Text className="text-[12px] text-gray-500 mb-1">Tipo</Text>
          <TextInput
            value={type}
            onChangeText={setType}
            placeholder="Ej. SaaS, evento, reforma"
            className="border-b border-gray-200 pb-2 text-[14px] text-black"
          />
        </View>

        <View className="mt-5">
          <Text className="text-[12px] text-gray-500 mb-2">Estado *</Text>
          <View className="flex-row flex-wrap">
            {STATUS_OPTIONS.map((option) => {
              const active = status === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setStatus(option.value)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : '#D1D5DB',
                    backgroundColor: active ? '#EEF2FF' : 'white',
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: active ? colors.primary : '#6B7280',
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="mt-5">
          <Text className="text-[12px] text-gray-500 mb-2">Fechas</Text>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => openDatePicker('start')}
              className="flex-1 mr-2 p-3 rounded-xl"
              style={{ borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' }}
            >
              <Text className="text-[10px] text-gray-500">Inicio *</Text>
              <Text className="text-[13px] font-semibold text-black mt-1">
                {formatDate(startDate)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openDatePicker('end')}
              className="flex-1 ml-2 p-3 rounded-xl"
              style={{ borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' }}
            >
              <Text className="text-[10px] text-gray-500">Fin</Text>
              <Text className="text-[13px] font-semibold text-black mt-1">
                {endDate ? formatDate(endDate) : 'Sin fecha'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setEndDate(null)}
            className="mt-2 self-start px-3 py-1.5 rounded-full"
            style={{ backgroundColor: '#F3F4F6' }}
          >
            <Text className="text-[11px] text-gray-600">Quitar fecha fin</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5 mb-6">
          <Text className="text-[12px] text-gray-500 mb-1">Notas</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones internas del proyecto"
            multiline
            className="border border-gray-200 rounded-xl px-3 py-2 text-[14px] text-black"
            style={{ minHeight: 92, textAlignVertical: 'top' }}
          />
        </View>

        {isEditing && (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting || saving}
            className="items-center justify-center py-3 rounded-xl"
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
