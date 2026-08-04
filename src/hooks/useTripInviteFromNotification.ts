import { useState } from "react";
import { useTripInviteActions } from "./useTripInvites";
import { FeedNotification } from "./useNotificationsFeed";

export function useTripInviteFromNotification(markRead: (id: number) => Promise<any>) {
  const { accept, reject, isLoading } = useTripInviteActions();
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const handlePress = (n: FeedNotification) => {
    if (!n.read) markRead(n.id);
    if (n.type === "trip_invite") {
      const memberId = n.data?.tripMemberId as number | undefined;
      if (memberId != null) setSelectedMemberId(memberId);
    }
  };

  const closeDetail = () => setSelectedMemberId(null);

  const handleAccept = async () => {
    if (selectedMemberId == null) return;
    await accept(selectedMemberId);
    closeDetail();
  };

  const handleReject = async () => {
    if (selectedMemberId == null) return;
    await reject(selectedMemberId);
    closeDetail();
  };

  return { selectedMemberId, actionLoading: isLoading, handlePress, closeDetail, handleAccept, handleReject };
}
