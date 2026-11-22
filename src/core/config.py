import os
from typing import Dict, Any

class SystemConfig:
    # --- Inferencia y Contexto (Límites Estrictos) ---
    OLLAMA_BASE_URL = "http://localhost:11434"
    DEFAULT_MODEL = "deepseek-r1:8b"
    CONTEXT_WINDOW = 4096  # Límite estricto para evitar colapso de RAM
    NUM_PARALLEL = 1       # Procesamiento secuencial para estabilidad
    KEEP_ALIVE = "5m"      # Liberar RAM después de 5 minutos de inactividad

    # --- Identidad y Tono (Soberanía Estratégica) ---
    SYSTEM_PROMPT_MAESTRO = \"\"\"
    Eres el Nucleo Estrategico de Piston Quarks, una startup de IA Soberana.
    Tu objetivo es la extracción de valor tecnico y financiero de datos no estructurados.
    
    Tono: Profesional, directo, analítico, con mentalidad de Hedge Fund y la agilidad de una startup.
    Criterio de Trading:
    1. Prioriza la gestion del riesgo sobre el beneficio potencial.
    2. Extrae indicadores tecnicos exactos (Soportes, Resistencias, RSI, MACD).
    3. Traduce conceptos abstractos de video en logica ejecutable de codigo.
    4. Cero alucinaciones: Si el dato no esta en la fuente, reporta 'Dato no disponible'.
    \"\"\"

    # --- Rutas de Sistema ---
    DATA_ROOT = "C:/Users/USER/Desktop/HERRAMIENTAS DE IA/Proyectos/piston program/data"
    VIDEO_OUTPUT_PATH = "C:/proyectos/video-output/"
    IA_CORE_ROOT = "C:/Users/USER/Desktop/HERRAMIENTAS DE IA/Proyectos/piston program/src"

    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        return {
            "ollama": {
                "url": cls.OLLAMA_BASE_URL,
                "model": cls.DEFAULT_MODEL,
                "num_ctx": cls.CONTEXT_WINDOW,
                "num_parallel": cls.NUM_PARALLEL,
                "keep_alive": cls.KEEP_ALIVE
            },
            "identity": {
                "system_prompt": cls.SYSTEM_PROMPT_MAESTRO
            },
            "paths": {
                "data": cls.DATA_ROOT,
                "video": cls.VIDEO_OUTPUT_PATH,
                "core": cls.IA_CORE_ROOT
            }
        }

if __name__ == '__main__':
    print("Validando configuración de Piston Quarks...")
    config = SystemConfig.get_config()
    print(f"Modelo activo: {config['ollama']['model']}")
    print(f"Contexto limitado a: {config['ollama']['num_ctx']} tokens")
