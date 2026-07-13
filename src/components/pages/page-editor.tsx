"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Trash2,
  Mic,
  RefreshCw,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updatePage, deletePage } from "@/lib/pages/actions";
import type { PageDTO } from "@/lib/stores/pages-store";
import type { PageContent } from "@/lib/pages/helpers";
import { useVoiceTranscriber } from "@/lib/assemblyai/use-voice-transcriber";

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="size-7"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

export function PageEditor({
  page,
  onUpdated,
  onDeleted,
}: {
  page: PageDTO;
  onUpdated: (id: string, patch: Partial<PageDTO>) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [saving, setSaving] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const { isRecording, startTranscribing, stopTranscribing } = useVoiceTranscriber();

  // Sync state on page change
  useEffect(() => {
    setTitle(page.title);
    if (isRecording) {
      stopTranscribing();
      setLiveTranscript("");
    }
  }, [page.id]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: page.content as object,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[55vh] focus:outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_p]:my-1 leading-relaxed",
      },
    },
    onUpdate: ({ editor: e }) => {
      // Autosave content on changes
      const json = e.getJSON() as PageContent;
      save({ content: json });
    },
  });

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopTranscribing();
      setLiveTranscript("");
    } else {
      setLiveTranscript("");
      startTranscribing(
        (partial) => {
          setLiveTranscript(partial);
        },
        (final) => {
          setLiveTranscript("");
          if (editor) {
            editor.chain().focus().insertContent(` ${final}`).run();
          }
        }
      );
    }
  };

  async function save(patch: { title?: string; content?: PageContent }) {
    setSaving(true);
    const result = await updatePage(page.id, patch);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onUpdated(page.id, { ...patch, updatedAt: new Date().toISOString() });
  }

  async function handleDelete() {
    if (isRecording) stopTranscribing();
    const result = await deletePage(page.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Page deleted permanently!");
    onDeleted(page.id);
  }

  function timeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "1d ago";
    return `${diffDay}d ago`;
  }

  if (!editor) return null;

  // Calculate words count
  const textContent = editor.getText();
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="flex h-full flex-1 flex-col bg-[#FDFDFD] dark:bg-[#121214]">
      
      {/* Editor Details Header */}
      <div className="flex items-start justify-between gap-4 mb-4 pb-2">
        <div className="space-y-1 min-w-0 flex-grow">
          {/* Document Title input */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== page.title && save({ title })}
            onKeyDown={(e) => e.key === "Enter" && title.trim() && title !== page.title && save({ title })}
            className="h-8 border-none text-2xl font-bold shadow-none focus-visible:ring-0 p-0 text-neutral-800 dark:text-neutral-100 placeholder:opacity-50 truncate leading-none"
            placeholder="Untitled page"
          />
          {/* Metadata info */}
          <p className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 uppercase tracking-wider">
            <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Project Plan • Updated {timeAgo(page.updatedAt)} • SA
          </p>
        </div>

        {/* Action badges & deletion dialog */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full flex items-center gap-1">
            {saving ? <RefreshCw className="size-2.5 animate-spin" /> : null}
            {saving ? "Saving..." : "Saved"}
          </span>
          <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full">
            {wordCount} words
          </span>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 text-neutral-400 hover:text-red-600 rounded-lg">
                <Trash2 className="size-4.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl p-6 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &quot;{page.title}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this page. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 gap-2">
                <AlertDialogCancel className="rounded-xl cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer border-0 shadow-xs">
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-neutral-100/60 dark:bg-neutral-800/40 mb-4 flex-wrap border border-neutral-200/40 dark:border-neutral-800/40">
        
        {/* format controls */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="size-4 text-neutral-500" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="size-4 text-neutral-500" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="size-4 text-neutral-500" />
          </ToolbarButton>

          <div className="mx-1.5 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 className="size-4 text-neutral-500" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className="size-4 text-neutral-500" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 className="size-4 text-neutral-500" />
          </ToolbarButton>

          <div className="mx-1.5 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <List className="size-4 text-neutral-500" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered list"
          >
            <ListOrdered className="size-4 text-neutral-500" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <Quote className="size-4 text-neutral-500" />
          </ToolbarButton>

          <div className="mx-1.5 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

          <ToolbarButton 
            active={false} 
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
          >
            <Undo2 className="size-4 text-neutral-500" />
          </ToolbarButton>
          <ToolbarButton 
            active={false} 
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
          >
            <Redo2 className="size-4 text-neutral-500" />
          </ToolbarButton>
        </div>

        {/* Voice microphone button */}
        <button
          onClick={handleVoiceToggle}
          className={cn(
            "border font-semibold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer h-7",
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white border-red-600 animate-pulse"
              : "bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200/70 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
          )}
        >
          <Mic className="size-3.5" />
          {isRecording ? "Stop Listening" : "Voice"}
        </button>

      </div>

      {/* Editor Content editable document */}
      <div className="flex-grow overflow-y-auto min-h-0 border border-neutral-100 rounded-2xl dark:border-neutral-900/60 p-5 bg-[#FCFAF7]/20 flex flex-col justify-between">
        <div className="flex-grow">
          <EditorContent editor={editor} />
        </div>

        {/* Live speech transcription overlay indicator */}
        {isRecording && (
          <div className="mt-2 text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-200/40 dark:border-neutral-800/40 flex items-center gap-2">
            <span className="size-2 bg-red-500 rounded-full animate-ping shrink-0" />
            <span className="font-semibold text-neutral-500 shrink-0">Live Transcript:</span>
            <span className="italic truncate">{liveTranscript || "Listening..."}</span>
          </div>
        )}
      </div>

    </div>
  );
}
