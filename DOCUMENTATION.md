# OpenAI Codex VS Code Extension - Documentación del Proyecto

## Introducción
Este repositorio contiene el código fuente y los artefactos de compilación de la extensión "Codex – OpenAI's coding agent" para Visual Studio Code (publicada por OpenAI). La extensión integra las capacidades del modelo Codex directamente en el editor, permitiendo interactuar con el agente a través de un panel lateral (webview).

## Estructura del Proyecto

### Archivos Originales
- `package.json`: Manifiesto de la extensión de VS Code. Define los comandos, atajos de teclado, configuraciones y permisos.
- `out/extension.js`: El punto de entrada principal compilado de la extensión.
- `resources/`: Iconos e imágenes utilizados por la extensión.
- `syntaxes/`: Definiciones de sintaxis para archivos `.rules` de Codex.
- `webview/`: Contiene los artefactos compilados del panel web (Webview) que se muestra en el editor. Aquí se encontraban originalmente los archivos `.js.map`.

### Carpeta `js-map` (Código Fuente Desempaquetado)
A partir de los archivos `.js.map` encontrados en `webview/assets/`, se ha desempaquetado el código fuente original (TypeScript/React) en la carpeta `js-map/`. Esta carpeta revela la arquitectura interna del frontend de la extensión:

- **`js-map/webview/assets/src/`**: Contiene el código principal de la interfaz de usuario (React).
  - Componentes principales como `main.tsx` (punto de entrada), `full-app.tsx` y manejadores de estado.
  - Implementaciones de vistas de diferencias (diff viewers) para previsualizar cambios en el código (`diff/`).
  - Gestión de rutas y componentes de la página de inicio.
- **`js-map/webview/protocol/src/`**: Define los tipos, interfaces y utilidades compartidas entre la extensión (backend) y el webview (frontend). Incluye la comunicación API (`codex-api.ts`), comandos (`codex-commands.ts`), y gestión de estado global.
- **`js-map/webview/maitai/src/`**: Una biblioteca/framework interno que provee primitivas y utilidades para el entorno de ejecución del webview.

## Funcionalidades Principales (Extraídas de `package.json`)

### Comandos de la Extensión
La extensión registra varios comandos bajo la categoría "Codex":
- `chatgpt.newChat` (Ctrl+N / Cmd+N): Inicia una nueva conversación o hilo.
- `chatgpt.implementTodo`: Permite a Codex implementar comentarios "TODO" en el código mediante CodeLens.
- `chatgpt.openSidebar`: Abre el panel lateral principal de Codex.
- `chatgpt.newCodexPanel`: Abre una nueva instancia del agente.
- `chatgpt.addToThread` / `chatgpt.addFileToThread`: Añade el código seleccionado o el archivo actual al contexto de la conversación.

### Opciones de Configuración
- `chatgpt.commentCodeLensEnabled`: Habilita botones "CodeLens" sobre los comentarios TODO para implementarlos automáticamente.
- `chatgpt.followUpQueueMode`: Controla cómo se manejan los mensajes de seguimiento (encolar, dirigir o interrumpir).
- `chatgpt.runCodexInWindowsSubsystemForLinux`: Permite ejecutar Codex dentro de WSL en Windows para mejorar la seguridad y rendimiento en modo Agente.
- `chatgpt.localeOverride`: Permite forzar el idioma de la interfaz.

## Arquitectura de Comunicación
El sistema se divide en dos partes principales:
1. **Extensión (Host):** Se ejecuta en el entorno de VS Code basado en Node.js. Maneja el acceso al sistema de archivos, la ejecución de comandos y el control de ventanas/pestañas del editor.
2. **Webview (Cliente):** Se ejecuta en un entorno de navegador seguro dentro de VS Code. Renderiza la interfaz de chat y las previsualizaciones de código usando React.

La comunicación entre el Host y el Cliente se realiza a través de un bus de mensajes (`message-bus.ts`) e invocaciones IPC (`ipc-request.ts`, `ipc-broadcast.ts`), como se puede observar en el código desempaquetado en `js-map/webview/assets/src/`.

## Proceso de Extracción de Código
Para recuperar el código fuente legible, se ejecutó un script de Node.js (`unpack-maps.js`) que recorrió recursivamente el directorio en busca de archivos `.js.map`. Cada archivo fue parseado para extraer los campos `sources` y `sourcesContent`, reconstruyendo así el árbol de directorios original en `js-map/`. Este proceso es crucial para auditorías de seguridad, depuración o estudio de la arquitectura del proyecto sin tener acceso directo al repositorio no compilado original.