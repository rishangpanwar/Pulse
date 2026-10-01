import { useState, useEffect } from "react";
import { useChatContext } from "stream-chat-react";
import { UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";

interface MemberPanelProps {
  groupId?: string;
}

interface Member {
  id: string;
  name: string;
  image?: string;
  online: boolean;
  lastSeen?: string;
}

export const MemberPanel: React.FC<MemberPanelProps> = ({ groupId }) => {
  const { client } = useChatContext();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [manualUserId, setManualUserId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      if (!client || !groupId) {
        setLoading(false);
        return;
      }

      try {
        const channel = client.channel("messaging", groupId);
        await channel.watch();

        const channelMembers = Object.values(channel.state.members).map((member) => ({
          id: member.user_id,
          name: member.user?.name || "Unknown User",
          image: member.user?.image,
          online: member.user?.online ?? false,
        }));

        setMembers(channelMembers);

        // Subscribe to online status changes
        const handlePresenceChange = () => {
          const updated = Object.values(channel.state.members).map((member) => ({
            id: member.user_id,
            name: member.user?.name || "Unknown User",
            image: member.user?.image,
            online: member.user?.online ?? false,
          }));
          setMembers(updated);
        };

        channel.on("user.presence.changed", handlePresenceChange);

        return () => {
          channel.off("user.presence.changed", handlePresenceChange);
        };
      } catch (error) {
        console.error("Failed to load members:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [client, groupId]);

  const onlineMembers = members.filter((m) => m.online);
  const offlineMembers = members.filter((m) => !m.online);

  useEffect(() => {
    const runSearch = async () => {
      if (!client || !searchTerm.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const response = await client.queryUsers(
          {
            $or: [
              { id: { $autocomplete: searchTerm } },
              { name: { $autocomplete: searchTerm } },
            ],
          },
          { id: 1 },
          { limit: 10 }
        );

        const results = response.users
          .map((user) => ({
            id: user.id,
            name: user.name || user.id,
            image: user.image,
            online: user.online ?? false,
          }))
          .filter((user) => !members.some((m) => m.id === user.id));

        setSearchResults(results);
      } catch (error) {
        console.error("Failed to search users:", error);
      }
    };

    runSearch();
  }, [client, searchTerm, members]);

  const addMembersToChannel = async (memberIds: string[]) => {
    if (!client || !groupId || memberIds.length === 0) return;

    try {
      setAdding(true);
      const channel = client.channel("messaging", groupId);
      await channel.addMembers(memberIds);
      setManualUserId("");
      setSearchResults((prev) => prev.filter((u) => !memberIds.includes(u.id)));
    } catch (error) {
      console.error("Failed to add members:", error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="w-64 border-l border-border flex flex-col bg-muted/20">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h3 className="font-semibold">Members</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {members.length} total • {onlineMembers.length} online
        </p>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Online Members */}
          {onlineMembers.length > 0 && (
            <>
              <div className="text-xs font-semibold text-muted-foreground uppercase px-2">
                Online ({onlineMembers.length})
              </div>
              {onlineMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="h-8 w-8 rounded-full"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <Badge variant="secondary" className="text-xs mt-0.5">
                      Online
                    </Badge>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Offline Members */}
          {offlineMembers.length > 0 && (
            <>
              <div className="text-xs font-semibold text-muted-foreground uppercase px-2 pt-4">
                Offline ({offlineMembers.length})
              </div>
              {offlineMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors opacity-60"
                >
                  <div className="relative">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="h-8 w-8 rounded-full"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-gray-400 rounded-full border border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">Offline</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Add Member */}
      <div className="border-t border-border p-3 space-y-3">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Add by username or user ID</p>
          <div className="flex gap-2">
            <Input
              value={manualUserId}
              onChange={(e) => setManualUserId(e.target.value)}
              placeholder="Type user ID"
              disabled={adding}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={adding || !manualUserId.trim()}
              onClick={() => addMembersToChannel([manualUserId.trim()])}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Search users</p>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or ID"
            disabled={adding}
          />
          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto border border-border rounded-md">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {user.image && (
                      <img
                        src={user.image}
                        alt={user.name}
                        className="h-6 w-6 rounded-full"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.id}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={adding}
                    onClick={() => addMembersToChannel([user.id])}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
