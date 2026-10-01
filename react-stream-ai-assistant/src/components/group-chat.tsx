import { Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Channel,
  MessageList,
  MessageInput,
  TypingIndicator,
  Window,
} from "stream-chat-react";
import { useChatContext } from "stream-chat-react";
import { Channel as StreamChannel, User } from "stream-chat";
import { Button } from "./ui/button";
import { MemberPanel } from "./member-panel";
import { useUserPresence } from "@/hooks/use-presence";
import { TypingIndicatorDisplay } from "./typing-indicator-display";

interface GroupChatProps {
  user: User;
  groupId?: string;
  onBack: () => void;
}

export const GroupChat: React.FC<GroupChatProps> = ({ user, groupId, onBack }) => {
  const { client, setActiveChannel } = useChatContext();
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>("Group Chat");
  const [showMembers, setShowMembers] = useState(false);
  const members = useUserPresence(groupId);
  const onlineCount = members.filter((m) => m.online).length;

  useEffect(() => {
    const loadGroup = async () => {
      if (!client || !groupId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load the group channel
        const channel = client.channel("messaging", groupId);
        await channel.watch();
        setActiveChannel(channel);
        setChannel(channel);

        // Set group name from channel data
        if (channel.data?.name) {
          setGroupName(channel.data.name as string);
        }

        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load group";
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadGroup();
  }, [groupId, client, setActiveChannel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const handleSummarize = async () => {
    if (!channel) return;

    await channel.sendMessage({
      text: "summarize chat",
      custom: {
        system_action: "summarize",
      },
    });
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 flex items-center justify-between bg-background/50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="lg:hidden"
            >
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{groupName}</p>
                <p className="text-xs text-muted-foreground">
                  {members.length} member{members.length !== 1 ? "s" : ""} • {onlineCount} online
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSummarize}
            >
              Summarize
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMembers(!showMembers)}
            >
              <Users className="h-4 w-4 mr-2" />
              Members ({members.length})
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <Channel>
          <Window>
            <div className="flex-1 overflow-hidden flex flex-col">
              <MessageList />
              <div className="px-4 py-2">
                <TypingIndicatorDisplay 
                  typingUsers={members
                    .filter(m => m.online)
                    .map((m) => ({
                      userId: m.id,
                      name: m.name,
                    }))}
                />
              </div>
            </div>
            <div className="border-t border-border p-4 space-y-2">
              <TypingIndicator />
              <MessageInput />
            </div>
          </Window>
        </Channel>
      </div>
      {showMembers && <MemberPanel groupId={groupId} />}
    </div>
  );
};

