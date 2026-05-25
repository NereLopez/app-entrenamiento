# Kinetic Training App - Fitness Tracking PWA 
![CI/CD Pipeline](https://github.com/NereLopez/app-entrenamiento/actions/workflows/deploy.yml/badge.svg?branch=master)

<p align="center">
  <img src="public/icons/login.png" width="150" alt="Kinetic Login Screen">
</p>


**Kinetic** es una Aplicación Web Progresiva (PWA) desarrollada con **Angular 19** y **Firebase** para el seguimiento de entrenamientos, nutrición y progreso físico.
La aplicación permite registrar rutinas, analizar estadísticas, controlar objetivos nutricionales y utilizar la app incluso sin conexión gracias al soporte offline.

---

## 🌐 Demo en Vivo

> 💡 **¡Pruébala sin instalar nada!** Accede directamente a la aplicación web optimizada desde tu navegador:
> 👉 [**Despliegue en producción en Firebase Hosting**](https://gym-workout-df0c6.firebaseapp.com)

---


### 🌓 Interfaz y Experiencia de Usuario (Mobile-First)

| Dashboard (Modo Oscuro) | Nutrición (Modo Claro) | Progreso y Análisis |
| :---: | :---: | :---: |
| ![Dashboard](public/icons/dashboard.png) | ![Nutrición](public/icons/nutricion.png) | ![Progreso](public/icons/graficos.png) |
| *Acciones rápidas e idiomas*             | *Hidratación interactiva*               | *Análisis de datos* |

La interfaz está diseñada con un enfoque mobile-first, priorizando la experiencia en smartphones mediante diseño responsive, soporte offline y modo oscuro.

---

## 🚀 Arquitectura y Características 

- **Autenticación segura:** Registro e inicio de sesión gestionado con Firebase Authentication.
- **Rendimiento deportivo:** Seguimiento detallado de entrenamientos, ejercicios y sistema de rachas (gamificación).
- **Control nutricional:** Registro diario de alimentos, cálculo automatizado de calorías y macronutrientes.
- **Visualización de datos:** Dashboard interactivo con gráficas de evolución física y estadísticas.
- **Formularios dinámicos:** Adaptabilidad de campos en tiempo real según el tipo de ejercicio.
- **Experiencia Nativa (PWA):** Soporte offline gracias a Service Workers e instalación directa en el dispositivo.

---

## 🛠️ Stack Tecnológico

* **Frontend:** 

    - **`Angular 19`**
    - **`TypeScript`**
    - **`Angular Signals`**
    - **`RxJS`**
    - **`Bootstrap 5`**

* **Backend y base de datos:** 

    - **`Firebase Authentication`**
    - **`Cloud Firestore`**

* **Visualization y PWA:** 

    - **`Chart.js`** 
    - **`ng2-charts`**
    - **`Angular Service Worker`** 

---

## 📂 Estructura del Proyecto

El proyecto está organizado bajo una arquitectura orientada a características (*Feature-driven architecture*), manteniendo una separación limpia entre la lógica de negocio, las vistas y los modelos de datos:

- `auth/` ──> Gestión de inicio de sesión, registro y guardianes de rutas (`guards`).
- `features/` ──> Módulos funcionales de la aplicación (Dashboard, Nutrición, Entrenamientos).
- `models/` ──> Interfaces y tipados de TypeScript para asegurar la consistencia de los datos.
- `services/` ──> Servicios globales inyectables para la comunicación con Firebase y lógica compartida.

---

## 💡 Aspectos técnicos destacados

### 🧠 Estado reactivo con Angular Signals
Migración conceptual hacia el nuevo paradigma de Angular. Utilizo `signal()` para el estado síncrono y `computed()` para optimizar el rendimiento en cálculos derivados (como el metabolismo basal y objetivos nutricionales diarios) evitando re-renderizados innecesarios.

### 🎛️ Formularios dinámicos
Para la creación de rutinas flexibles, implementé **`FormArray`** (Reactive Forms). Esto permite al usuario añadir o eliminar series y ejercicios de forma dinámica, manteniendo la validación de datos en tiempo real.

### 🔊 Optimización de datos
Uso eficiente de estructuras como `Set` y `Map` en lugar de arrays convencionales para reducir la complejidad temporal ($O(1)$ vs $O(n)$) al calcular las rachas de asistencia y agrupar datos del calendario.

### 🧭 Experiencia mobile-first

- La aplicación fue diseñada principalmente para smartphones, incluyendo:

  - Navegación táctil
  - Instalación como app
  - Soporte offline
  - Modo oscuro
  - Idiomas español e inglés

## 📱 Instalación (Modo PWA)

Para disfrutar de la experiencia completa en tu smartphone:

1. **Escanea el QR:**
<img src="public/icons/kinetic-app.jpg" alt="Código QR" width="100" />
2. En iPhone (Safari): Pulsa **"Compartir"** y selecciona **"Añadir a la pantalla de inicio"**.
3. En Android (Chrome): Pulsa en el banner **"Instalar aplicación"** que aparecerá automáticamente.

---

## 🔧 Configuración en Entorno de Desarrollo

Para ejecutar el proyecto localmente:

1. Clonar el repositorio e instalar las dependencias de Node:
   ```bash
   npm install
   ```
2. Iniciar el servidor de desarrollo local:
    ```bash
    ng serve
    ```
3. Acceder al entorno:
    ```bash
    http://localhost:4200
    ```
---

## 📚 Aprendizajes con este proyecto

- Arquitectura moderna en Angular.
- Gestión reactiva del estado con Signals.
- Formularios dinámicos con FormArray.
- Optimización de renderizado y manejo eficiente de datos.
- Conectar de forma eficiente el cliente con servicios Serverless (Firebase).
- Diseñar pensando en el usuario final.
- Desarrollo de Progressive Web Apps (PWA).

---

## 🔮 Próximas mejoras

- [ ] Creación de un Backend propio robusto utilizando NestJS (TypeScript).

- [ ] Migración de la base de datos NoSQL a Relacional con PostgreSQL.

- [ ] Implementación de roles de usuario (Usuario final / Entrenador).

- [ ] Cobertura de Testing unitario con Jasmine/Karma o Jest.

- [ ] Contenerización con Docker y despliegue automatizado.

---

Desarrollado por Nerea Elvira López 2026. Proyecto Final de DAM.

