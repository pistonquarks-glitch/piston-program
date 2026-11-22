import { FileNode } from '../types';

export const INITIAL_FILES: FileNode[] = [
  {
    id: 'f-1',
    name: 'src',
    path: 'src',
    type: 'folder',
    children: [
      {
        id: 'f-1-1',
        name: 'App.tsx',
        path: 'src/App.tsx',
        type: 'file',
        language: 'typescript',
        content: `// OpenCode Multi-Language Core Application
import React, { useState } from 'react';

export default function App() {
  const [counter, setCounter] = useState<number>(0);
  const [tasks, setTasks] = useState<string[]>([
    'Configurar contenedor Docker',
    'Sincronizar repositorio Git',
    'Monitorear métricas de red'
  ]);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
          OpenCode Interactive App
        </h1>
        <p style={{ color: '#4b5563' }}>Ejecutando directamente en el motor web de OpenCode Studio</p>
      </header>

      <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h2>Contador de Procesos: {counter}</h2>
        <button
          onClick={() => setCounter(c => c + 1)}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          Incrementar +1
        </button>
        <button
          onClick={() => setCounter(0)}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Reiniciar
        </button>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px' }}>
        <h3>Tareas de Despliegue en Cola ({tasks.length}):</h3>
        <ul>
          {tasks.map((task, idx) => (
            <li key={idx} style={{ padding: '4px 0', color: '#374151' }}>✓ {task}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
`
      },
      {
        id: 'f-1-2',
        name: 'styles.css',
        path: 'src/styles.css',
        type: 'file',
        language: 'css',
        content: `/* OpenCode Studio Custom CSS */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #0d1117;
  color: #c9d1d9;
}

.code-highlight {
  background: rgba(37, 99, 235, 0.1);
  border-left: 3px solid #2563eb;
  padding-left: 8px;
}
`
      }
    ]
  },
  {
    id: 'f-2',
    name: 'python_analytics.py',
    path: 'python_analytics.py',
    type: 'file',
    language: 'python',
    content: `# OpenCode Studio - Python Runtime Engine
import sys
import math

def calculate_performance_metrics(samples):
    print(f"-> Analizando {len(samples)} muestras de latencia...")
    avg = sum(samples) / len(samples)
    variance = sum((x - avg) ** 2 for x in samples) / len(samples)
    std_dev = math.sqrt(variance)
    return avg, std_dev

samples = [12.4, 15.1, 11.8, 14.2, 13.9, 12.0, 16.5, 11.2]
avg, std = calculate_performance_metrics(samples)

print("--------------------------------------------------")
print(f"📊 Promedio de latencia de red: {avg:.2f} ms")
print(f"📈 Desviación estándar: {std:.2f} ms")
print("✅ Estado del sistema: Óptimo y estable")
print("--------------------------------------------------")
`
  },
  {
    id: 'f-3',
    name: 'algorithm.cpp',
    path: 'algorithm.cpp',
    type: 'file',
    language: 'cpp',
    content: `// OpenCode Studio - C++ High Performance Engine
#include <iostream>
#include <vector>
#include <numeric>

class DataPipeline {
public:
    void process_stream(const std::vector<int>& data) {
        std::cout << "[C++ Engine] Procesando paquete de datos..." << std::endl;
        long long sum = 0;
        for (int val : data) {
            sum += val * 2;
        }
        std::cout << "✔ Rendimiento optimizado. Total acumulado: " << sum << std::endl;
    }
};

int main() {
    DataPipeline pipeline;
    std::vector<int> stream = {100, 250, 400, 850, 1200};
    pipeline.process_stream(stream);
    return 0;
}
`
  },
  {
    id: 'f-4',
    name: 'systems.rs',
    path: 'systems.rs',
    type: 'file',
    language: 'rust',
    content: `// OpenCode Studio - Rust Memory Safe Runtime
fn main() {
    println!("[Rust Engine] Verificando integridad de código fuente...");
    let buffer_size: usize = 1024 * 64;
    let sync_status = true;

    if sync_status {
        println!("🔒 Checksum hash verificado correctamente [OK]");
        println!("🚀 Capacidad de búfer asignada: {} bytes", buffer_size);
    } else {
        println!("⚠️ Advertencia: Discrepancia detectada en respaldo");
    }
}
`
  },
  {
    id: 'f-5',
    name: 'Dockerfile',
    path: 'Dockerfile',
    type: 'file',
    language: 'dockerfile',
    content: `# OpenCode Studio Cloud Run Container Spec
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
`
  },
  {
    id: 'f-6',
    name: 'package.json',
    path: 'package.json',
    type: 'file',
    language: 'json',
    content: `{
  "name": "opencode-studio-app",
  "version": "2.4.0",
  "private": true,
  "dependencies": {
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "motion": "^12.23.24",
    "lucide-react": "^0.546.0"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "vite": "^6.2.3"
  }
}
`
  },
  {
    id: 'f-7',
    name: 'README.md',
    path: 'README.md',
    type: 'file',
    language: 'markdown',
    content: `# 🚀 OpenCode Studio - Entorno IDE Multi-lenguaje Cloud

Bienvenido a **OpenCode Studio**, la plataforma integrada de desarrollo web de alto rendimiento.

## 🌟 Características Integradas:
- 💻 **Editor e Intérprete Multi-lenguaje**: TypeScript, Python, C++, Rust, HTML/CSS.
- ⚡ **Compilador y Ejecución en Vivo**: Vista previa interactiva de la aplicación e intérprete de consola.
- 👥 **Colaboración en Tiempo Real**: Edición simultánea, presencia de usuarios con cursores activos y chat de equipo.
- 🌿 **Git Source Control**: Diff visual línea por línea, commits, historial, ramas y restauración segura.
- 🛡️ **Respaldo Automático en Nube**: Snapshot automático cada 15s con verificación de integridad checksum.
- 🐳 **Contenedores y CI/CD**: Despliegue en Cloud Run / Docker con pipelines automatizados.
- 📊 **Monitoreo & Diagnóstico Predictivo IA**: Telemetría de CPU/Memoria y autocorrección de errores con Gemini.
`
  }
];
