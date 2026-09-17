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
  FormMoneyField,
  FormNotesField,
  FormOptionCard,
  FormSection,
  FormSegmentedControl,
  FormTextField,
} from '../../../../components/creation';
import { ProjectManualEntry, ProjectMovementKind, ProjectPartner } from '../../../../types/project';

const KIND_OPTIONS: { value: ProjectMovementKind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'income', label: 'Ingreso', icon: 'add-outline' },
  { value: 'expense', label: 'Gasto', icon: 'remove-outline' },
  { value: 'contribution', label: 'Aportación', icon: 'arrow-down-circle-outline' },
  { value: 'withdrawal', label: 'Retirada', icon: 'arrow-up-circle-outline' },
];

const needsPartner = (kind: ProjectMovementKind) => kind === 'contribution' || kind === 'withdrawal';

export default function ProjectManualEntryFormScreen({ navigation, route }: any) {
  const projectId: number = route?.params?.projectId;
  const partners: ProjectPartner[] = route?.params?.partners || [];
  const editEntry: ProjectManualEntry | undefined = route?.params?.editEntry;
  const isEditing = !!editEntry;

  const [kind, setKind] = useState<ProjectMovementKind>(editEntry?.kind || 'expense');
  const [withdrawalType, setWithdrawalType] = useState<'profit' | 'capital'>(
    editEntry?.isCapitalReturn ? 'capital' : 'profit',
  );
  const [partnerId, setPartnerId] = useState<number | null>(editEntry?.partnerId ?? null);
  const [title, setTitle] = useState(editEntry?.title || '');
  const [amount, setAmount] = useState(editEntry ? String(editEntry.amount).replace('.', ',') : '');
  const [date, setDate] = useState<Date>(editEntry?.date ? new Date(editEntry.date) : new Date());
  const [category, setCategory] = useState(editEntry?.category || '');
  const [description, setDescription] = useState(editEntry?.description || '');
  const [notes, setNotes] = useState(editEntry?.notes || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const amountNumber = Number(String(amount).replace(',', '.'));
  const isValid =
    title.trim().length > 0 &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    (!needsPartner(kind) || partnerId != null);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitError(null);

    const payload = {
      kind,
      isCapitalReturn: kind === 'withdrawal' ? withdrawalType === 'capital' : false,
      title: title.trim(),
      description: description.trim() || null,
      amount: amountNumber,
      date: date.toISOString(),
      category: category.trim() || null,
      notes: notes.trim() || null,
      partnerId: needsPartner(kind) ? partnerId : null,
    };

    try {
      setSaving(true);
      if (isEditing && editEntry) {
        await api.patch(`/projects/${projectId}/manual-entries/${editEntry.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/manual-entries`, payload);
      }
      markTransactionsDirty();
      navigation.goBack();
    } catch (error) {
      console.error('Error guardando movimiento manual:', error);
      setSubmitError('No se pudo guardar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editEntry) return;

    appAlert('Eliminar movimiento', '¿Seguro que quieres eliminar este movimiento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await api.delete(`/projects/${projectId}/manual-entries/${editEntry.id}`);
            markTransactionsDirty();
            navigation.goBack();
          } catch (error) {
            console.error('Error eliminando movimiento manual:', error);
            appAlert('Error', 'No se pudo eliminar el movimiento.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const fields = (
    <>
      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 5 }}>Tipo</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -4 }}>
          {KIND_OPTIONS.map((option) => (
            <View key={option.value} style={{ width: '50%', padding: 4 }}>
              <FormOptionCard
                label={option.label}
                icon={option.icon}
                selected={kind === option.value}
                onPress={() => {
                  setKind(option.value);
                  if (!needsPartner(option.value)) setPartnerId(null);
                }}
              />
            </View>
          ))}
        </View>
      </View>

      {needsPartner(kind) &&
        (partners.length ? (
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 5 }}>
              Socio<Text style={{ color: colors.error }}> *</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -4 }}>
              {partners.map((partner) => (
                <View key={partner.id} style={{ width: '50%', padding: 4 }}>
                  <FormOptionCard
                    label={partner.name}
                    selected={partnerId === partner.id}
                    onPress={() => setPartnerId(partner.id)}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.error }}>
            Configura los socios del proyecto antes de registrar aportaciones o retiradas.
          </Text>
        ))}

      {kind === 'withdrawal' && (
        <FormSegmentedControl<'profit' | 'capital'>
          label="Tipo de retirada"
          value={withdrawalType}
          onChange={setWithdrawalType}
          options={[
            { value: 'profit', label: 'Retirada de beneficio' },
            { value: 'capital', label: 'Devolución de capital' },
          ]}
        />
      )}

      <FormTextField label="Título" value={title} onChangeText={setTitle} icon="text-outline" required />
      <FormMoneyField label="Importe" value={amount} onChangeText={setAmount} currency="€" required />
      <FormDateField label="Fecha" value={date} onChange={setDate} required />
      <FormTextField label="Categoría" value={category} onChangeText={setCategory} icon="pricetag-outline" />
      <FormTextField label="Descripción" value={description} onChangeText={setDescription} icon="document-text-outline" />
      <FormNotesField label="Notas" value={notes} onChangeText={setNotes} />
    </>
  );

  const steps: CreationStep[] = useMemo(
    () => [
      {
        id: 'basics',
        title: 'Nuevo movimiento',
        isValid,
        content: <View style={{ gap: 18 }}>{fields}</View>,
      },
    ],
    [kind, withdrawalType, partnerId, title, amount, date, category, description, notes, isValid, partners],
  );

  if (isEditing) {
    return (
      <EditingForm
        title="Editar movimiento"
        onClose={() => navigation.goBack()}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
        isSubmitting={saving}
        isValid={isValid}
        submitError={submitError}
      >
        <FormSection>{fields}</FormSection>
        <View style={{ height: 24 }} />
        <EditingActionRow label="Eliminar movimiento" onPress={handleDelete} disabled={saving || deleting} destructive />
      </EditingForm>
    );
  }

  return (
    <CreationFlow
      title="Nuevo movimiento"
      steps={steps}
      submitLabel="Crear movimiento"
      onSubmit={handleSubmit}
      onClose={() => navigation.goBack()}
      isSubmitting={saving}
      submitError={submitError}
    />
  );
}
