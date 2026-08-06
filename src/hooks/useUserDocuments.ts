// src/hooks/useUserDocuments.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export type UserDocumentType =
  | "passport"
  | "dni"
  | "visa"
  | "vaccine"
  | "ehic"
  | "private_health_insurance"
  | "driving_license"
  | "driving_license_international";

export interface UserDocument {
  id: number;
  userId: number;
  type: UserDocumentType;
  provider: string | null;
  country: string | null;
  documentNumber: string | null;
  expiryDate: string | null;
  metadata: Record<string, any> | null;
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDocumentInput {
  type: UserDocumentType;
  provider?: string | null;
  country?: string | null;
  documentNumber?: string | null;
  expiryDate?: string | null;
  metadata?: Record<string, any> | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
}

export type UpdateUserDocumentInput = Omit<CreateUserDocumentInput, "type">;

const QUERY_KEY = ["userDocuments"];

export function useUserDocuments() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get("/users/me/documents")).data as UserDocument[],
    staleTime: 1000 * 60 * 5,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateUserDocumentInput) =>
      (await api.post("/users/me/documents", input)).data as UserDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateUserDocumentInput }) =>
      (await api.patch(`/users/me/documents/${id}`, input)).data as UserDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/me/documents/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const documentsByType = useMemo(() => {
    const map = new Map<UserDocumentType, UserDocument[]>();
    for (const doc of query.data ?? []) {
      const arr = map.get(doc.type);
      if (arr) arr.push(doc);
      else map.set(doc.type, [doc]);
    }
    return map;
  }, [query.data]);

  return {
    documents: query.data ?? [],
    documentsByType,
    isLoading: query.isLoading,
    createDocument: (input: CreateUserDocumentInput) => createMutation.mutateAsync(input),
    updateDocument: (id: number, input: UpdateUserDocumentInput) => updateMutation.mutateAsync({ id, input }),
    deleteDocument: (id: number) => deleteMutation.mutateAsync(id),
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/** Estado derivado de la caducidad, usado por el pill de "Mis documentos" y Logística. */
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
