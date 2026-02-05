import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Video,
  FileText,
  Dumbbell,
  BookOpen,
  Clock,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ExploreFeedContentType = "video" | "article" | "exercise" | "blog";

export interface ExploreFeedCardProps {
  id: string;
  type: ExploreFeedContentType;
  source: string;
  title: string;
  description: string;
  thumbnail?: string;
  duration?: string;
  url: string;
  metadata?: {
    views?: string;
    channel?: string;
    publishedAt?: string;
  };
  isSaved?: boolean;
  onSave?: () => void;
  onSchedule?: () => void;
  onOpen?: () => void;
  className?: string;
}

const typeConfig: Record<ExploreFeedContentType, { 
  icon: typeof Video; 
  label: string;
  emoji: string;
  badgeColor: string;
}> = {
  video: { 
    icon: Video, 
    label: "VIDEO",
    emoji: "🎬",
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
  },
  article: { 
    icon: FileText, 
    label: "ARTICLE",
    emoji: "📰",
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
  },
  exercise: { 
    icon: Dumbbell, 
    label: "EXERCISE",
    emoji: "💪",
    badgeColor: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
  },
  blog: { 
    icon: BookOpen, 
    label: "BLOG",
    emoji: "📝",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
  },
};

export function ExploreFeedCard({
  id,
  type,
  source,
  title,
  description,
  thumbnail,
  duration,
  url,
  metadata,
  isSaved = false,
  onSave,
  onSchedule,
  onOpen,
  className,
}: ExploreFeedCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Card className={cn(
      "group overflow-hidden hover:shadow-lg transition-all duration-200 border-border/40",
      className
    )}>
      <CardContent className="p-0">
        {/* Thumbnail Section */}
        {thumbnail && (
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <img 
              src={thumbnail} 
              alt={title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {duration && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {duration}
              </div>
            )}
            {/* Type Badge Overlay */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className={cn("font-semibold text-xs", config.badgeColor)}>
                {config.emoji} {config.label}
              </Badge>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="p-4 space-y-3">
          {/* Source */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon className="w-3.5 h-3.5" />
            <span className="font-medium">{source}</span>
            {metadata?.publishedAt && (
              <>
                <span>•</span>
                <span>{metadata.publishedAt}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>

          {/* Metadata */}
          {metadata?.channel && (
            <div className="text-xs text-muted-foreground">
              {metadata.channel}
              {metadata.views && ` • ${metadata.views} views`}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            {url && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onOpen}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open
              </Button>
            )}
            
            {onSave && (
              <Button
                size="sm"
                variant={isSaved ? "secondary" : "outline"}
                onClick={onSave}
                className="flex-1"
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 mr-1.5" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                    Save
                  </>
                )}
              </Button>
            )}
            
            {onSchedule && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSchedule}
                className="px-2"
                title="Schedule or mark as read"
              >
                <Calendar className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
