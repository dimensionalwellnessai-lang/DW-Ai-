import { useState } from "react";
import { MessageCircle, X, Send, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

export function FloatingAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-20 right-4 z-50 w-80 shadow-xl border">
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <span className="font-medium">Ask DW</span>
        <div className="flex gap-1">
          <Link href="/talk">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" aria-label="Open full chat">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </Link>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
            aria-label="Close widget"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-3 space-y-3">
        <p className="text-sm text-muted-foreground">
          Quick question? Ask me anything.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="What's my workout today?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && message.trim()) {
                // Handle message send
                setMessage("");
              }
            }}
          />
          <Button size="icon" aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button variant="outline" size="sm" className="text-xs">
            What's my workout?
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            Log water
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            How am I doing?
          </Button>
        </div>
      </div>
    </Card>
  );
}
