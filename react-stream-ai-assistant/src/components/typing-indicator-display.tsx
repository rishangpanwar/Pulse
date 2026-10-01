import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  typingUsers: Array<{ userId: string; name?: string }>;
}

/**
 * Enhanced typing indicator that shows which users are typing
 */
export const TypingIndicatorDisplay: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (typingUsers.length === 0) {
      setDisplayText("");
      return;
    }

    const names = typingUsers.map((u) => u.name || "Someone").slice(0, 3);

    if (names.length === 1) {
      setDisplayText(`${names[0]} is typing`);
    } else if (names.length === 2) {
      setDisplayText(`${names[0]} and ${names[1]} are typing`);
    } else {
      setDisplayText(`${names.join(", ")} and others are typing`);
    }
  }, [typingUsers]);

  if (!displayText) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-muted/30 rounded-md">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" />
        <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
        <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
      </div>
      <span>{displayText}</span>
    </div>
  );
};
