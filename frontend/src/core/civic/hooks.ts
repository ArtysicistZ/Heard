"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchInstitutions, fetchAllStats, fetchDistricts, createResolution, createContact } from "./api";

export function useInstitutions(category?: string) {
  return useQuery({
    queryKey: ["civic", "institutions", category],
    queryFn: () => fetchInstitutions(category),
  });
}

export function useAllStats() {
  return useQuery({
    queryKey: ["civic", "stats"],
    queryFn: fetchAllStats,
    staleTime: 30_000,
  });
}

export function useDistricts() {
  return useQuery({
    queryKey: ["civic", "districts"],
    queryFn: fetchDistricts,
    staleTime: Infinity,
  });
}

export function useCreateResolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createResolution,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["civic", "stats"] });
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["civic", "contacts"] });
    },
  });
}
