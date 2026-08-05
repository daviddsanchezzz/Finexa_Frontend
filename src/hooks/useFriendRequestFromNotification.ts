import { useState } from "react";
import { useFriends, FriendRequest } from "./useFriends";
import { FeedNotification } from "./useNotificationsFeed";

export function useFriendRequestFromNotification() {
  const { incomingRequests, acceptRequest, rejectRequest } = useFriends();
  const [selectedRequest, setSelectedRequest] = useState<FriendRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handlePress = (n: FeedNotification) => {
    if (n.type === "friend_request") {
      const friendshipId = n.data?.friendshipId as number | undefined;
      const match = incomingRequests.find((r) => r.id === friendshipId);
      if (match) setSelectedRequest(match);
    }
  };

  const closeDetail = () => setSelectedRequest(null);

  const handleAccept = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await acceptRequest(selectedRequest.id);
      closeDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await rejectRequest(selectedRequest.id);
      closeDetail();
    } finally {
      setActionLoading(false);
    }
  };

  return { selectedRequest, actionLoading, handlePress, closeDetail, handleAccept, handleReject };
}
