// src/hooks/useUserDocuments.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export type UserDocumentType = "passport" | "dni";

export interface UserDocument {
  id: number;
  userId: number;
  type: UserDocumentType;
  country: string;
  documentNumber: string | null;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertUserDocumentInput {
  country: string;
  documentNumber?: string | null;
  expiryDate?: string | null;
}

const QUERY_KEY = ["userDocuments"];

export function useUserDocuments() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get("/users/me/documents")).data as UserDocument[],
    staleTime: 1000 * 60 * 5,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ type, input }: { type: UserDocumentType; input: UpsertUserDocumentInput }) =>
      (await api.put(`/users/me/documents/${type}`, input)).data as UserDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (type: UserDocumentType) => {
      await api.delete(`/users/me/documents/${type}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const documentsByType = useMemo(
    () => new Map(query.data?.map((d) => [d.type, d] as const)),
    [query.data]
  );

  return {
    documents: query.data ?? [],
    documentsByType,
    isLoading: query.isLoading,
    upsertDocument: (type: UserDocumentType, input: UpsertUserDocumentInput) =>
      upsertMutation.mutateAsync({ type, input }),
    deleteDocument: (type: UserDocumentType) => deleteMutation.mutateAsync(type),
    isSaving: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/** Estado derivado de la caducidad, usado por el pill de "Mis documentos" y (más adelante) por Logística. */
export type DocumentStatus = "no-expiry" | "valid" | "expiring-soon" | "expired";

export function getDocumentStatus(expiryDate: string | null): DocumentStatus {
  if (!expiryDate) return "no-expiry";
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  if (expiry < now) return "expired";
  const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;
  if (expiry - now < sixMonthsMs) return "expiring-soon";
  return "valid";
}
