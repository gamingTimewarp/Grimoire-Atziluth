// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Disable WebKit's DMABUF renderer — GBM buffer creation fails on some
    // Wayland compositors / GPU driver combinations and produces a white screen.
    // This env var must be set before WebKit initialises (i.e. before run()).
    #[cfg(target_os = "linux")]
    {
        // SAFETY: called from main() before any threads are spawned.
        //
        // Force X11/XWayland backend — WebKit's native Wayland path triggers a
        // null-deref in its GPU process on Nvidia drivers (Fedora 43, mesa 25.x).
        // GDK_BACKEND=x11 routes rendering through XWayland, which is stable.
        // WEBKIT_DISABLE_DMABUF_RENDERER is kept as a belt-and-suspenders guard.
        unsafe {
            std::env::set_var("GDK_BACKEND", "x11");
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }
    grimoire_app_lib::run()
}
