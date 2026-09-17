import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

async function fetchProjects() {
  const res = await api.get("/projects");
  return res.data || [];
}

export function useProjectsQuery(options: { staleTime?: number; gcTime?: number } = {}) {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}
