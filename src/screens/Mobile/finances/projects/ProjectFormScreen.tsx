import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../../api/api';
import { appAlert } from '../../../../utils/appAlert';
import { colors } from '../../../../theme/theme';
import { markTransactionsDirty } from '../../../../utils/transactionsInvalidation';
import {
  CreationFlow,
  CreationStep,
  EditingActionRow,
  EditingForm,
  FormDateField,
  FormNotesField,
  FormOptionCard,
  FormSection,
  FormTextField,
} from '../../../../components/creation';

type ProjectStatus = 'idea' | 'active' | 'paused' | 'completed' | 'cancelled';

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

const normalizeStartOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function ProjectFormScreen({ navigation, route }: any) {
  const editProject: ProjectFromApi | undefined = route?.params?.editProject;
  const isEditing = !!editProject;

  const [name, setName] = useState(editProject?.name || '');
  const [description, setDescription] = useState(editProject?.description || '');
  const [type, setType] = useState(editProject?.type || '');
  const [status, setStatus] = useState<ProjectStatus>(editProject?.status || 'idea');
  const [startDate, setStartDate] = useState<Date>(
    editProject?.startDate ? normalizeStartOfDay(new Date(editProject.startDate)) : normalizeStartOfDay(new Date()),
  );
  const [endDate, setEndDate] = useState<Date | null>(
    editProject?.endDate ? normalizeStartOfDay(new Date(editProject.endDate)) : null,
  );
  const [notes, setNotes] = useState(editProject?.notes || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const endDateInvalid = !!(endDate && endDate < startDate);
  const isValid = name.trim().length > 0 && !endDateInvalid;

  const payload = {
    name: name.trim(),
    description: description.trim() || null,
    type: type.trim() || null,
    status,
    startDate: startDate.toISOString(),
    endDate: endDate ? endDate.toISOString() : null,
    notes: notes.trim() || null,
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitError(null);
    try {
      setSaving(true);
      if (isEditing && editProject) {
        await api.patch(`/projects/${editProject.id}`, payload);
      } else {
        await api.post('/projects', payload);
      }
      markTransactionsDirty();
      navigation.goBack();
    } catch (error) {
      console.error('Error guardando proyecto:', error);
      setSubmitError('No se pudo guardar el proyecto.');
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
            markTransactionsDirty();
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

  const fields = (
    <>
      <FormTextField
        label="Nombre del proyecto"
        value={name}
        onChangeText={setName}
        icon="briefcase-outline"
        required
        autoCapitalize="sentences"
      />
      <FormTextField
        label="Tipo"
        value={type}
        onChangeText={setType}
        icon="bookmark-outline"
      />

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 5 }}>Estado</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -4 }}>
          {STATUS_OPTIONS.map((option) => (
            <View key={option.value} style={{ width: '33.333%', padding: 4 }}>
              <FormOptionCard
                label={option.label}
                icon={option.icon}
                selected={status === option.value}
                onPress={() => setStatus(option.value)}
              />
            </View>
          ))}
        </View>
      </View>

      <FormDateField label="Fecha de inicio" value={startDate} onChange={setStartDate} required />

      {endDate ? (
        <View>
          <FormDateField label="Fecha de fin" value={endDate} onChange={setEndDate} />
          {endDateInvalid ? (
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.error, marginTop: 6 }}>
              No puede ser anterior a la fecha de inicio.
            </Text>
          ) : null}
          <Text
            onPress={() => setEndDate(null)}
            style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8', marginTop: 8 }}
          >
            Quitar fecha de fin
          </Text>
        </View>
      ) : (
        <Text
          onPress={() => setEndDate(normalizeStartOfDay(new Date()))}
          style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}
        >
          + Añadir fecha de fin
        </Text>
      )}

      <FormTextField label="Descripción" value={description} onChangeText={setDescription} icon="document-text-outline" />
      <FormNotesField label="Notas" value={notes} onChangeText={setNotes} />
    </>
  );

  const steps: CreationStep[] = useMemo(
    () => [
      {
        id: 'basics',
        title: 'Nuevo proyecto',
        isValid,
        content: <View style={{ gap: 18 }}>{fields}</View>,
      },
    ],
    [name, type, status, startDate, endDate, description, notes, isValid],
  );

  if (isEditing) {
    return (
      <EditingForm
        title="Editar proyecto"
        onClose={() => navigation.goBack()}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
        isSubmitting={saving}
        isValid={isValid}
        submitError={submitError}
      >
        <FormSection>{fields}</FormSection>
        <View style={{ height: 24 }} />
        <EditingActionRow label="Eliminar proyecto" onPress={handleDelete} disabled={saving || deleting} destructive />
      </EditingForm>
    );
  }

  return (
    <CreationFlow
      title="Nuevo proyecto"
      steps={steps}
      submitLabel="Crear proyecto"
      onSubmit={handleSubmit}
      onClose={() => navigation.goBack()}
      isSubmitting={saving}
      submitError={submitError}
    />
  );
}
