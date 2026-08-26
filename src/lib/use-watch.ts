import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  completeTask,
  getFeed,
  getTaskDetail,
  getWalletOverview,
  getWithdrawals,
  requestWithdrawal,
  startTask,
} from "@/lib/watch.functions";
import { readWalletToken, writeWalletToken } from "@/lib/wallet-client";
import { useHydrated } from "@/hooks/use-hydrated";

export function useFeed() {
  const hydrated = useHydrated();
  const fn = useServerFn(getFeed);
  return useQuery({
    queryKey: ["we", "feed"],
    enabled: hydrated,
    staleTime: 15_000,
    queryFn: async () => {
      const res = await fn({ data: { token: readWalletToken() } });
      writeWalletToken(res.token);
      return res;
    },
  });
}

export function useWalletOverview() {
  const hydrated = useHydrated();
  const fn = useServerFn(getWalletOverview);
  return useQuery({
    queryKey: ["we", "wallet"],
    enabled: hydrated,
    staleTime: 10_000,
    queryFn: async () => {
      const res = await fn({ data: { token: readWalletToken() } });
      writeWalletToken(res.token);
      return res;
    },
  });
}

export function useTaskDetail(taskId: string) {
  const hydrated = useHydrated();
  const fn = useServerFn(getTaskDetail);
  return useQuery({
    queryKey: ["we", "task", taskId],
    enabled: hydrated,
    queryFn: () => fn({ data: { token: readWalletToken(), taskId } }),
  });
}

export function useStartTask() {
  const fn = useServerFn(startTask);
  return useMutation({
    mutationFn: (taskId: string) => fn({ data: { token: readWalletToken(), taskId } }),
  });
}

export function useCompleteTask() {
  const fn = useServerFn(completeTask);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; sessionId: string }) =>
      fn({ data: { token: readWalletToken(), ...input } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["we"] });
    },
  });
}

export function useWithdrawals() {
  const hydrated = useHydrated();
  const fn = useServerFn(getWithdrawals);
  return useQuery({
    queryKey: ["we", "withdrawals"],
    enabled: hydrated,
    staleTime: 10_000,
    queryFn: async () => {
      const res = await fn({ data: { token: readWalletToken() } });
      writeWalletToken(res.token);
      return res;
    },
  });
}

export function useRequestWithdrawal() {
  const fn = useServerFn(requestWithdrawal);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      coins: number;
      accountNumber: string;
      ifscCode: string;
      holderName: string;
    }) => fn({ data: { token: readWalletToken(), ...input } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["we"] });
    },
  });
}
