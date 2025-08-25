import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, Upload, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { IndexingStatus } from "@/types/twelvelabs";
import { cn } from "@/lib/utils";

interface IndexingStatusBadgeProps {
  status?: IndexingStatus;
  error?: string;
  className?: string;
  showTooltip?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pending",
    variant: "secondary" as const,
    className: "text-muted-foreground",
    animate: false,
  },
  uploading: {
    icon: Upload,
    label: "Uploading",
    variant: "secondary" as const,
    className: "text-blue-600",
    animate: true,
  },
  validating: {
    icon: Loader2,
    label: "Validating",
    variant: "secondary" as const,
    className: "text-blue-600",
    animate: true,
  },
  queued: {
    icon: Clock,
    label: "Queued",
    variant: "secondary" as const,
    className: "text-orange-600",
    animate: false,
  },
  indexing: {
    icon: Zap,
    label: "Analyzing",
    variant: "secondary" as const,
    className: "text-purple-600",
    animate: true,
  },
  ready: {
    icon: CheckCircle,
    label: "Ready",
    variant: "default" as const,
    className: "text-green-600",
    animate: false,
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    variant: "destructive" as const,
    className: "text-red-600",
    animate: false,
  },
};

export function IndexingStatusBadge({
  status,
  error,
  className,
  showTooltip = true,
}: IndexingStatusBadgeProps) {
  if (!status) return null;

  const config = statusConfig[status];
  const Icon = config.icon;

  const badge = (
    <Badge 
      variant={config.variant} 
      className={cn("flex items-center gap-1 text-xs", className)}
    >
      <Icon 
        className={cn(
          "h-3 w-3", 
          config.className,
          config.animate && "animate-spin"
        )} 
      />
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  const tooltipContent = error 
    ? `${config.label}: ${error}`
    : getStatusDescription(status);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{tooltipContent}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function getStatusDescription(status: IndexingStatus): string {
  switch (status) {
    case 'pending':
      return 'Video will be uploaded for AI analysis';
    case 'uploading':
      return 'Uploading video to Twelve Labs for processing';
    case 'validating':
      return 'Validating video format and requirements';
    case 'queued':
      return 'Video is queued for AI analysis';
    case 'indexing':
      return 'AI is analyzing video content for search and understanding';
    case 'ready':
      return 'Video analysis complete. Ready for contextual search and insights.';
    case 'failed':
      return 'Video analysis failed. Try re-uploading or check video format.';
    default:
      return 'Unknown status';
  }
}