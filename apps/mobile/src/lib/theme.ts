export const theme = {
  background: "#FFF7E8",
  surface: "#FFFCF5",
  ink: "#49382C",
  muted: "#6D5845",
  toast: "#F4BC55",
  border: "#DDCBB4",
  success: "#2F684A",
  danger: "#A43F35",
  sage: "#E8EEDC",
  buttonInk: "#49382C",
  dangerSurface: "#FCEAE1",
  crumbSurface: "#FFF0CB",
  backdrop: "#241C1666",
} as const;

export type Theme = { -readonly [Key in keyof typeof theme]: string };
