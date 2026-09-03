export function EqOverlay() {
  return (
    <div
      className="flex items-end gap-[3px]"
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="motion-safe:animate-eq-bar motion-reduce:h-2.5 w-[3px] rounded-full bg-primary-foreground"
          style={{
            animationDelay: `${i * 0.15}s`,
            height: "10px",
          }}
        />
      ))}
    </div>
  );
}
