import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, MoreHorizontal, X, Send } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ChatFeedbackBarProps {
  messageId: string;
  onFeedback: (messageId: string, type: "positive" | "negative", comment?: string) => void;
}

export function ChatFeedbackBar({ messageId, onFeedback }: ChatFeedbackBarProps) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleThumbsUp = () => {
    if (feedback === "positive") return;
    setFeedback("positive");
    onFeedback(messageId, "positive");
  };

  const handleThumbsDown = () => {
    if (feedback === "negative") return;
    setFeedback("negative");
    onFeedback(messageId, "negative");
  };

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    onFeedback(messageId, feedback || "negative", comment.trim());
    setComment("");
    setShowComment(false);
    setSubmitted(true);
  };

  if (submitted && !showComment) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
        Thanks for your feedback
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 ${feedback === "positive" ? "text-green-500" : "text-muted-foreground"}`}
        onClick={handleThumbsUp}
        data-testid={`button-thumbs-up-${messageId}`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 ${feedback === "negative" ? "text-red-500" : "text-muted-foreground"}`}
        onClick={handleThumbsDown}
        data-testid={`button-thumbs-down-${messageId}`}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
      
      <Popover open={showComment} onOpenChange={setShowComment}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            data-testid={`button-more-feedback-${messageId}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Leave a comment</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowComment(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              placeholder="What could be improved?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] text-sm"
              data-testid={`input-feedback-comment-${messageId}`}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Anonymous feedback
              </p>
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={!comment.trim()}
                data-testid={`button-submit-feedback-${messageId}`}
              >
                <Send className="h-3 w-3 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
