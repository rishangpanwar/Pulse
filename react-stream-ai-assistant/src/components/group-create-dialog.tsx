import { useState } from "react";
import { User } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

interface GroupCreateDialogProps {
  user: User;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

export const GroupCreateDialog: React.FC<GroupCreateDialogProps> = ({
  user,
  onClose,
  onGroupCreated,
}) => {
  const { client } = useChatContext();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([user.id]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      alert("Please enter a group name and select at least one member");
      return;
    }

    try {
      setLoading(true);

      // Generate a unique channel ID
      const channelId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get the channel
      const channel = client!.channel("messaging", channelId, {
        name: groupName,
        members: selectedMembers,
      });

      // Create the channel
      await channel.create();

      onGroupCreated(channelId);
    } catch (error) {
      console.error("Failed to create group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Create New Group</AlertDialogTitle>
          <AlertDialogDescription>
            Create a group chat with multiple members
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Group Name Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Group Name</label>
            <Input
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Selected Members */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Members ({selectedMembers.length})
            </label>
            <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 p-2 text-sm">
                <Checkbox
                  checked={true}
                  disabled
                  className="cursor-not-allowed"
                />
                <span className="font-medium">{user.name} (You)</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You are automatically added as a group member
            </p>
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
            <p>💡 To add more members to the group after creation:</p>
            <p className="mt-1">1. Open the group chat</p>
            <p>2. Click the Members button</p>
            <p>3. Use the add member option</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCreateGroup}
            disabled={loading || !groupName.trim()}
            className="flex gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Group
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
