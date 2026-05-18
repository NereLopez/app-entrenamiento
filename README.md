# Kinetic Training App - PWA de Alto Rendimiento Analítico
![CI/CD Pipeline](https://github.com/NereLopez/app-entrenamiento.git/actions/workflows/deploy.yml/badge.svg)

<p align="center">
  <img src="public/icons/login.png" width="150" alt="Kinetic Login Screen">
</p>


**Kinetic** es una Aplicación Web Progresiva (PWA) de alto rendimiento diseñada para atletas que requieren un seguimiento biométrico, nutricional y de cargas mecánicas sin fricción. Desarrollada sobre **Angular 19**, la plataforma erradica la detección de cambios tradicional migrando a una arquitectura basada en **Signals**, logrando una reactividad de grano fino optimizada para dispositivos móviles de última generación.


### 🌓 Interfaz y Experiencia de Usuario (Mobile-First)

| Dashboard (Modo Oscuro) | Nutrición (Modo Claro) | Progreso y Análisis |
| :---: | :---: | :---: |
| ![Dashboard](public/icons/dashboard.png) | ![Nutrición](public/icons/nutricion.png) | ![Progreso](public/icons/graficos.png) |
| *Acciones rápidas e idiomas*             | *Hidratación interactiva*               | *Análisis de datos* |

La interfaz de usuario ha sido concebida bajo un estricto enfoque ergonómico en movilidad, implementando CSS3 Custom Properties para una mutación de temas adaptativa. El modo oscuro premium mitiga la fatiga ocular en salas de entrenamiento con condiciones de luz artificial complejas.

---


## 🚀 Arquitectura y Características Técnicas

### 🧠 1. Reactividad de Grano Fino (Zone.js-Less)
El núcleo analítico de la aplicación (cálculo de Metabolismo Basal BMR, calorías objetivo y reparto de macronutrientes) se articula mediante un árbol de dependencias funcionales puro con **Angular Signals** y `computed()`. Gracias a la **memorización nativa**, el sistema almacena las métricas en caché y solo computa las operaciones matemáticas si las señales origen (peso, edad, altura) sufren una mutación directa, minimizando el impacto en la CPU y optimizando el consumo de batería en smartphones.

### 📐 2. Algoritmia Temporal y Estructuras de Datos Eficientes
* **Algoritmo de Rachas (`currentStreak`):** El motor de constancia calcula la continuidad del atleta en tiempo real. Almacena el histórico de marcas temporales en una estructura **`Set`** nativa de JavaScript, permitiendo comprobaciones de existencia en tiempo constante **$O(1)$**. Un cursor temporal opera en reversa mediante un bucle `while`, viajando hacia el pasado para auditar la veracidad de la racha y blindando el sistema contra desincronizaciones horarias.
* **Pipeline Analítico del Calendario:** Para la renderización de la cuadrícula mensual, el sistema consolida múltiples documentos asíncronos de Firestore indexándolos en un objeto **`Map`**. Esto reduce el coste computacional de renderizado a $O(1)$ por casilla, inyectando al vuelo el tonelaje mecánico total y cruzando los estados de éxito nutricional a 60 FPS.

### 🎛️ 3. Captura Táctica y Formularios Polimórficos
La sesión de entrenamiento gestiona las rutinas mediante estructuras dinámicas de **`FormArray`** reactivos bidimensionales. El sistema evalúa el tipo de ejercicio en tiempo de ejecución (fuerza, peso corporal o tiempo bajo tensión) y muta la estructura del formulario aplicando validaciones específicas y alterando el DOM de forma polimórfica para eludir el uso del teclado virtual del smartphone.

### 🔊 4. Sincronización de Hardware (Web Audio API)
El temporizador de descanso integrado prescinde por completo de archivos de audio multimedia estáticos (`.mp3`), eliminando el buffering de red y reduciendo el tamaño del bundle de instalación. El sistema interactúa directamente con el hardware del dispositivo mediante la **Web Audio API**, sintetizando por código una onda sinusoidal pura a 880Hz y aplicando una envolvente de ganancia exponencial para evitar chasquidos físicos en el altavoz del teléfono.

### 📉 5. Sistema de Retención Activa (XP Decay)
Implementación de un modelo de gamificación determinista calculado en el cliente (**Edge Computing**). El algoritmo clona el flujo de datos de forma inmutable (`[...list]`), calcula los días de inactividad respecto a Firestore y, tras un periodo de gracia de 96 horas de descanso muscular, penaliza linealmente la experiencia del usuario para incentivar el engagement sin sobrecargar el backend con tareas programadas en el servidor.

### 🧭 6. Flujo Adaptativo y Route Guards Asíncronos
Incorporación de un sistema de inicio rápido (*Quick Start*). Si un usuario novel intenta acceder a herramientas analíticas avanzadas sin haber configurado sus variables biométricas, un **Route Guard asíncrono** intercepta la navegación mapeando el estado global y redirige de forma obligatoria a la pantalla de configuración, garantizando la consistencia del modelo de datos.

---

## 🛠️ Stack Tecnológico

* **Core Framework:** Angular 19 (Standalone Components, Functional Dependency Injection via `inject()`).
* **State Management:** Angular Signals & Effects.
* **Data Visualization:** Chart.js + `ng2-charts` (Renderizado dinámico diferido en el Event Loop mediante colas de tareas asíncronas).
* **Persistence & Auth:** Firebase Cloud Firestore (Modelo NoSQL desnormalizado y optimizado para lecturas móviles) + Firebase Authentication.
* **Styling & Layout:** Bootstrap 5.3 + Custom CSS Grid / Flexbox Mobile-First.
* **Internationalization:** @ngx-translate/core (Pipeline de normalización de cadenas para la coexistencia de diccionarios del sistema e inputs de usuario).
* **PWA Engine:** Angular Service Worker (`@angular/pwa`) con estrategias de cacheo prioritarias para operatividad Offline completa.

---

## 📱 Instalación (Modo PWA)

Para disfrutar de la experiencia completa en tu smartphone:
1. Escanea el **Código QR** presente en el Dashboard desde tu dispositivo móvil.
2. En iPhone (Safari): Pulsa **"Compartir"** y selecciona **"Añadir a la pantalla de inicio"**.
3. En Android (Chrome): Pulsa en el banner **"Instalar aplicación"** que aparecerá automáticamente.

---

## 🔧 Configuración en Entorno de Desarrollo

Para ejecutar el proyecto localmente:

1. Clonar el repositorio e instalar las dependencias de Node:
   ```bash
   npm install
2. Iniciar el servidor de desarrollo local:
    ```bash
    ng serve
3. Acceder al entorno a través de  http://localhost:4200


Desarrollado por Nerea Elvira López-2026. Proyecto Final de DAM







