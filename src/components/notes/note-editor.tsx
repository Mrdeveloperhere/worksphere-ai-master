"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, BookOpen, Mic, RefreshCw } from "lucide-react";

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
import { updateNote, deleteNote } from "@/lib/notes/actions";
import type { NoteDTO } from "@/lib/stores/notes-store";
import { useVoiceTranscriber } from "@/lib/assemblyai/use-voice-transcriber";

export function NoteEditor({
  note,
  onUpdated,
  onDeleted,
}: {
  note: NoteDTO;
  onUpdated: (id: string, patch: Partial<NoteDTO>) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const { isRecording, startTranscribing, stopTranscribing } = useVoiceTranscriber();

  // Sync state with incoming note prop changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    // Stop recording on note switch
    if (isRecording) {
      stopTranscribing();
      setLiveTranscript("");
    }
  }, [note.id]);

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
          setContent((prev) => {
            const next = prev ? `${prev.trim()} ${final}` : final;
            save({ content: next });
            return next;
          });
        }
      );
    }
  };

  async function save(patch: { title?: string; content?: string }) {
    setSaving(true);
    const result = await updateNote(note.id, patch);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onUpdated(note.id, { ...patch, updatedAt: new Date().toISOString() });
  }

  async function handleDelete() {
    if (isRecording) stopTranscribing();
    const result = await deleteNote(note.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Note deleted permanently!");
    onDeleted(note.id);
  }

  function formatMarkdown(type: "bold" | "italic" | "underline" | "strikethrough" | "h1" | "h2" | "h3" | "list-ul" | "list-ol" | "quote" | "clear") {
    const textarea = document.getElementById("note-content") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = selected;
    if (type === "bold") replacement = `**${selected}**`;
    else if (type === "italic") replacement = `*${selected}*`;
    else if (type === "underline") replacement = `<u>${selected}</u>`;
    else if (type === "strikethrough") replacement = `~~${selected}~~`;
    else if (type === "h1") replacement = `\n# ${selected}`;
    else if (type === "h2") replacement = `\n## ${selected}`;
    else if (type === "h3") replacement = `\n### ${selected}`;
    else if (type === "list-ul") replacement = `\n- ${selected}`;
    else if (type === "list-ol") replacement = `\n1. ${selected}`;
    else if (type === "quote") replacement = `\n> ${selected}`;
    else if (type === "clear") replacement = selected.replace(/[*_~<>#]/g, "");

    const nextContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(nextContent);
    save({ content: nextContent });

    // Focus and select the modified text range
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    }, 0);
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

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="flex flex-1 flex-col p-6 min-h-0 bg-[#FDFDFD] dark:bg-[#121214]">
      
      {/* Editor Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        
        {/* Left Info: Icon, Title & Pulse metadata */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-cyan-500/10 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/20">
            <BookOpen className="size-5.5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Updated {timeAgo(note.updatedAt)}
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== note.title && save({ title })}
              onKeyDown={(e) => e.key === "Enter" && title.trim() && title !== note.title && save({ title })}
              className="h-8 border-none text-xl font-bold shadow-none focus-visible:ring-0 p-0 text-neutral-800 dark:text-neutral-100 placeholder:opacity-50 truncate"
              placeholder="Title of note"
            />
          </div>
        </div>

        {/* Right Info: Badges & Deletion */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 px-2.5 py-1 rounded-full flex items-center gap-1">
            {saving ? <RefreshCw className="size-2.5 animate-spin" /> : null}
            {saving ? "Saving..." : "Saved"}
          </span>
          <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 px-2.5 py-1 rounded-full">
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
                <AlertDialogTitle>Delete &quot;{note.title}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this note. This action cannot be undone.
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

      {/* Rich Editor Toolbar */}
      <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-neutral-100/60 dark:bg-neutral-800/40 mb-4 flex-wrap shadow-2xs border border-neutral-200/40 dark:border-neutral-800/40">
        
        {/* Formatting actions group */}
        <div className="flex items-center gap-0.5">
          <button 
            onClick={() => formatMarkdown("clear")}
            className="h-7 px-2 font-mono text-[10px] text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer font-bold"
            title="Clear formatting"
          >
            T
          </button>
          
          <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
          
          <button 
            onClick={() => formatMarkdown("h1")}
            className="size-7 font-bold text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer"
            title="Heading 1"
          >
            H1
          </button>
          <button 
            onClick={() => formatMarkdown("h2")}
            className="size-7 font-bold text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer"
            title="Heading 2"
          >
            H2
          </button>
          <button 
            onClick={() => formatMarkdown("h3")}
            className="size-7 font-bold text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer"
            title="Heading 3"
          >
            H3
          </button>
          
          <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

          <button 
            onClick={() => formatMarkdown("bold")}
            className="size-7 font-bold text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer font-serif"
            title="Bold"
          >
            B
          </button>
          <button 
            onClick={() => formatMarkdown("italic")}
            className="size-7 italic text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer font-serif"
            title="Italic"
          >
            I
          </button>
          <button 
            onClick={() => formatMarkdown("underline")}
            className="size-7 underline text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer font-serif"
            title="Underline"
          >
            U
          </button>
          <button 
            onClick={() => formatMarkdown("strikethrough")}
            className="size-7 line-through text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer font-serif"
            title="Strikethrough"
          >
            S
          </button>

          <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

          <button 
            onClick={() => formatMarkdown("list-ul")}
            className="size-7 font-bold text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer"
            title="Bullet list"
          >
            •—
          </button>
          <button 
            onClick={() => formatMarkdown("list-ol")}
            className="size-7 font-bold text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer"
            title="Numbered list"
          >
            1—
          </button>
          <button 
            onClick={() => formatMarkdown("quote")}
            className="size-7 font-bold text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded border-0 bg-transparent cursor-pointer font-serif"
            title="Blockquote"
          >
            &quot;
          </button>
        </div>

        {/* Speak to Note microphone trigger button */}
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
          {isRecording ? "Stop Listening" : "Speak to Note"}
        </button>

      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-[#FCFAF7]/20 border border-neutral-100 rounded-2xl dark:bg-[#0E0E10]/20 dark:border-neutral-900/60 p-4 flex flex-col justify-between">
        <textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => content !== note.content && save({ content })}
          placeholder="Start writing your thoughts…"
          className="w-full flex-grow resize-none border-0 bg-transparent text-sm text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-0 leading-relaxed font-sans placeholder:opacity-50"
        />

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
