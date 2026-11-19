# NAFAS — Design System & Mesopotamian Creative Manifesto

## 1. Palette Specifications

| Name | Hex Code | Role & Usage | WCAG AA Ratio vs Limestone |
| :--- | :--- | :--- | :--- |
| **Midnight Ink** | `#222238` | Foundational text, headers, dark UI surfaces | 12.8:1 (AAA Pass) |
| **Mesopotamian Clay** | `#C66F50` | Signature brand recognition, decorative accents, badges | 3.5:1 (Graphic pass) |
| **Clay Dark** | `#A65339` | High-contrast CTA buttons with white text | 5.2:1 (AA Pass) |
| **Dawn Air** | `#AAB7F0` | Atmospheric badges, map highlights, light periwinkle accents | 1.8:1 (Use with dark text) |
| **River Mist** | `#D6E2E6` | Secondary card fills, borders, environmental charts | 1.3:1 (Use with dark text) |
| **Limestone** | `#F7F1E7` | Primary warm background surface across entire app | Base Canvas |
| **Neutral Slate** | `#47465F` | Subtext, muted captions, table dividers | 7.9:1 (AAA Pass) |

## 2. Typography
- **Arabic / Kurdish (RTL)**: `IBM Plex Sans Arabic`, `Cairo`, system-ui.
  - H1: 32px / 40px, bold (700)
  - H2: 24px / 32px, semibold (600)
  - Body: 16px / 26px, regular (400)
  - Caption: 13px / 18px, medium (500)
- **Latin (LTR)**: `Manrope`, `Inter`, sans-serif.

## 3. Motion Metaphors
- **Mesopotamian Breath (6-second cycle)**: Subtle scale and opacity easing applied to focal hero compositions.
- **Tigris-Euphrates River Flow**: Animated continuous SVGs representing hydrological connectivity.
- **Touch Feedback**: Micro-scale transition `active:scale-[0.98]` on all interactive buttons.
- **Accessibility**: Full override when `prefers-reduced-motion` is detected.
