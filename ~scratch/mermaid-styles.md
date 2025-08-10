// CYBERPUNK MERMAID THEME
// Drop this into your mermaid.initialize() call

const cyberpunkTheme = {
  theme: 'base',
  themeVariables: {
    // Dark base with neon accents
    darkMode: true,
    background: '#0a0e27',
    primaryColor: '#00ffff',      // Cyan
    primaryTextColor: '#000000',   // Black text on cyan
    primaryBorderColor: '#00ffff',
    
    // Secondary colors - hot pink
    secondaryColor: '#ff0080',
    secondaryTextColor: '#000000',
    secondaryBorderColor: '#ff0080',
    
    // Tertiary - toxic green
    tertiaryColor: '#00ff00',
    tertiaryTextColor: '#000000',
    tertiaryBorderColor: '#00ff00',
    
    // Main font - chunky and readable
    fontFamily: '"Courier New", "Consolas", "Monaco", monospace',
    fontSize: '16px',
    
    // Background and canvas
    mainBkg: '#ff0080',           // Hot pink for main nodes
    secondBkg: '#00ffff',         // Cyan for secondary
    tertiaryBkg: '#bd00ff',       // Purple for tertiary
    
    // Text colors - always high contrast
    textColor: '#ffffff',
    nodeTextColor: '#000000',
    
    // Borders - thick and visible
    nodeBorder: '#ffffff',
    clusterBorder: '#00ffff',
    defaultLinkColor: '#00ffff',
    
    // Specific node colors
    classText: '#000000',
    fillType0: '#ff0080',    // Pink
    fillType1: '#00ffff',    // Cyan
    fillType2: '#00ff00',    // Green
    fillType3: '#bd00ff',    // Purple
    fillType4: '#ffff00',    // Yellow
    fillType5: '#ff6600',    // Orange
    fillType6: '#ff00ff',    // Magenta
    fillType7: '#00ffff',    // Cyan again
    
    // Make everything THICK
    lineWidth: 3,
    borderWidth: 3,
    
    // For flowcharts specifically
    flowchartBackground: '#0a0e27',
    nodeBackground: '#ff0080',
    nodeForeground: '#000000',
    
    // Git graph if you use it
    gitBranchLabel0: '#ff0080',
    gitBranchLabel1: '#00ffff',
    gitBranchLabel2: '#00ff00',
    gitBranchLabel3: '#bd00ff',
    gitBranchLabel4: '#ffff00',
    
    // Sequence diagrams
    actorBkg: '#ff0080',
    actorBorder: '#ffffff',
    actorTextColor: '#000000',
    actorLineColor: '#00ffff',
    signalColor: '#ffffff',
    signalTextColor: '#000000',
    
    // Labels
    labelBoxBkgColor: '#1a1a2e',
    labelBoxBorderColor: '#00ffff',
    labelTextColor: '#00ffff',
    
    // Loop and alt colors
    loopTextColor: '#00ffff',
    altSectionBkgColor: '#ff0080',
    
    // Critical options for better visibility
    edgeLabelBackground: '#1a1a2e',
    
    // Cluster colors
    clusterBkg: '#1a1a2e',
    clusterBorderColor: '#00ffff'
  },
  
  // Flowchart specific config
  flowchart: {
    nodeSpacing: 50,
    rankSpacing: 100,
    curve: 'linear',  // Sharp edges for that cyberpunk feel
    padding: 20,
    htmlLabels: true,
    defaultRenderer: 'dagre-d3'
  }
};

// How to use this in your agent:
const mermaidConfig = {
  startOnLoad: true,
  ...cyberpunkTheme,
  securityLevel: 'loose',  // If you need HTML in labels
  
  // Optional: Add custom CSS for even more control
  themeCSS: `
    .node rect {
      stroke-width: 3px !important;
      filter: drop-shadow(0 0 10px currentColor);
    }
    
    .node text {
      font-weight: 900 !important;
      font-size: 14px !important;
      text-shadow: 
        2px 2px 0px rgba(0,0,0,0.8),
        -1px -1px 0px rgba(0,0,0,0.8),
        1px -1px 0px rgba(0,0,0,0.8),
        -1px 1px 0px rgba(0,0,0,0.8);
    }
    
    .edgeLabel {
      background-color: #0a0e27 !important;
      padding: 5px !important;
      border: 2px solid #00ffff !important;
      font-weight: bold !important;
    }
    
    .flowchart-link {
      stroke-width: 3px !important;
      filter: drop-shadow(0 0 5px currentColor);
    }
    
    /* Make cluster labels pop */
    .cluster text {
      font-size: 18px !important;
      font-weight: 900 !important;
      fill: #00ffff !important;
    }
    
    /* Glow effect for that cyberpunk neon feel */
    .node.default {
      filter: drop-shadow(0 0 20px rgba(255,0,128,0.6));
    }
  `
};

// Initialize mermaid with the theme
mermaid.initialize(mermaidConfig);

// Alternative color sets if you want to switch it up:
const colorSets = {
  vaporwave: {
    primary: '#ff6ad5',    // Pink
    secondary: '#8b00ff',  // Purple
    tertiary: '#00ffff',   // Cyan
    accent: '#ffff00'      // Yellow
  },
  
  matrixGreen: {
    primary: '#00ff00',    // Bright green
    secondary: '#00cc00',  // Medium green
    tertiary: '#009900',   // Dark green
    accent: '#ffffff'      // White
  },
  
  bladeRunner: {
    primary: '#ff9500',    // Orange
    secondary: '#ff0080',  // Pink
    tertiary: '#00d4ff',   // Blue
    accent: '#ffff00'      // Yellow
  }
};