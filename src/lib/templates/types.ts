export type TemplateKind = "board" | "page";

export type GeneratedTask = {
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  labels?: string[];
};

export type GeneratedColumn = {
  name: string;
  tasks: GeneratedTask[];
};

export type GeneratedBoardTemplate = {
  boardName: string;
  columns: GeneratedColumn[];
};

export type GeneratedSection = {
  heading: string;
  level: 1 | 2 | 3;
  paragraph?: string;
  bullets?: string[];
};

export type GeneratedPageTemplate = {
  title: string;
  sections: GeneratedSection[];
};

export type GeneratedTemplate =
  | { kind: "board"; data: GeneratedBoardTemplate }
  | { kind: "page"; data: GeneratedPageTemplate };
