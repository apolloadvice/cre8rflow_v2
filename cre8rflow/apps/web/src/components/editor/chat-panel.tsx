"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Bot, Lightbulb, ArrowUp } from "lucide-react";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = () => {
    const text = input.trim();
    if (text.length === 0) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);
    setInput("");
  };

  return (
    <div className="bg-panel h-full flex flex-col rounded-sm">
      <ScrollArea className="flex-1 px-5 py-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Tell me what edits to apply to your video</h2>
            <p className="text-xs text-muted-foreground">
              Multi-track timeline ready. Try: "cut out 10–20 from video track", "add audio track", or "move to title track"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-xl mt-2">
            <QuickAction label="Auto-Cut Silence" onUse={() => setInput("auto-cut silence")} />
            <QuickAction label="Highlight Reel" onUse={() => setInput("make a highlight reel")} />
            <QuickAction label="Add Subtitles" onUse={() => setInput("add subtitles")} />
            <QuickAction label="Color Grade" onUse={() => setInput("apply color grade")} />
            <QuickAction label="Sync to Music" onUse={() => setInput("sync cuts to music")} />
            <QuickAction label="Cinematic Look" onUse={() => setInput("cinematic look")} />
            <div className="col-span-2">
              <QuickAction label="Vertical Crop" full onUse={() => setInput("vertical crop")} />
            </div>
          </div>

          {/* Messages list */}
          <div className="w-full max-w-3xl mt-6 space-y-2 text-left">
            {messages.map((m) => (
              <ChatBubble key={m.id} role={m.role} content={m.content} />
            ))}
            <div className="h-2" ref={endRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Footer input pinned to bottom */}
      <div className="border-t p-3">
        <div className="w-full max-w-3xl mx-auto relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me what edits to apply to your video... (e.g., 'cut out 10–20 from video track', 'add audio track', 'move to title track')"
            className="pr-14"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            type="button"
            className="absolute right-2 bottom-2 rounded-md"
            size="icon"
            onClick={sendMessage}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                sendMessage();
              }
            }}
            aria-label="Send message"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>
              Press Enter to send, Shift+Enter for new line, Cmd+A to select all
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ role, content }: { role: ChatRole; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-md px-3 py-2 bg-primary text-primary-foreground shadow-sm"
            : "max-w-[85%] rounded-md px-3 py-2 bg-secondary text-foreground shadow-sm"
        }
      >
        <p className="text-[0.9rem] leading-snug whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function QuickAction({ label, onUse, full }: { label: string; onUse?: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onUse}
      className={`w-full ${full ? "" : ""} h-10 text-sm rounded-md border bg-transparent hover:bg-accent transition-colors`}
    >
      {label}
    </button>
  );
}


