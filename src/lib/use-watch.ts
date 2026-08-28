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
import { getMyAccount } from "@/lib/account.functions";
import { useHydrated } from "@/hooks/use-hydrated";

export function useAccount() {
  const hydrated = useHydrated();
  const fn = useServerFn(getMyAccount);
  return useQuery({
    queryKey: ["we", "account"],
    enabled: hydrated,
    staleTime: 30_000,
    queryFn: () => fn(),
  });
}

export function useFeed() {
  const hydrated = useHydrated();
  const fn = useServerFn(getFeed);
  return useQuery({
    queryKey: ["we", "feed"],
    enabled: hydrated,
    staleTime: 15_000,
    queryFn: () => fn(),
  });
}

export function useWalletOverview() {
  const hydrated = useHydrated();
  const fn = useServerFn(getWalletOverview);
  return useQuery({
    queryKey: ["we", "wallet"],
    enabled: hydrated,
    staleTime: 10_000,
    queryFn: () => fn(),
  });
}

export function useTaskDetail(taskId: string) {
  const hydrated = useHydrated();
  const fn = useServerFn(getTaskDetail);
  return useQuery({
    queryKey: ["we", "task", taskId],
    enabled: hydrated,
    queryFn: () => fn({ data: { taskId } }),
  });
}

export function useStartTask() {
  const fn = useServerFn(startTask);
  return useMutation({
    mutationFn: (taskId: string) => fn({ data: { taskId } }),
  });
}

export function useCompleteTask() {
  const fn = useServerFn(completeTask);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; sessionId: string }) => fn({ data: input }),
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
    queryFn: () => fn(),
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
    }) => fn({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["we"] });
    },
  });
}
