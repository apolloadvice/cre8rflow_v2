"use client";

import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { ScrollArea } from "../../ui/scroll-area";
import { AudioProperties } from "./audio-properties";
import { MediaProperties } from "./media-properties";
import { TextProperties } from "./text-properties";
import { ChatPanel } from "../chat-panel";

export function PropertiesPanel() {
  const { selectedElements, tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();

  return (
    <>
      {selectedElements.length > 0 ? (
        <ScrollArea className="h-full bg-panel rounded-sm">
          {selectedElements.map(({ trackId, elementId }) => {
            const track = tracks.find((t) => t.id === trackId);
            const element = track?.elements.find((e) => e.id === elementId);

            if (element?.type === "text") {
              return (
                <div key={elementId}>
                  <TextProperties element={element} trackId={trackId} />
                </div>
              );
            }
            if (element?.type === "media") {
              const mediaItem = mediaItems.find(
                (item) => item.id === element.mediaId
              );

              if (mediaItem?.type === "audio") {
                return <AudioProperties key={elementId} element={element} />;
              }

              return (
                <div key={elementId}>
                  <MediaProperties element={element} />
                </div>
              );
            }
            return null;
          })}
        </ScrollArea>
      ) : (
        <ChatPanel />
      )}
    </>
  );
}

// Empty state replaced by ChatPanel
