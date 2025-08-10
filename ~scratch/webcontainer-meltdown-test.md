<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SYSTEM OVERLOAD // FRACTAL NIGHTMARE</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #000;
      overflow: hidden;
      font-family: 'Courier New', monospace;
      cursor: none;
    }

    /* WARNING SCREEN */
    .warning {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #000;
      color: #ff0040;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-size: 1.5rem;
      text-align: center;
      padding: 2rem;
    }

    .warning button {
      margin-top: 2rem;
      padding: 1rem 2rem;
      background: #ff0040;
      color: #000;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      font-weight: bold;
      animation: pulse 0.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    /* MAIN CHAOS CONTAINER */
    .chaos-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: none;
    }

    .chaos-container.active {
      display: block;
    }

    /* FRACTAL GRID */
    .fractal-grid {
      position: absolute;
      width: 200%;
      height: 200%;
      top: -50%;
      left: -50%;
      background-image: 
        repeating-linear-gradient(0deg, #ff00ff10 0, transparent 2px, transparent 4px, #00ffff10 6px),
        repeating-linear-gradient(90deg, #ffff0010 0, transparent 2px, transparent 4px, #ff00ff10 6px);
      animation: fractalShift 0.5s linear infinite;
      mix-blend-mode: screen;
    }

    @keyframes fractalShift {
      0% { transform: translate(0, 0) scale(1) rotate(0deg); }
      25% { transform: translate(-10px, 10px) scale(1.1) rotate(90deg); }
      50% { transform: translate(10px, -10px) scale(0.9) rotate(180deg); }
      75% { transform: translate(-5px, -5px) scale(1.05) rotate(270deg); }
      100% { transform: translate(0, 0) scale(1) rotate(360deg); }
    }

    /* GLITCH LAYERS */
    .glitch-layer {
      position: absolute;
      width: 100%;
      height: 100%;
      background: linear-gradient(45deg, 
        #ff0080, #00ff88, #8800ff, #ffff00, 
        #00ffff, #ff00ff, #88ff00, #ff8800);
      background-size: 400% 400%;
      opacity: 0.1;
      mix-blend-mode: color-dodge;
      animation: glitchWave 0.3s infinite, gradientShift 2s infinite;
    }

    .glitch-layer:nth-child(2) {
      animation-delay: 0.1s;
      animation-duration: 0.4s;
      mix-blend-mode: color-burn;
    }

    .glitch-layer:nth-child(3) {
      animation-delay: 0.2s;
      animation-duration: 0.2s;
      mix-blend-mode: difference;
    }

    @keyframes glitchWave {
      0% { transform: translateX(0) scaleX(1); filter: hue-rotate(0deg); }
      20% { transform: translateX(-5px) scaleX(1.1); filter: hue-rotate(90deg); }
      40% { transform: translateX(5px) scaleX(0.9); filter: hue-rotate(180deg); }
      60% { transform: translateX(-3px) scaleX(1.05); filter: hue-rotate(270deg); }
      80% { transform: translateX(3px) scaleX(0.95); filter: hue-rotate(360deg); }
      100% { transform: translateX(0) scaleX(1); filter: hue-rotate(0deg); }
    }

    @keyframes gradientShift {
      0% { background-position: 0% 0%; }
      50% { background-position: 100% 100%; }
      100% { background-position: 0% 0%; }
    }

    /* SCANLINES */
    .scanlines {
      position: absolute;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(255, 0, 255, 0.3) 2px,
        rgba(255, 0, 255, 0.3) 4px
      );
      animation: scanlineMove 0.1s linear infinite;
      pointer-events: none;
    }

    @keyframes scanlineMove {
      0% { transform: translateY(0); }
      100% { transform: translateY(4px); }
    }

    /* RANDOM SQUARES */
    .square-storm {
      position: absolute;
      width: 100%;
      height: 100%;
    }

    .chaos-square {
      position: absolute;
      border: 1px solid;
      animation: squareChaos 0.5s infinite alternate;
    }

    @keyframes squareChaos {
      0% {
        transform: rotate(0deg) scale(1);
        opacity: 1;
      }
      100% {
        transform: rotate(180deg) scale(0.5);
        opacity: 0.3;
      }
    }

    /* TEXT CHAOS */
    .text-hell {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      flex-wrap: wrap;
      overflow: hidden;
    }

    .glitch-text {
      color: #00ff00;
      font-size: 10px;
      padding: 2px;
      animation: textGlitch 0.1s infinite;
      text-shadow: 
        2px 2px 0 #ff00ff,
        -2px -2px 0 #00ffff;
    }

    @keyframes textGlitch {
      0% { transform: skew(0deg, 0deg); }
      25% { transform: skew(5deg, -5deg); }
      50% { transform: skew(-5deg, 5deg); }
      75% { transform: skew(3deg, -3deg); }
      100% { transform: skew(0deg, 0deg); }
    }

    /* ROTATING NEON RINGS */
    .neon-ring {
      position: absolute;
      border: 2px solid;
      border-radius: 50%;
      animation: ringRotate 1s linear infinite;
    }

    @keyframes ringRotate {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(180deg) scale(1.5); }
      100% { transform: rotate(360deg) scale(1); }
    }

    /* STATIC NOISE */
    .static-noise {
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 0.05;
      animation: staticFlicker 0.05s infinite;
    }

    @keyframes staticFlicker {
      0% { opacity: 0.05; }
      50% { opacity: 0.1; }
      100% { opacity: 0.05; }
    }

    /* LIGHTNING BOLTS */
    .lightning {
      position: absolute;
      width: 2px;
      background: linear-gradient(to bottom, 
        transparent, #ffffff, #00ffff, #ffffff, transparent);
      animation: lightning 0.2s infinite;
      filter: blur(1px);
    }

    @keyframes lightning {
      0% { opacity: 0; transform: scaleY(0); }
      50% { opacity: 1; transform: scaleY(1); }
      100% { opacity: 0; transform: scaleY(0); }
    }

    /* CUSTOM CURSOR */
    .cursor-chaos {
      position: fixed;
      width: 30px;
      height: 30px;
      border: 2px solid #ff00ff;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      animation: cursorPulse 0.5s infinite;
      filter: blur(0.5px);
    }

    @keyframes cursorPulse {
      0% { transform: scale(1); border-color: #ff00ff; }
      50% { transform: scale(1.5); border-color: #00ffff; }
      100% { transform: scale(1); border-color: #ffff00; }
    }

    /* PERFORMANCE COUNTER */
    .fps-counter {
      position: fixed;
      top: 10px;
      left: 10px;
      color: #00ff00;
      font-family: monospace;
      font-size: 16px;
      z-index: 9998;
      text-shadow: 0 0 10px #00ff00;
      background: rgba(0,0,0,0.5);
      padding: 5px 10px;
      border: 1px solid #00ff00;
    }

    /* MATRIX RAIN */
    .matrix-rain {
      position: absolute;
      color: #00ff00;
      font-size: 20px;
      animation: matrixFall linear infinite;
      text-shadow: 0 0 5px #00ff00;
    }

    @keyframes matrixFall {
      0% { transform: translateY(-100%); opacity: 1; }
      100% { transform: translateY(100vh); opacity: 0; }
    }

    /* PRISMATIC OVERLAY */
    .prismatic {
      position: absolute;
      width: 100%;
      height: 100%;
      background: conic-gradient(from 0deg at 50% 50%, 
        #ff0000, #ff8800, #ffff00, #00ff00, 
        #00ffff, #0000ff, #8800ff, #ff00ff, #ff0000);
      opacity: 0.05;
      animation: prismRotate 2s linear infinite;
      mix-blend-mode: color-dodge;
    }

    @keyframes prismRotate {
      0% { transform: rotate(0deg) scale(1); }
      100% { transform: rotate(360deg) scale(1.5); }
    }
  </style>
</head>
<body>
  <!-- WARNING SCREEN -->
  <div class="warning" id="warning">
    <h1>⚠️ WARNING: EXTREME VISUAL CHAOS ⚠️</h1>
    <p>This page contains rapid flashing lights, intense animations, and extreme visual effects.</p>
    <p>NOT SUITABLE for those with photosensitive epilepsy or motion sensitivity.</p>
    <p>This WILL stress your browser and GPU.</p>
    <button onclick="unleashChaos()">ENTER THE HELLSCAPE</button>
  </div>

  <!-- CHAOS CONTAINER -->
  <div class="chaos-container" id="chaos">
    <div class="fractal-grid"></div>
    <div class="glitch-layer"></div>
    <div class="glitch-layer"></div>
    <div class="glitch-layer"></div>
    <div class="scanlines"></div>
    <div class="prismatic"></div>
    <div class="square-storm" id="squares"></div>
    <div class="text-hell" id="textHell"></div>
    <div class="static-noise" id="static"></div>
    <div class="fps-counter">FPS: <span id="fps">0</span></div>
    <div class="cursor-chaos" id="cursor"></div>
  </div>

  <script>
    let chaosActive = false;
    let animationFrameId;

    function unleashChaos() {
      document.getElementById('warning').style.display = 'none';
      document.getElementById('chaos').classList.add('active');
      chaosActive = true;
      
      generateSquares();
      generateText();
      generateNeonRings();
      generateLightning();
      generateMatrixRain();
      generateStaticNoise();
      trackCursor();
      startFPSCounter();
      
      // Add keyboard triggered chaos
      document.addEventListener('keydown', (e) => {
        if (chaosActive) {
          triggerGlitchBurst();
        }
      });
    }

    function generateSquares() {
      const container = document.getElementById('squares');
      for (let i = 0; i < 50; i++) {
        const square = document.createElement('div');
        square.className = 'chaos-square';
        square.style.width = Math.random() * 100 + 'px';
        square.style.height = Math.random() * 100 + 'px';
        square.style.left = Math.random() * 100 + '%';
        square.style.top = Math.random() * 100 + '%';
        square.style.borderColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        square.style.animationDuration = (Math.random() * 0.5 + 0.1) + 's';
        square.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(square);
      }
    }

    function generateText() {
      const container = document.getElementById('textHell');
      const texts = ['ERROR', 'SYSTEM', 'OVERLOAD', '0x00FF', 'CORRUPT', 'NULL', 'VOID', '!!!', '###', '危険', 'FATAL'];
      
      for (let i = 0; i < 200; i++) {
        const text = document.createElement('span');
        text.className = 'glitch-text';
        text.textContent = texts[Math.floor(Math.random() * texts.length)];
        text.style.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        text.style.animationDuration = (Math.random() * 0.2 + 0.05) + 's';
        container.appendChild(text);
      }
    }

    function generateNeonRings() {
      for (let i = 0; i < 20; i++) {
        const ring = document.createElement('div');
        ring.className = 'neon-ring';
        const size = Math.random() * 300 + 50;
        ring.style.width = size + 'px';
        ring.style.height = size + 'px';
        ring.style.left = Math.random() * 100 + '%';
        ring.style.top = Math.random() * 100 + '%';
        ring.style.borderColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        ring.style.boxShadow = `0 0 20px hsl(${Math.random() * 360}, 100%, 50%)`;
        ring.style.animationDuration = (Math.random() * 2 + 0.5) + 's';
        document.getElementById('chaos').appendChild(ring);
      }
    }

    function generateLightning() {
      setInterval(() => {
        if (!chaosActive) return;
        
        const lightning = document.createElement('div');
        lightning.className = 'lightning';
        lightning.style.left = Math.random() * 100 + '%';
        lightning.style.height = Math.random() * 100 + '%';
        lightning.style.animationDuration = (Math.random() * 0.3 + 0.1) + 's';
        document.getElementById('chaos').appendChild(lightning);
        
        setTimeout(() => lightning.remove(), 300);
      }, 100);
    }

    function generateMatrixRain() {
      setInterval(() => {
        if (!chaosActive) return;
        
        const matrix = document.createElement('div');
        matrix.className = 'matrix-rain';
        matrix.textContent = String.fromCharCode(0x30A0 + Math.random() * 96);
        matrix.style.left = Math.random() * 100 + '%';
        matrix.style.animationDuration = (Math.random() * 3 + 1) + 's';
        document.getElementById('chaos').appendChild(matrix);
        
        setTimeout(() => matrix.remove(), 4000);
      }, 50);
    }

    function generateStaticNoise() {
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      
      function drawStatic() {
        if (!chaosActive) return;
        
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const value = Math.random() * 255;
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
          data[i + 3] = 255;
        }
        
        ctx.putImageData(imageData, 0, 0);
        document.getElementById('static').style.background = `url(${canvas.toDataURL()})`;
        
        requestAnimationFrame(drawStatic);
      }
      
      drawStatic();
    }

    function trackCursor() {
      const cursor = document.getElementById('cursor');
      document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX - 15 + 'px';
        cursor.style.top = e.clientY - 15 + 'px';
      });
    }

    function triggerGlitchBurst() {
      document.body.style.filter = `hue-rotate(${Math.random() * 360}deg) saturate(200%) contrast(200%)`;
      setTimeout(() => {
        document.body.style.filter = '';
      }, 100);
    }

    function startFPSCounter() {
      let lastTime = performance.now();
      let frames = 0;
      
      function updateFPS() {
        if (!chaosActive) return;
        
        frames++;
        const currentTime = performance.now();
        
        if (currentTime >= lastTime + 1000) {
          document.getElementById('fps').textContent = frames;
          frames = 0;
          lastTime = currentTime;
        }
        
        animationFrameId = requestAnimationFrame(updateFPS);
      }
      
      updateFPS();
    }

    // Emergency stop - press ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        chaosActive = false;
        cancelAnimationFrame(animationFrameId);
        document.getElementById('chaos').innerHTML = '<div style="color: #00ff00; font-size: 2rem; text-align: center; margin-top: 50vh;">SYSTEM HALTED</div>';
      }
    });
  </script>
</body>
</html>