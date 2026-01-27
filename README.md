# Sistema de Separación Notarial (Esprint Notarial v3.0)

<div align="center">
  <img src="https://img.shields.io/badge/Status-Stable-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local-blue?style=for-the-badge" alt="Local" />
  <img src="https://img.shields.io/badge/Tech-React%20%2B%20Vite-61DAFB?style=for-the-badge" alt="React" />
</div>

## 📄 Descripción

Aplicación web moderna diseñada para automatizar la separación de libros notariales digitalizados (PDFs masivos) en actos individuales, cumpliendo estrictamente con la normativa de la **Resolución 202-2021 del Consejo de la Judicatura del Ecuador**.

Esta herramienta permite cargar libros completos (incluso archivos de +600MB), identificar automáticamente o manualmente los actos, y generar un archivo ZIP ordenado con todos los documentos separados y nombrados correctamente.

## ✨ Características Principales

### 🔒 Procesamiento 100% Local (Privacidad Total)
- Todo el análisis OCR y manipulación de PDFs se realiza en el navegador del usuario.
- **Ningún documento se sube a la nube.** Garantía absoluta de confidencialidad para la información notarial sensible.

### � Arquitectura Cliente-Servidor (Sincronización Total)
- Los usuarios se sincronizan automáticamente entre todas las máquinas de la red.
- Base de datos centralizada en **PostgreSQL**.
- Backend robusto en **Node.js/Express** para gestión de seguridad y persistencia.

### �🎨 Experiencia de Usuario "Digital Notary Glass"
- Interfaz moderna con diseño **Glassmorphism** (efectos de vidrio, desenfoques).
- Animaciones fluidas y feedback visual intuitivo.
- Modo oscuro/gradiente elegante "Violet/Indigo".

### 🚀 Potencia y Robustez
- **Soporte para Archivos Gigantes:** Algoritmo de "Carga Única" optimizado para procesar libros de más de 600MB sin agotar la memoria.
- **Generación de ZIP Resiliente:** El sistema permite descargar el paquete incluso si hay advertencias leves (OCR dudoso), bloqueando solo errores críticos (paginas superpuestas).
- **Detección de Tipos de Acto:** Soporte para los códigos oficiales:
    - **P**: Protocolos
    - **D**: Diligencias
    - **O**: Otros
    - **A**: Arriendos

## 🛠️ Tecnologías

- **Frontend:** React + Vite + TypeScript (UI Moderna)
- **Backend:** Node.js + Express (API Centralizada)
- **Base de Datos:** PostgreSQL (Persistencia de datos)
- **Containerización:** Docker & Docker Compose (Despliegue fácil)
- **OCR Engine:** Tesseract.js (Análisis local)
- **PDF Engine:** `pdf-lib` & `pdfjs-dist`

## 📦 Despliegue en Producción (Docker)

El sistema está configurado para ejecutarse mediante Docker, lo que garantiza que funcione igual en cualquier máquina.

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/jairux32/separador_notarial.git
    cd separador_notarial
    ```

2.  **Iniciar el sistema:**
    ```bash
    docker-compose up -d --build
    ```

3.  **Acceso:**
    - La aplicación estará disponible en: `http://localhost:8080` (o la IP del servidor en la red).
    - El backend (API) corre internamente pero es accesible en el puerto `3002` si es necesario.
    - La base de datos corre en el puerto `5433`.

## 📋 Normativa

Este software está diseñado para facilitar el cumplimiento de los estándares de digitalización notarial exigidos en Ecuador, específicamente la separación y nomenclatura de actos dentro de los protocolos digitalizados.

---
&copy; 2026 JG Soluciones Tecnológicas. Innovación Legal.
