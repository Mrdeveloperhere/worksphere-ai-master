"use client";

import { useTheme } from "next-themes";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTheme, type Theme } from "@/lib/settings/actions";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function handleChange(value: string) {
    const next = value as Theme;
    setTheme(next);
    void updateTheme(next);
  }

  return (
    <Select value={theme} onValueChange={handleChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  );
}
