/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Typography - Poppins as default
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        poppins: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },

      // Font sizes from design system
      fontSize: {
        'xs': ['10px', { lineHeight: '1.5' }],
        'sm': ['12px', { lineHeight: '1.5' }],
        'base': ['13px', { lineHeight: '1.5' }],
        'md': ['14px', { lineHeight: '1.5' }],
        'lg': ['16px', { lineHeight: '1.5' }],
        'xl': ['18px', { lineHeight: '1.2' }],
        '2xl': ['20px', { lineHeight: '1.2' }],
        '3xl': ['24px', { lineHeight: '1.2' }],
        '4xl': ['32px', { lineHeight: '1.2' }],
        '5xl': ['42px', { lineHeight: '1.02' }],
      },

      // Colors from design tokens
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: {
          DEFAULT: "hsl(var(--background))",
          subtle: "hsl(var(--background-subtle))",
          elevated: "hsl(var(--background-elevated))",
          inset: "hsl(var(--background-inset))",
        },
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
          secondary: "hsl(var(--foreground-secondary))",
          muted: "hsl(var(--foreground-muted))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          subtle: "hsl(var(--accent-subtle))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        discord: {
          DEFAULT: "hsl(var(--discord))",
          foreground: "hsl(var(--discord-foreground))",
        },
        // WoW Faction Colors
        alliance: "hsl(var(--alliance))",
        horde: "hsl(var(--horde))",
        // WoW Class Colors (for character displays)
        "class-warrior": "#C79C6E",
        "class-paladin": "#F58CBA",
        "class-hunter": "#ABD473",
        "class-rogue": "#FFF569",
        "class-priest": "#FFFFFF",
        "class-deathknight": "#C41E3A",
        "class-shaman": "#0070DE",
        "class-mage": "#69CCF0",
        "class-warlock": "#9482C9",
        "class-monk": "#00FF96",
        "class-druid": "#FF7D0A",
        "class-demonhunter": "#A330C9",
        "class-evoker": "#33937F",
      },

      // Border radius from design tokens
      borderRadius: {
        none: "0px",
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",           // var(--radius) - cards, inputs
        xl: "16px",
        "2xl": "20px",
        full: "9999px",       // Pill buttons
        // Specific pill sizes from Figma
        "pill-sm": "40px",    // Small buttons, nav items
        "pill": "52px",       // Primary buttons
        "pill-lg": "60px",    // Large buttons
      },

      // Spacing scale (extends Tailwind defaults)
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
        '13': '52px',
        '15': '60px',
      },

      // Keyframes
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "spin-pulse": {
          "0%, 100%": {
            transform: "rotate(0deg) scale(1)",
            opacity: "1"
          },
          "50%": {
            transform: "rotate(180deg) scale(1.1)",
            opacity: "0.8"
          },
        },
        "shimmer": {
          "0%": {
            transform: "translateX(-100%)"
          },
          "100%": {
            transform: "translateX(100%)"
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-in-from-top": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-bottom": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center"
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center"
          },
        },
      },

      // Animations
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "spin-pulse": "spin-pulse 2s ease-in-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "bounce-slow": "bounce 1.5s ease-in-out infinite",
        "pulse-fast": "pulse 0.3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-in-top": "slide-in-from-top 0.2s ease-out",
        "slide-in-bottom": "slide-in-from-bottom 0.2s ease-out",
        "gradient-x": "gradient-x 3s ease infinite",
      },

      // Box shadows
      boxShadow: {
        'glow-accent': '0 0 20px rgba(255, 128, 0, 0.3)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-error': '0 0 20px rgba(239, 68, 68, 0.3)',
      },

      // Transitions
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
