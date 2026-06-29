export function ThemeScript() {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined') {
            try {
              // FORCE LIGHT MODE ONLY - Never sync with OS theme
              localStorage.setItem('theme', 'light');
              document.documentElement.classList.remove('dark');
              document.documentElement.style.colorScheme = 'light';
            } catch (e) {}
          }
        `,
      }}
    />
  );
}
