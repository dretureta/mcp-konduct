# mcp-konduct Dashboard Design System

Generated: 2026-03-25
Status: **IMPLEMENTED (Phase 4)**

## Core Philosophy
A professional, real-time operations dashboard for managing Model Context Protocol (MCP) servers. The design prioritizes data density, system status clarity, and rapid interaction.

## Visual Language
- **Style:** Modern "OLED" Dark Mode / Professional Light Mode.
- **Theme:** Indigo + Pink (Real-Time Ops).
- **Icons:** Lucide-react (Vector SVG only, **NO EMOJIS**).
- **Typography:** Fira Sans (Inter-like readability) / Fira Code (Monospaced data).

## Color Tokens (Tailwind)
| Token | Light Hex | Dark Hex | Purpose |
|-------|-----------|----------|---------|
| `primary` | `#6366f1` (Indigo-500) | `#818cf8` (Indigo-400) | Primary actions, branding |
| `accent` | `#ec4899` (Pink-500) | `#f472b6` (Pink-400) | Secondary emphasis, highlights |
| `surface` | `#ffffff` | `#0f172a` (Slate-900) | Cards, panels |
| `background` | `#f8fafc` (Slate-50) | `#020617` (Slate-950) | App background |
| `success` | `#10b981` (Emerald-500) | `#34d399` (Emerald-400) | Online status, successful logs |
| `danger` | `#ef4444` (Rose-500) | `#fb7185` (Rose-400) | Errors, destructive actions |

## Component Standards (Atomic)

### 1. Buttons (`Button.tsx`)
- **Radius:** `rounded-xl` (12px)
- **Transition:** `duration-200 ease-in-out`
- **Variants:** Primary, Secondary, Danger, Ghost, Outline.
- **States:** Hover (scale 102%, shadow-lg), Active (scale 95%), Disabled (opacity 50%).

### 2. Cards (`Card.tsx`)
- **Radius:** `rounded-2xl` (16px)
- **Border:** `1px` (Slate-200 light / Slate-800 dark)
- **Shadow:** `shadow-sm` base, `shadow-lg` on hover.

### 3. Badges (`Badge.tsx`)
- **Style:** Pill-shaped, semi-transparent background with high-contrast text.
- **Variants:** Success (Online), Danger (Error), Secondary (Disabled/ID), Primary (Active).

### 4. Inputs (`Input.tsx`)
- **Border:** `2px` for better definition.
- **Focus:** `border-primary` with `ring-4 ring-primary/10`.

## UX Guidelines
- **Real-Time Feedback:** All async actions (Add Server, Toggle Tool) must show a loading spinner in the button.
- **Empty States:** Every list (Servers, Tools, Projects, Logs) must provide an `EmptyState` component with a relevant icon and "Call to Action".
- **Tooltips:** Every icon-only button must have a `Tooltip` explaining its function.
- **Animations:** Use `animate-in fade-in slide-in-from-bottom-4` for page transitions.

## Pre-Delivery Checklist (CRITICAL)
- [x] No emojis used as icons.
- [x] Light/Dark contrast ratios meet WCAG AA (4.5:1).
- [x] Touch targets are comfortable (min 40px height for buttons).
- [x] Responsive layout tested for 375px (Mobile) and 1440px (Desktop).
- [x] `npm run build` succeeds with zero type errors.
