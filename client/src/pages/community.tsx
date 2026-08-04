import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  PartyPopper,
  Lightbulb,
  Send,
  Sparkles,
  Trash2,
  UserX,
  Flag,
  ChevronLeft,
  Settings2,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommunityProfileT {
  id: string;
  displayName: string;
  avatarEmoji: string;
  bio: string | null;
  shareRoleMapLevel: boolean;
}

interface BoardT {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  postCount: number;
}

interface AuthorT {
  userId: string;
  displayName: string;
  avatarEmoji: string;
  roleMapBadge: string | null;
}

interface PostListItemT {
  id: string;
  title: string;
  body: string;
  replyCount: number;
  reactionCount: number;
  createdAt: string;
  isMine: boolean;
  author?: AuthorT;
}

interface PostDetailT {
  id: string;
  title: string;
  body: string;
  reactionCount: number;
  createdAt: string;
  isMine: boolean;
  authorUserId: string;
  author?: AuthorT;
}

interface ReplyT {
  id: string;
  parentReplyId: string | null;
  body: string;
  reactionCount: number;
  createdAt: string;
  isMine: boolean;
  authorUserId: string;
  author?: AuthorT;
}

const REACTIONS = [
  { kind: "encourage", icon: Heart, label: "Encourage" },
  { kind: "celebrate", icon: PartyPopper, label: "Celebrate" },
  { kind: "insight", icon: Lightbulb, label: "Insight" },
] as const;

const AVATAR_EMOJIS = ["🌱", "🌟", "🔥", "🌊", "🦋", "🌸", "⚡", "🏔️", "🌈", "🧘"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function AuthorLine({ author, createdAt }: { author?: AuthorT; createdAt: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-base leading-none">{author?.avatarEmoji ?? "👤"}</span>
      <span className="font-medium text-foreground">{author?.displayName ?? "Member"}</span>
      {author?.roleMapBadge && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {author.roleMapBadge}
        </Badge>
      )}
      <span>·</span>
      <span>{timeAgo(createdAt)}</span>
    </div>
  );
}

// ─── Profile setup / editing ─────────────────────────────────────────────────

function ProfileDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: CommunityProfileT | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [avatarEmoji, setAvatarEmoji] = useState(profile?.avatarEmoji ?? "🌱");
  const [shareLevel, setShareLevel] = useState(profile?.shareRoleMapLevel ?? false);

  const save = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/community/profile", {
        displayName: displayName.trim(),
        avatarEmoji,
        shareRoleMapLevel: shareLevel,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/community/profile"] });
      onOpenChange(false);
      toast({ title: "Community profile saved" });
    },
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-community-profile">
        <DialogHeader>
          <DialogTitle>{profile ? "Edit community profile" : "Join the community"}</DialogTitle>
          <DialogDescription>
            Pick a public name — it's the only thing other members see. Your email and account
            details stay private.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Display name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. MorningClimber"
              maxLength={40}
              data-testid="input-display-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Avatar</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {AVATAR_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatarEmoji(e)}
                  className={`text-xl p-1.5 rounded-md border ${
                    avatarEmoji === e ? "border-primary bg-primary/10" : "border-transparent"
                  }`}
                  data-testid={`button-avatar-${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Share my Role Map level</p>
              <p className="text-xs text-muted-foreground">
                Show your current role and level next to your name so others leveling up in the
                same direction can find you. Off by default.
              </p>
            </div>
            <Switch
              checked={shareLevel}
              onCheckedChange={setShareLevel}
              data-testid="switch-share-level"
            />
          </div>
          <Button
            className="w-full"
            disabled={displayName.trim().length < 2 || save.isPending}
            onClick={() => save.mutate()}
            data-testid="button-save-profile"
          >
            {save.isPending ? "Saving…" : profile ? "Save changes" : "Join community"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function useCommunityProfile() {
  return useQuery<{ profile: CommunityProfileT | null }>({
    queryKey: ["/api/community/profile"],
  });
}

// ─── Board list ──────────────────────────────────────────────────────────────

function BoardListView() {
  const { data: profileData } = useCommunityProfile();
  const { data: boards, isLoading } = useQuery<BoardT[]>({
    queryKey: ["/api/community/boards"],
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const profile = profileData?.profile ?? null;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-transparent p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Grow together
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Boards for every direction you're leveling up in. Post, reply, and encourage each
              other.
            </p>
          </div>
          <Button
            size="sm"
            variant={profile ? "ghost" : "default"}
            onClick={() => setProfileOpen(true)}
            data-testid="button-community-profile"
          >
            {profile ? (
              <>
                <Settings2 className="w-4 h-4 mr-1" /> Profile
              </>
            ) : (
              "Join"
            )}
          </Button>
        </div>
        {profile && (
          <p className="text-xs text-muted-foreground mt-2">
            Posting as {profile.avatarEmoji} <span className="font-medium">{profile.displayName}</span>
          </p>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {boards?.map((b) => (
          <Link key={b.id} href={`/community/b/${b.slug}`}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" data-testid={`card-board-${b.slug}`}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{b.description}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {b.postCount} {b.postCount === 1 ? "post" : "posts"}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {profileOpen && (
        <ProfileDialog
          key={profile?.id ?? "new"}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          profile={profile}
        />
      )}
    </div>
  );
}

// ─── Board (post list + composer) ────────────────────────────────────────────

function BoardView({ slug }: { slug: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: profileData } = useCommunityProfile();
  const profile = profileData?.profile ?? null;
  const [profileOpen, setProfileOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  type PostsPage = { board: BoardT; posts: PostListItemT[]; nextCursor: string | null };
  const {
    data: pages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PostsPage>({
    queryKey: [`/api/community/boards/${slug}/posts`],
    queryFn: async ({ pageParam }) => {
      const url = pageParam
        ? `/api/community/boards/${slug}/posts?cursor=${encodeURIComponent(String(pageParam))}`
        : `/api/community/boards/${slug}/posts`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return (await res.json()) as PostsPage;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const data = pages
    ? {
        board: pages.pages[0]?.board,
        posts: pages.pages.flatMap((p) => p.posts),
      }
    : undefined;

  const createPost = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/community/boards/${slug}/posts`, {
        title: title.trim(),
        body: body.trim(),
      });
      return (await res.json()) as { post: { id: string } };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: [`/api/community/boards/${slug}/posts`] });
      setComposerOpen(false);
      setTitle("");
      setBody("");
      navigate(`/community/p/${d.post.id}`);
    },
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  const startPost = () => {
    if (!profile) {
      setProfileOpen(true);
      return;
    }
    setComposerOpen(true);
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Link href="/community" className="text-sm text-muted-foreground flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> All boards
        </Link>
        <Button size="sm" onClick={startPost} data-testid="button-new-post">
          New post
        </Button>
      </div>

      {data?.board && (
        <div>
          <h2 className="text-lg font-semibold">{data.board.name}</h2>
          <p className="text-sm text-muted-foreground">{data.board.description}</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {data && data.posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No posts yet — be the first to start a conversation.</p>
        </div>
      )}

      <div className="space-y-2">
        {data?.posts.map((p) => (
          <Link key={p.id} href={`/community/p/${p.id}`}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" data-testid={`card-post-${p.id}`}>
              <CardContent className="p-4 space-y-2">
                <AuthorLine author={p.author} createdAt={p.createdAt} />
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{p.body}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" /> {p.replyCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> {p.reactionCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
          data-testid="button-load-more"
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-composer">
          <DialogHeader>
            <DialogTitle>New post</DialogTitle>
            <DialogDescription>Share what you're working on or ask for support.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              maxLength={160}
              data-testid="input-post-title"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={5}
              maxLength={5000}
              data-testid="input-post-body"
            />
            <Button
              className="w-full"
              disabled={title.trim().length < 3 || !body.trim() || createPost.isPending}
              onClick={() => createPost.mutate()}
              data-testid="button-submit-post"
            >
              {createPost.isPending ? "Posting…" : "Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {profileOpen && (
        <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} profile={profile} />
      )}
    </div>
  );
}

// ─── Post thread ─────────────────────────────────────────────────────────────

function ReactionBar({
  targetType,
  targetId,
  count,
  myKinds,
  onToggled,
}: {
  targetType: "post" | "reply";
  targetId: string;
  count: number;
  myKinds: Set<string>;
  onToggled: () => void;
}) {
  const { toast } = useToast();
  const toggle = useMutation({
    mutationFn: async (kind: string) => {
      await apiRequest("POST", "/api/community/reactions/toggle", {
        targetType,
        targetId,
        kind,
      });
    },
    onSuccess: onToggled,
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map(({ kind, icon: Icon, label }) => (
        <Button
          key={kind}
          variant="ghost"
          size="sm"
          className={`h-7 px-2 ${myKinds.has(kind) ? "text-primary" : "text-muted-foreground"}`}
          onClick={() => toggle.mutate(kind)}
          title={label}
          data-testid={`button-react-${kind}-${targetId}`}
        >
          <Icon className={`w-3.5 h-3.5 ${myKinds.has(kind) ? "fill-current" : ""}`} />
        </Button>
      ))}
      <span className="text-xs text-muted-foreground ml-1">{count}</span>
    </div>
  );
}

function ItemMenu({
  isMine,
  onDelete,
  onReport,
  onBlock,
}: {
  isMine: boolean;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid="button-item-menu">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isMine ? (
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={onReport}>
              <Flag className="w-4 h-4 mr-2" /> Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBlock} className="text-destructive">
              <UserX className="w-4 h-4 mr-2" /> Block member
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PostView({ postId }: { postId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: profileData } = useCommunityProfile();
  const profile = profileData?.profile ?? null;
  const [profileOpen, setProfileOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const queryKey = [`/api/community/posts/${postId}`];
  const { data, isLoading, error } = useQuery<{
    post: PostDetailT;
    replies: ReplyT[];
    myReactions: { targetType: string; targetId: string; kind: string }[];
  }>({ queryKey });

  const refetch = () => qc.invalidateQueries({ queryKey });

  const reply = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/community/posts/${postId}/replies`, {
        body: replyBody.trim(),
        ...(replyTo ? { parentReplyId: replyTo } : {}),
      });
    },
    onSuccess: () => {
      setReplyBody("");
      setReplyTo(null);
      refetch();
    },
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (args: { type: "post" | "reply"; id: string }) => {
      await apiRequest(
        "DELETE",
        args.type === "post"
          ? `/api/community/posts/${args.id}`
          : `/api/community/replies/${args.id}`,
      );
      return args;
    },
    onSuccess: (args) => {
      if (args.type === "post") {
        toast({ title: "Post deleted" });
        navigate("/community");
      } else {
        refetch();
      }
    },
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  const report = useMutation({
    mutationFn: async (args: { targetType: "post" | "reply"; targetId: string }) => {
      await apiRequest("POST", "/api/community/reports", args);
    },
    onSuccess: () =>
      toast({ title: "Reported", description: "Thanks — we'll take a look." }),
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  const block = useMutation({
    mutationFn: async (blockedUserId: string) => {
      await apiRequest("POST", "/api/community/blocks", { blockedUserId });
    },
    onSuccess: () => {
      toast({ title: "Member blocked", description: "You won't see their posts anymore." });
      refetch();
    },
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">This post isn't available.</p>
        <Link href="/community" className="text-sm text-primary underline">
          Back to community
        </Link>
      </div>
    );
  }

  const myKindsFor = (targetId: string) =>
    new Set(data.myReactions.filter((r) => r.targetId === targetId).map((r) => r.kind));

  const topLevel = data.replies.filter((r) => !r.parentReplyId);
  const childrenOf = (id: string) => data.replies.filter((r) => r.parentReplyId === id);

  const submitReply = () => {
    if (!profile) {
      setProfileOpen(true);
      return;
    }
    reply.mutate();
  };

  const renderReply = (r: ReplyT, nested = false) => (
    <div key={r.id} className={nested ? "ml-8" : ""}>
      <Card data-testid={`card-reply-${r.id}`}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <AuthorLine author={r.author} createdAt={r.createdAt} />
            <ItemMenu
              isMine={r.isMine}
              onDelete={() => del.mutate({ type: "reply", id: r.id })}
              onReport={() => report.mutate({ targetType: "reply", targetId: r.id })}
              onBlock={() => block.mutate(r.authorUserId)}
            />
          </div>
          <p className="text-sm whitespace-pre-wrap">{r.body}</p>
          <div className="flex items-center justify-between">
            <ReactionBar
              targetType="reply"
              targetId={r.id}
              count={r.reactionCount}
              myKinds={myKindsFor(r.id)}
              onToggled={refetch}
            />
            {!nested && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setReplyTo(replyTo === r.id ? null : r.id)}
                data-testid={`button-reply-to-${r.id}`}
              >
                Reply
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {childrenOf(r.id).map((c) => (
        <div key={c.id} className="mt-2">
          {renderReply(c, true)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-32">
      <Link href="/community" className="text-sm text-muted-foreground flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Community
      </Link>

      <Card data-testid="card-post-detail">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <AuthorLine author={data.post.author} createdAt={data.post.createdAt} />
            <ItemMenu
              isMine={data.post.isMine}
              onDelete={() => del.mutate({ type: "post", id: data.post.id })}
              onReport={() => report.mutate({ targetType: "post", targetId: data.post.id })}
              onBlock={() => block.mutate(data.post.authorUserId)}
            />
          </div>
          <h2 className="text-lg font-semibold">{data.post.title}</h2>
          <p className="text-sm whitespace-pre-wrap">{data.post.body}</p>
          <ReactionBar
            targetType="post"
            targetId={data.post.id}
            count={data.post.reactionCount}
            myKinds={myKindsFor(data.post.id)}
            onToggled={refetch}
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {topLevel.length === 0 ? "No replies yet" : "Replies"}
        </p>
        {topLevel.map((r) => renderReply(r))}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-3">
        <div className="max-w-2xl mx-auto space-y-1">
          {replyTo && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Replying to a comment ·{" "}
              <button className="underline" onClick={() => setReplyTo(null)}>
                cancel
              </button>
            </p>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={profile ? "Add an encouraging reply…" : "Join the community to reply…"}
              rows={1}
              className="min-h-[40px] max-h-32 resize-none"
              data-testid="input-reply"
            />
            <Button
              size="icon"
              disabled={(!replyBody.trim() && !!profile) || reply.isPending}
              onClick={submitReply}
              data-testid="button-send-reply"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {profileOpen && (
        <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} profile={profile} />
      )}
    </div>
  );
}

// ─── Page shell ──────────────────────────────────────────────────────────────

export default function CommunityPage() {
  usePageMeta("Community", "Message boards where members grow together.");
  const [, boardParams] = useRoute("/community/b/:slug");
  const [, postParams] = useRoute("/community/p/:id");

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Community" />
      <div className="flex-1 overflow-auto">
        {postParams ? (
          <PostView postId={postParams.id} />
        ) : boardParams ? (
          <BoardView slug={boardParams.slug} />
        ) : (
          <BoardListView />
        )}
      </div>
    </div>
  );
}
