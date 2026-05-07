# Music Assistant Control - Vibe Project

Una extensión de GNOME Shell para controlar reproductores específicos de **Music Assistant** directamente desde el panel superior.

## Características

- 🎵 **Control de reproducción**: Play/Pausa, anterior y siguiente.
- 🔊 **Control de volumen**: Ajusta el volumen directamente desde el menú.
- 🖼️ **Carátula del álbum**: Visualización en tiempo real del arte del álbum.
- 🏷️ **Título dinámico**: Título de la canción con desplazamiento (scrolling) en el panel.
- 🚀 **Acceso rápido**: Haz clic en la carátula para abrir la interfaz de Music Assistant en tu navegador o como una PWA personalizada.

## Configuración

Para que la extensión funcione correctamente, debes configurar los siguientes parámetros en las preferencias de la extensión usando el comando: `gnome-extensions prefs ma-control@caralacm.github.com`.

### 1. Obtener el Auth Token

Para conectar con la API de Music Assistant de forma segura:

1. Abre la interfaz de **Music Assistant**.
2. Ve al menú de **Settings** (Ajustes).
3. Selecciona **User management** (Gestión de usuarios).
4. Haz clic en el botón de los **tres puntos** vertical al lado de tu usuario.
5. Selecciona **Manage access tokens** (Gestionar tokens de acceso).
6. Haz clic en **Create new one** (Crear nuevo).
7. Copia el token generado y pégalo en el campo **Auth Token** de la extensión.

### 2. Configurar el Custom Command (PWA)

Si prefieres que la interfaz se abra como una aplicación independiente (PWA) en lugar de una pestaña del navegador, sigue estos pasos para obtener el comando correcto:

1. Localiza el archivo `.desktop` de tu PWA. Normalmente se encuentran en:
   `~/.local/share/applications/`
2. Abre el archivo correspondiente (ej. `chrome-xxx-Default.desktop` o `brave-xxx-Default.desktop`) con un editor de texto.
3. Busca la línea que comienza con `Exec=`.
4. Copia todo el contenido después de `Exec=` hasta el final de la línea.
   - _Ejemplo:_ `brave-browser --profile-directory=Default --app-id=abcdefghijklmnop...`
5. Activa la opción **Open with Custom Command (PWA)** en la configuración y pega el comando en **Custom Command**.

## Instalación

1. Clona este repositorio en tu carpeta de extensiones:
   ```bash
   git clone https://github.com/caralacm/ma-gnome-extension.git ~/.local/share/gnome-shell/extensions/ma-control@caralacm.github.com
   ```
2. Reinicia GNOME Shell (Alt+F2, escribe `r` y pulsa Enter en X11, o cierra sesión y vuelve a entrar en Wayland).
3. Habilita la extensión usando **Extensiones** de GNOME o **Manejador de Extensiones**.
