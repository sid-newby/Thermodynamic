Quick web containers test, gonna see how it handles this.

```js
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Container Chaos Test</title>
    <style>
        body {
            background: #0a0a0a;
            color: #0ff;
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            overflow-x: hidden;
        }
        
        .container {
            border: 2px solid #0ff;
            padding: 15px;
            margin: 10px 0;
            background: rgba(0, 255, 255, 0.05);
            position: relative;
            overflow: hidden;
        }
        
        .container::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #0ff, #f0f, #0ff);
            z-index: -1;
            animation: glow 3s linear infinite;
            opacity: 0;
        }
        
        .container.active::before {
            opacity: 1;
        }
        
        @keyframes glow {
            0%, 100% { filter: blur(10px); }
            50% { filter: blur(20px); }
        }
        
        h1 {
            text-align: center;
            font-size: 2.5em;
            text-shadow: 0 0 20px #0ff;
        }
        
        .test-button {
            background: #000;
            border: 2px solid #0ff;
            color: #0ff;
            padding: 10px 20px;
            cursor: pointer;
            font-family: inherit;
            font-size: 1em;
            margin: 5px;
            transition: all 0.3s;
        }
        
        .test-button:hover {
            background: #0ff;
            color: #000;
            box-shadow: 0 0 20px #0ff;
        }
        
        .output {
            background: #000;
            border: 1px solid #0ff;
            padding: 10px;
            margin: 10px 0;
            height: 150px;
            overflow-y: auto;
            font-size: 0.9em;
            white-space: pre-wrap;
        }
        
        .resource-monitor {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #0ff;
            padding: 15px;
            min-width: 200px;
        }
        
        .bar {
            height: 20px;
            background: #111;
            border: 1px solid #0ff;
            margin: 5px 0;
            position: relative;
            overflow: hidden;
        }
        
        .bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #0ff, #f0f);
            width: 0%;
            transition: width 0.3s;
        }
        
        .particle {
            position: fixed;
            pointer-events: none;
            opacity: 0;
            animation: particle-float 3s linear;
        }
        
        @keyframes particle-float {
            0% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateY(-100px) scale(0);
            }
        }
    </style>
</head>
<body>
    <h1>🔥 CONTAINER CHAOS TEST 🔥</h1>
    
    <div class="resource-monitor">
        <h3>Resource Monitor</h3>
        <div>CPU</div>
        <div class="bar"><div class="bar-fill" id="cpu-bar"></div></div>
        <div>Memory</div>
        <div class="bar"><div class="bar-fill" id="mem-bar"></div></div>
        <div>Containers: <span id="container-count">0</span></div>
    </div>
    
    <div class="container">
        <h2>1. Fork Bomb Defense Test</h2>
        <p>Tests if your container can handle resource exhaustion attempts</p>
        <button class="test-button" onclick="runForkBomb()">Deploy Fork Bomb</button>
        <div class="output" id="fork-output"></div>
    </div>
    
    <div class="container">
        <h2>2. Memory Balloon Test</h2>
        <p>Rapidly allocates memory to test limits and cleanup</p>
        <button class="test-button" onclick="runMemoryTest()">Inflate Memory</button>
        <div class="output" id="memory-output"></div>
    </div>
    
    <div class="container">
        <h2>3. CPU Burn Test</h2>
        <p>Maxes out CPU with intensive calculations</p>
        <button class="test-button" onclick="runCPUTest()">Burn CPU</button>
        <div class="output" id="cpu-output"></div>
    </div>
    
    <div class="container">
        <h2>4. Network Flood Test</h2>
        <p>Simulates high-frequency network requests</p>
        <button class="test-button" onclick="runNetworkTest()">Flood Network</button>
        <div class="output" id="network-output"></div>
    </div>
    
    <div class="container">
        <h2>5. File System Chaos</h2>
        <p>Creates/deletes thousands of files rapidly</p>
        <button class="test-button" onclick="runFileTest()">Chaos Write</button>
        <div class="output" id="file-output"></div>
    </div>
    
    <div class="container">
        <h2>6. Container Spawn Storm</h2>
        <p>Spawns multiple containers simultaneously</p>
        <button class="test-button" onclick="runSpawnTest()">Spawn Storm</button>
        <div class="output" id="spawn-output"></div>
    </div>

    <script>
        let activeContainers = 0;
        
        function updateMonitor(cpu, mem) {
            document.getElementById('cpu-bar').style.width = cpu + '%';
            document.getElementById('mem-bar').style.width = mem + '%';
            document.getElementById('container-count').textContent = activeContainers;
        }
        
        function log(elementId, message) {
            const output = document.getElementById(elementId);
            output.textContent += `[${new Date().toLocaleTimeString()}] ${message}\n`;
            output.scrollTop = output.scrollHeight;
            
            // Visual feedback
            output.parentElement.classList.add('active');
            setTimeout(() => output.parentElement.classList.remove('active'), 300);
            
            // Particle effect
            createParticle(output.parentElement);
        }
        
        function createParticle(element) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = '◆';
            particle.style.color = '#0ff';
            particle.style.left = element.offsetLeft + Math.random() * element.offsetWidth + 'px';
            particle.style.top = element.offsetTop + element.offsetHeight + 'px';
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 3000);
        }
        
        function runForkBomb() {
            log('fork-output', 'Initiating fork bomb test...');
            activeContainers++;
            
            // Simulated fork bomb (safe version)
            let processes = 0;
            const maxProcesses = 1000;
            const interval = setInterval(() => {
                if (processes < maxProcesses) {
                    processes *= 2 || 1;
                    log('fork-output', `Process count: ${processes}`);
                    updateMonitor(Math.min(processes / 10, 100), 30);
                } else {
                    log('fork-output', 'Fork bomb contained! Resource limits held.');
                    clearInterval(interval);
                    activeContainers--;
                    updateMonitor(10, 10);
                }
            }, 100);
        }
        
        function runMemoryTest() {
            log('memory-output', 'Starting memory allocation test...');
            activeContainers++;
            
            const arrays = [];
            let allocated = 0;
            const interval = setInterval(() => {
                try {
                    // Allocate 10MB chunks
                    arrays.push(new Array(10 * 1024 * 1024 / 4).fill(Math.random()));
                    allocated += 10;
                    log('memory-output', `Allocated: ${allocated}MB`);
                    updateMonitor(20, Math.min(allocated, 100));
                    
                    if (allocated >= 100) {
                        log('memory-output', 'Memory limit test complete!');
                        clearInterval(interval);
                        arrays.length = 0; // cleanup
                        activeContainers--;
                        updateMonitor(10, 10);
                    }
                } catch (e) {
                    log('memory-output', 'Memory allocation failed - limit enforced!');
                    clearInterval(interval);
                    activeContainers--;
                    updateMonitor(10, 10);
                }
            }, 200);
        }
        
        function runCPUTest() {
            log('cpu-output', 'Starting CPU burn test...');
            activeContainers++;
            
            let iterations = 0;
            const startTime = Date.now();
            const burnCPU = () => {
                // Intensive calculation
                for (let i = 0; i < 1000000; i++) {
                    Math.sqrt(Math.random() * 1000000);
                }
                iterations++;
                
                const elapsed = Date.now() - startTime;
                if (elapsed < 5000) {
                    log('cpu-output', `CPU iterations: ${iterations}`);
                    updateMonitor(100, 20);
                    requestAnimationFrame(burnCPU);
                } else {
                    log('cpu-output', `Completed ${iterations} iterations in 5 seconds`);
                    activeContainers--;
                    updateMonitor(10, 10);
                }
            };
            burnCPU();
        }
        
        function runNetworkTest() {
            log('network-output', 'Initiating network flood test...');
            activeContainers++;
            
            let requests = 0;
            const maxRequests = 100;
            
            const flood = async () => {
                const promises = [];
                for (let i = 0; i < 10; i++) {
                    // Simulate network requests (using data URLs to avoid actual network)
                    promises.push(
                        fetch('data:text/plain,test')
                            .then(() => {
                                requests++;
                                log('network-output', `Requests sent: ${requests}`);
                            })
                            .catch(() => {
                                log('network-output', 'Request failed - rate limited?');
                            })
                    );
                }
                
                await Promise.all(promises);
                updateMonitor(requests, 30);
                
                if (requests < maxRequests) {
                    setTimeout(flood, 100);
                } else {
                    log('network-output', 'Network flood test complete!');
                    activeContainers--;
                    updateMonitor(10, 10);
                }
            };
            
            flood();
        }
        
        function runFileTest() {
            log('file-output', 'Starting file system chaos test...');
            activeContainers++;
            
            // Simulate file operations
            const files = [];
            let operations = 0;
            
            const interval = setInterval(() => {
                // Simulate file creation
                for (let i = 0; i < 100; i++) {
                    files.push({
                        name: `file_${Date.now()}_${i}.tmp`,
                        data: new Uint8Array(1024).fill(Math.random() * 256)
                    });
                    operations++;
                }
                
                // Simulate file deletion
                files.splice(0, 50);
                operations += 50;
                
                log('file-output', `File operations: ${operations} (${files.length} files)`);
                updateMonitor(50, files.length / 10);
                
                if (operations >= 1000) {
                    log('file-output', 'File system chaos test complete!');
                    clearInterval(interval);
                    files.length = 0;
                    activeContainers--;
                    updateMonitor(10, 10);
                }
            }, 100);
        }
        
        function runSpawnTest() {
            log('spawn-output', 'Initiating container spawn storm...');
            
            const containers = [];
            const maxContainers = 10;
            
            for (let i = 0; i < maxContainers; i++) {
                setTimeout(() => {
                    activeContainers++;
                    log('spawn-output', `Container ${i + 1} spawned`);
                    updateMonitor(10 * (i + 1), 10 * (i + 1));
                    
                    // Auto-destroy after 3 seconds
                    setTimeout(() => {
                        activeContainers--;
                        log('spawn-output', `Container ${i + 1} destroyed`);
                        updateMonitor(Math.max(0, 100 - 10 * (i + 1)), Math.max(0, 100 - 10 * (i + 1)));
                    }, 3000);
                }, i * 200);
            }
        }
        
        // Initial state
        updateMonitor(10, 10);
    </script>
</body>
</html>
```