export function ComingSoon({ feature }: { feature: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <h2 className="text-lg font-medium">{feature}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This is coming in a later phase. For now, check out Tasks / Kanban.
      </p>
    </div>
  );
}
