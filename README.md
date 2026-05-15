# Kinetic Training App

<p align="center">
  <img src="public/icons/login.png" width="150" alt="Kinetic Login Screen">
</p>


**Kinetic** es una Aplicación Web Progresiva (PWA) diseñada para deportistas que buscan un seguimiento visual, rápido y profesional de sus entrenamientos. Desarrollada con **Angular 19**, integra análisis de datos en tiempo real y una experiencia de usuario optimizada para dispositivos móviles.

### 🌓 Interfaz y Experiencia de Usuario

| Dashboard (Modo Oscuro) | Nutrición (Modo Claro) | Progreso y Análisis |
| :---: | :---: | :---: |
| ![Dashboard](public/icons/dashboard.png) | ![Nutrición](public/icons/nutricion.png) | ![Progreso](public/icons/graficos.png) |
| *Acciones rápidas e idiomas*             | *Hidratación interactiva*               | *Análisis de datos* |
---

## 🚀 Características Principales

* **Dashboard Dinámico:** Visualización de métricas clave, historial dinámico y acceso rápido a herramientas esenciales.
* **Herramientas de Entrenamiento:** Temporizador de descanso integrado con avisos acústicos (Web Audio API) y sistema de registro rápido.
* **Gestión de Hidratación Interactiva:** Widget personalizado con visualización de "botella dinámica" que se llena en tiempo real y persiste datos mediante servicios reactivos.
* **Heatmap de Actividad:** Seguimiento visual del progreso semanal inspirado en los anillos de actividad.
* **Experiencia PWA Nativa:** Instalable, con soporte offline y optimizada para eliminar la interfaz del navegador en iOS/Android.
* **Direct QR Sync:** Sistema de enlace directo mediante un código QR para una transición fluida e instalación instantánea en dispositvos móviles.
* **Traducción Inteligente:** Arquitectura multi-idioma (Angular Translate) que permite la convivencia de claves de sistema y registros manuales de usuario sin errores de interfaz.
* **Gestión de Entrenamientos:** Sistema de carga de ejercicios y rutinas conectado a servicios reactivos.
* **Sistema de XP Dinámico(Decay System):** Algoritmo de fidelización que aplica una penalización diaria de XP basada en el historial de Firestore.
* **Modo Oscuro:** Interfaz adaptativa diseñada para entrenamientos en cualquier condición de luz.


---

## 🛠️ Stack Tecnológico

* **Framework:** [Angular 19](https://angular.dev/) (Standalone Components & Signals).
* **Gráficas:** [Chart.js](https://www.chartjs.org/) con `ng2-charts`.
* **Estilos:** Bootstrap 5.3 + CSS3 Custom Properties (Variables para temas).
* **Iconografía:** Bootstrap Icons.
* **PWA:** Angular Service Worker (`@angular/pwa`).

---

## 📱 Instalación (Modo PWA)

Para disfrutar de la experiencia completa en tu smartphone:
1. Escanea el **Código QR** presente en el Dashboard.
2. En iPhone: Pulsa **"Compartir"** y selecciona **"Añadir a la pantalla de inicio"**.
3. En Android: Pulsa en el banner **"Instalar aplicación"** que aparecerá automáticamente.

---

## 🔧 Desarrollo

Para ejecutar el proyecto localmente:

1. Instala las dependencias:
   ```bash
   npm install
2. Levantar el servidor de desarrollo:
    ```bash
    ng serve
3. Accede a http://localhost:4200


Desarrollado por Nerea Elvira López-2026. Proyecto Final de DAM







