import cors from "cors";
import "dotenv/config";
import express from "express";
import { createAgent } from "./agents/createAgent";
import { AgentPlatform, AIAgent } from "./agents/types";
import { apiKey, serverClient } from "./serverClient";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Map to store the AI Agent instances
// [user_id string]: AI Agent
const aiAgentCache = new Map<string, AIAgent>();
const pendingAiAgents = new Set<string>();

// TODO: temporary set to 8 hours, should be cleaned up at some point
const inactivityThreshold = 480 * 60 * 1000;
// Periodically check for inactive AI agents and dispose of them
setInterval(async () => {
  const now = Date.now();
  for (const [userId, aiAgent] of aiAgentCache) {
    if (now - aiAgent.getLastInteraction() > inactivityThreshold) {
      console.log(`Disposing AI Agent due to inactivity: ${userId}`);
      await disposeAiAgent(aiAgent);
      aiAgentCache.delete(userId);
    }
  }
}, 5000);

app.get("/", (req, res) => {
  res.json({
    message: "AI Writing Assistant Server is running",
    apiKey: apiKey,
    activeAgents: aiAgentCache.size,
  });
});

/**
 * Handle the request to start the AI Agent
 */
app.post("/start-ai-agent", async (req, res) => {
  const { channel_id, channel_type = "messaging" } = req.body;
  console.log(`[API] /start-ai-agent called for channel: ${channel_id}`);

  // Simple validation
  if (!channel_id) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;

  try {
    // Prevent multiple agents from being created for the same channel simultaneously
    if (!aiAgentCache.has(user_id) && !pendingAiAgents.has(user_id)) {
      console.log(`[API] Creating new agent for ${user_id}`);
      pendingAiAgents.add(user_id);

      await serverClient.upsertUser({
        id: user_id,
        name: "Gemini Assistant",
      });

      const channel = serverClient.channel(channel_type, channel_id);
      await channel.addMembers([user_id]);

      const agent = await createAgent(
        user_id,
        AgentPlatform.GEMINI,
        channel_type,
        channel_id
      );

      await agent.init();
      // Final check to prevent race conditions where an agent might have been added
      // while this one was initializing.
      if (aiAgentCache.has(user_id)) {
        await agent.dispose();
      } else {
        aiAgentCache.set(user_id, agent);
      }
    } else {
      console.log(`AI Agent ${user_id} already started or is pending.`);
    }

    res.json({ message: "AI Agent started", data: [] });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to start AI Agent", errorMessage);
    res
      .status(500)
      .json({ error: "Failed to start AI Agent", reason: errorMessage });
  } finally {
    pendingAiAgents.delete(user_id);
  }
});

/**
 * Handle the request to stop the AI Agent
 */
app.post("/stop-ai-agent", async (req, res) => {
  const { channel_id } = req.body;
  console.log(`[API] /stop-ai-agent called for channel: ${channel_id}`);
  const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;
  try {
    const aiAgent = aiAgentCache.get(user_id);
    if (aiAgent) {
      console.log(`[API] Disposing agent for ${user_id}`);
      await disposeAiAgent(aiAgent);
      aiAgentCache.delete(user_id);
    } else {
      console.log(`[API] Agent for ${user_id} not found in cache.`);
    }
    res.json({ message: "AI Agent stopped", data: [] });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to stop AI Agent", errorMessage);
    res
      .status(500)
      .json({ error: "Failed to stop AI Agent", reason: errorMessage });
  }
});

app.get("/agent-status", (req, res) => {
  const { channel_id } = req.query;
  if (!channel_id || typeof channel_id !== "string") {
    return res.status(400).json({ error: "Missing channel_id" });
  }
  const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;
  console.log(
    `[API] /agent-status called for channel: ${channel_id} (user: ${user_id})`
  );

  if (aiAgentCache.has(user_id)) {
    console.log(`[API] Status for ${user_id}: connected`);
    res.json({ status: "connected" });
  } else if (pendingAiAgents.has(user_id)) {
    console.log(`[API] Status for ${user_id}: connecting`);
    res.json({ status: "connecting" });
  } else {
    console.log(`[API] Status for ${user_id}: disconnected`);
    res.json({ status: "disconnected" });
  }
});

// Token provider endpoint - generates secure tokens
app.post("/token", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    // Create token with expiration (1 hour) and issued at time for security
    // Backdate iat slightly to avoid clock skew issues.
    const issuedAt = Math.floor(Date.now() / 1000) - 60;
    const expiration = issuedAt + 60 * 60; // 1 hour from now

    const token = serverClient.createToken(userId, expiration, issuedAt);

    res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({
      error: "Failed to generate token",
    });
  }
});

/**
 * Group Chat Endpoints
 */

/**
 * Create a new group channel
 */
app.post("/create-group", async (req, res) => {
  try {
    const { name, members, createdBy } = req.body;

    if (!name || !members || members.length === 0 || !createdBy) {
      return res.status(400).json({
        error: "name, members array, and createdBy are required",
      });
    }

    // Generate unique channel ID
    const channelId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the channel
    const channel = serverClient.channel("messaging", channelId, {
      name: name,
      members: members,
    });

    await channel.create();

    res.json({
      message: "Group created successfully",
      channelId: channelId,
      name: name,
      members: members,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to create group:", errorMessage);
    res.status(500).json({
      error: "Failed to create group",
      reason: errorMessage,
    });
  }
});

/**
 * Get all groups for a user
 */
app.get("/groups/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    // Query channels where user is a member
    const channels = await serverClient.queryChannels(
      {
        type: "messaging",
        members: { $in: [userId] },
      },
      { last_message_at: -1 },
      { limit: 50 }
    );

    const groups = channels.map((channel) => ({
      id: channel.id,
      name: channel.data?.name || channel.id,
      memberCount: channel.data?.member_count || 0,
      createdAt: channel.data?.created_at,
      updatedAt: channel.data?.updated_at,
      lastMessageAt: channel.state.last_message_at,
    }));

    res.json({
      message: "Groups retrieved successfully",
      groups: groups,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to get groups:", errorMessage);
    res.status(500).json({
      error: "Failed to get groups",
      reason: errorMessage,
    });
  }
});

/**
 * Add members to a group
 */
app.post("/add-member", async (req, res) => {
  try {
    const { channelId, memberIds } = req.body;

    if (!channelId || !memberIds || memberIds.length === 0) {
      return res.status(400).json({
        error: "channelId and memberIds array are required",
      });
    }

    const channel = serverClient.channel("messaging", channelId);
    await channel.addMembers(memberIds);

    res.json({
      message: "Members added successfully",
      channelId: channelId,
      addedMembers: memberIds,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to add members:", errorMessage);
    res.status(500).json({
      error: "Failed to add members",
      reason: errorMessage,
    });
  }
});

/**
 * Remove members from a group
 */
app.post("/remove-member", async (req, res) => {
  try {
    const { channelId, memberIds } = req.body;

    if (!channelId || !memberIds || memberIds.length === 0) {
      return res.status(400).json({
        error: "channelId and memberIds array are required",
      });
    }

    const channel = serverClient.channel("messaging", channelId);
    await channel.removeMembers(memberIds);

    res.json({
      message: "Members removed successfully",
      channelId: channelId,
      removedMembers: memberIds,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to remove members:", errorMessage);
    res.status(500).json({
      error: "Failed to remove members",
      reason: errorMessage,
    });
  }
});

async function disposeAiAgent(aiAgent: AIAgent) {
  await aiAgent.dispose();
  if (!aiAgent.user) {
    return;
  }
  await serverClient.deleteUser(aiAgent.user.id, {
    hard_delete: true,
  });
}

// Start the Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
