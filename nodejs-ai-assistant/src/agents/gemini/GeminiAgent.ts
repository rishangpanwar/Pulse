import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Channel, DefaultGenerics, Event, StreamChat } from "stream-chat";
import type { AIAgent } from "../types";

const MODEL_NAME =
  process.env.GEMINI_MODEL?.trim() || "gemini-1.5-pro-latest";
const SUMMARY_TRIGGER = "summarize chat";
const MAX_CONTEXT_MESSAGES = 50;

export class GeminiAgent implements AIAgent {
  private gemini?: GoogleGenerativeAI;
  private lastInteractionTs = Date.now();

  constructor(
    readonly chatClient: StreamChat,
    readonly channel: Channel
  ) {}

  dispose = async () => {
    this.chatClient.off("message.new", this.handleMessage);
    await this.chatClient.disconnectUser();
  };

  get user() {
    return this.chatClient.user;
  }

  getLastInteraction = (): number => this.lastInteractionTs;

  init = async () => {
    const apiKey = process.env.GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }

    this.gemini = new GoogleGenerativeAI(apiKey);
    this.chatClient.on("message.new", this.handleMessage);
  };

  private handleMessage = async (e: Event<DefaultGenerics>) => {
    if (!this.gemini) {
      return;
    }

    if (!e.message || e.message.ai_generated) {
      return;
    }

    const messageText = e.message.text?.trim();
    if (!messageText) {
      return;
    }

    if (e.message.user?.id === this.user?.id) {
      return;
    }

    this.lastInteractionTs = Date.now();

    const isSummarize =
      messageText.toLowerCase() === SUMMARY_TRIGGER ||
      (e.message.custom as { system_action?: string } | undefined)?.system_action ===
        "summarize";

    const prompt = isSummarize
      ? this.buildSummaryPrompt()
      : this.buildAssistantPrompt(messageText);

    const { message: channelMessage } = await this.channel.sendMessage({
      text: "",
      ai_generated: true,
    });

    await this.channel.sendEvent({
      type: "ai_indicator.update",
      ai_state: "AI_STATE_THINKING",
      cid: channelMessage.cid,
      message_id: channelMessage.id,
    });

    try {
      const model = this.gemini.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      await this.chatClient.partialUpdateMessage(channelMessage.id, {
        set: { text: responseText || "No response generated." },
      });

      await this.channel.sendEvent({
        type: "ai_indicator.clear",
        cid: channelMessage.cid,
        message_id: channelMessage.id,
      });
    } catch (error) {
      console.error("Gemini error:", error);
      await this.channel.sendEvent({
        type: "ai_indicator.update",
        ai_state: "AI_STATE_ERROR",
        cid: channelMessage.cid,
        message_id: channelMessage.id,
      });
    }
  };

  private buildAssistantPrompt(message: string) {
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `You are a helpful AI chat assistant.\n\nCurrent date: ${currentDate}\n\nUser message: ${message}\n\nRespond clearly and concisely.`;
  }

  private buildSummaryPrompt() {
    const messages = this.channel.state.messages
      .filter((msg) => msg.text && !msg.ai_generated)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((msg) => {
        const name = msg.user?.name || msg.user?.id || "User";
        return `${name}: ${msg.text}`;
      })
      .join("\n");

    return `Summarize the following group chat conversation. Highlight key points, decisions, and any open questions.\n\n${messages}`;
  }
}
