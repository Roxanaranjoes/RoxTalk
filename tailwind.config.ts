// This line defines the Tailwind configuration object tailored for RoxTalk.
const config = { // This comment states the config customizes content paths and theme tokens.
  content: ['./src/**/*.{ts,tsx}'], // This comment ensures Tailwind scans all relevant TypeScript files.
  theme: { // This comment opens the theme customization block.
    extend: { // This comment indicates we extend the default Tailwind theme.
      backgroundImage: { // This comment defines custom gradient backgrounds reused across the UI.
        'roxtalk-card': 'linear-gradient(145deg, rgba(86, 60, 189, 0.55), rgba(255, 136, 235, 0.45))', // This comment describes the signature gradient background.
      }, // This comment closes the backgroundImage extension.
      boxShadow: { // This comment adds custom drop shadows for cards and panels.
        aurora: '0 55px 120px -35px rgba(33, 21, 92, 0.45)', // This comment provides a deep atmospheric shadow.
      }, // This comment closes the boxShadow extension.
      colors: { // This comment introduces RoxTalk specific color tokens.
        'rt-surface': 'rgba(30, 24, 54, 0.65)', // This comment defines the translucent panel surface color.
        'rt-border': 'rgba(255, 255, 255, 0.18)', // This comment defines the subtle glass border color.
      }, // This comment closes the colors extension.
    }, // This comment closes the extend block.
  }, // This comment closes the theme configuration.
  future: { // This comment enables Tailwind future flags for improved behavior.
    hoverOnlyWhenSupported: true, // This comment ensures hover styles apply only on devices that support hover.
  }, // This comment closes the future configuration block.
}; // This comment finishes the Tailwind config object.

// This line exports the configuration as the default export for Tailwind CLI usage.
export default config; // This comment allows Tailwind to read the configuration when building styles.
