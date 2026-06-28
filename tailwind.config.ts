import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cx: {
          // Backgrounds
          bg:        "#07070f",
          surface:   "#0c0c1a",
          elevated:  "#111127",
          overlay:   "#16162e",
          // Borders
          border:    "#1c1c35",
          "border-bright": "#2a2a50",
          // Accent
          accent:    "#7b6fff",
          "accent-dim": "#5a53cc",
          "accent-muted": "#7b6fff22",
          "accent-glow":  "#7b6fff44",
          // Text
          text:      "#e2e2f0",
          "text-dim": "#8888b8",
          "text-muted": "#44447a",
          // Status
          success:   "#34d399",
          warning:   "#fbbf24",
          error:     "#f87171",
          info:      "#60a5fa",
          // Node
          node:      "#0f0f22",
          "node-hover": "#141432",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        "3xs": ["0.5rem",   { lineHeight: "0.75rem" }],
      },
      boxShadow: {
        "node":          "0 0 0 1px rgba(123,111,255,0.15), 0 4px 20px rgba(0,0,0,0.5)",
        "node-selected": "0 0 0 1.5px rgba(123,111,255,0.9), 0 0 30px rgba(123,111,255,0.2)",
        "glow-sm":       "0 0 12px rgba(123,111,255,0.25)",
        "glow":          "0 0 24px rgba(123,111,255,0.3)",
        "glow-lg":       "0 0 48px rgba(123,111,255,0.35)",
        "panel":         "1px 0 0 rgba(255,255,255,0.04) inset, -1px 0 0 rgba(0,0,0,0.3)",
        "inner-glow":    "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      animation: {
        "fade-in":      "fadeIn 0.2s ease-out",
        "slide-left":   "slideLeft 0.22s cubic-bezier(0.16,1,0.3,1)",
        "slide-right":  "slideRight 0.22s cubic-bezier(0.16,1,0.3,1)",
        "scale-in":     "scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)",
        "pulse-accent": "pulseAccent 2.5s ease-in-out infinite",
        "float":        "float 6s ease-in-out infinite",
        "spin-slow":    "spin 8s linear infinite",
        "hex-drift":    "hexDrift 20s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:      { from: { opacity: "0" }, to: { opacity: "1" } },
        slideLeft:   { from: { transform: "translateX(-16px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        slideRight:  { from: { transform: "translateX(16px)",  opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        scaleIn:     { from: { transform: "scale(0.95)", opacity: "0" }, to: { transform: "scale(1)", opacity: "1" } },
        pulseAccent: { "0%,100%": { opacity: "0.6" }, "50%": { opacity: "1" } },
        float:       { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-8px)" } },
        hexDrift:    { "0%,100%": { transform: "translate(0,0) rotate(0deg)" }, "33%": { transform: "translate(4px,-6px) rotate(1deg)" }, "66%": { transform: "translate(-3px,4px) rotate(-0.5deg)" } },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
