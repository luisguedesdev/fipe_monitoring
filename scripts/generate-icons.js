// Script para gerar ícones do PWA
// Execute: node scripts/generate-icons.js

const fs = require("fs");
const path = require("path");

// Tamanhos de ícones necessários
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// HTML para gerar os PNGs (abrir no navegador)
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>PWA Icon Generator</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #1a1a2e;
      color: #fff;
    }
    h1 { margin-bottom: 20px; }
    .icons { display: flex; flex-wrap: wrap; gap: 20px; }
    .icon-item {
      text-align: center;
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 10px;
    }
    canvas { display: block; margin: 0 auto 10px; }
    button {
      padding: 10px 20px;
      background: #e63946;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 10px;
    }
    button:hover { background: #d62839; }
    .instructions {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>🚗 FIPE Monitor - PWA Icon Generator</h1>
  
  <div class="instructions">
    <p>Clique em "Baixar" em cada ícone e salve na pasta <code>public/icons/</code></p>
  </div>
  
  <div class="icons" id="icons"></div>

  <script>
    const sizes = ${JSON.stringify(sizes)};
    const container = document.getElementById('icons');
    
    sizes.forEach(size => {
      const div = document.createElement('div');
      div.className = 'icon-item';
      
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#e63946');
      gradient.addColorStop(1, '#d62839');
      
      // Rounded rectangle background
      const radius = size * 0.15;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Car icon
      const scale = size / 512;
      ctx.save();
      ctx.translate(80 * scale, 140 * scale);
      
      // Car body
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.roundRect(0, 120 * scale, 352 * scale, 144 * scale, 32 * scale);
      ctx.fill();
      
      // Car top
      ctx.beginPath();
      ctx.moveTo(280 * scale, 120 * scale);
      ctx.lineTo(240 * scale, 60 * scale);
      ctx.lineTo(112 * scale, 60 * scale);
      ctx.lineTo(72 * scale, 120 * scale);
      ctx.closePath();
      ctx.fill();
      
      // Windows
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.moveTo(96 * scale, 116 * scale);
      ctx.lineTo(120 * scale, 80 * scale);
      ctx.lineTo(232 * scale, 80 * scale);
      ctx.lineTo(256 * scale, 116 * scale);
      ctx.closePath();
      ctx.fill();
      
      // Wheels
      ctx.beginPath();
      ctx.arc(80 * scale, 264 * scale, 40 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(272 * scale, 264 * scale, 40 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      // FIPE text
      ctx.fillStyle = 'white';
      ctx.font = 'bold ' + (60 * scale) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FIPE', size / 2, 430 * scale);
      
      div.appendChild(canvas);
      
      const label = document.createElement('p');
      label.textContent = size + 'x' + size;
      div.appendChild(label);
      
      const button = document.createElement('button');
      button.textContent = 'Baixar';
      button.onclick = () => {
        const link = document.createElement('a');
        link.download = 'icon-' + size + 'x' + size + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      div.appendChild(button);
      
      container.appendChild(div);
    });
  </script>
</body>
</html>
`;

const outputPath = path.join(__dirname, "..", "public", "icon-generator.html");
fs.writeFileSync(outputPath, htmlContent);
console.log("✅ Gerador de ícones criado em: public/icon-generator.html");
console.log("   Abra no navegador e baixe os ícones.");
