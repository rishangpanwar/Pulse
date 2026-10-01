import { Plus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { User } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { GroupCreateDialog } from "./group-create-dialog";

interface GroupListProps {
  user: User;
  onSelectGroup: (groupId: string) => void;
  onNewGroup?: () => void;
}

interface GroupInfo {
  id: string;
  name: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

export const GroupList: React.FC<GroupListProps> = ({ user, onSelectGroup, onNewGroup }) => {
  const { client } = useChatContext();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
      if (!client) return;

      try {
        setLoading(true);

        // Query all group channels where the user is a member
        const channels = await client.queryChannels(
          {
            type: "messaging",
            members: { $in: [user.id] },
          },
          { last_message_at: -1 },
          { limit: 50 }
        );

        const groupsInfo = channels.map((channel) => ({
          id: channel.id,
          name: channel.data?.name as string || channel.id,
          memberCount: Object.keys(channel.state.members).length,
          lastMessage: channel.state.messages[channel.state.messages.length - 1]?.text,
          lastMessageTime: channel.state.messages[channel.state.messages.length - 1]?.created_at
            ? new Date(channel.state.messages[channel.state.messages.length - 1].created_at!).toLocaleString()
            : undefined,
        }));

        setGroups(groupsInfo);
      } catch (error) {
        console.error("Failed to load groups:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();

    // Set up listener for new channels/messages
    if (client) {
      client.on("channel.created", () => {
        loadGroups();
      });
      client.on("message.new", () => {
        loadGroups();
      });
    }

    return () => {
      client?.off("channel.created");
      client?.off("message.new");
    };
  }, [client, user.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Group Chats</h2>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Group
          </Button>
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
            <p className="text-muted-foreground text-center">
              No groups yet. Create one to get started!
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSelectGroup(group.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                    </p>
                    {group.lastMessage && (
                      <p className="text-sm text-foreground/70 truncate mt-1">
                        {group.lastMessage}
                      </p>
                    )}
                    {group.lastMessageTime && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {group.lastMessageTime}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <GroupCreateDialog
          user={user}
          onClose={() => setShowCreateDialog(false)}
          onGroupCreated={(groupId) => {
            setShowCreateDialog(false);
            onSelectGroup(groupId);
          }}
        />
      )}
    </div>
  );
};
