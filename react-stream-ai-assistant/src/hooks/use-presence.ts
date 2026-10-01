import { useEffect, useState } from "react";
import { useChatContext } from "stream-chat-react";

interface UserPresence {
  userId: string;
  isTyping: boolean;
  lastSeen?: Date;
  online: boolean;
}

/**
 * Hook to track typing indicators in a channel
 */
export const useTypingIndicators = (channelId?: string) => {
  const { client } = useChatContext();
  const [typingUsers, setTypingUsers] = useState<Map<string, UserPresence>>(new Map());

  useEffect(() => {
    if (!client || !channelId) return;

    const channel = client.channel("messaging", channelId);

    const handleTypingStart = (event: any) => {
      if (!event.user) return;
      
      setTypingUsers((prev) => {
        const updated = new Map(prev);
        updated.set(event.user.id, {
          userId: event.user.id,
          isTyping: true,
          online: event.user.online ?? true,
        });
        return updated;
      });
    };

    const handleTypingStop = (event: any) => {
      if (!event.user) return;
      
      setTypingUsers((prev) => {
        const updated = new Map(prev);
        if (updated.has(event.user.id)) {
          updated.delete(event.user.id);
        }
        return updated;
      });
    };

    const handlePresenceChange = (event: any) => {
      if (!event.user) return;
      
      setTypingUsers((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(event.user.id);
        if (existing) {
          updated.set(event.user.id, {
            ...existing,
            online: event.user.online ?? true,
            lastSeen: new Date(),
          });
        }
        return updated;
      });
    };

    channel.on("typing.start", handleTypingStart);
    channel.on("typing.stop", handleTypingStop);
    channel.on("user.presence.changed", handlePresenceChange);

    return () => {
      channel.off("typing.start", handleTypingStart);
      channel.off("typing.stop", handleTypingStop);
      channel.off("user.presence.changed", handlePresenceChange);
    };
  }, [client, channelId]);

  return Array.from(typingUsers.values());
};

/**
 * Hook to track user presence/online status
 */
export const useUserPresence = (channelId?: string) => {
  const { client } = useChatContext();
  const [members, setMembers] = useState<
    Array<{
      id: string;
      name: string;
      image?: string;
      online: boolean;
      lastSeen?: Date;
    }>
  >([]);

  useEffect(() => {
    if (!client || !channelId) return;

    const loadPresence = async () => {
      try {
        const channel = client.channel("messaging", channelId);
        await channel.watch();

        const channelMembers = Object.values(channel.state.members).map((member) => ({
          id: member.user_id,
          name: member.user?.name || "Unknown User",
          image: member.user?.image,
          online: member.user?.online ?? false,
          lastSeen: member.user?.last_active ? new Date(member.user.last_active) : undefined,
        }));

        setMembers(channelMembers);

        // Subscribe to presence changes
        const handlePresenceChange = () => {
          const updated = Object.values(channel.state.members).map((member) => ({
            id: member.user_id,
            name: member.user?.name || "Unknown User",
            image: member.user?.image,
            online: member.user?.online ?? false,
            lastSeen: member.user?.last_active ? new Date(member.user.last_active) : undefined,
          }));
          setMembers(updated);
        };

        channel.on("user.presence.changed", handlePresenceChange);

        return () => {
          channel.off("user.presence.changed", handlePresenceChange);
        };
      } catch (error) {
        console.error("Failed to load presence:", error);
      }
    };

    loadPresence();
  }, [client, channelId]);

  return members;
};
