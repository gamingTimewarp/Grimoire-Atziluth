// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    setup_linux_env();

    grimoire_app_lib::run()
}

/// Set Linux-specific environment variables before WebKit initialises.
///
/// Two problems are addressed here:
///
/// 1. **DMABUF crash** — WebKit's DMA-BUF renderer fails on some Wayland +
///    GPU driver combinations. `WEBKIT_DISABLE_DMABUF_RENDERER` disables it.
///
/// 2. **COLRv1 crash (Fedora 43 / Nvidia)** — The AppImage bundles a WebKit
///    whose Skia was compiled against Ubuntu 22.04's FreeType ABI.  On Fedora
///    43 the system `libfreetype.so.6` (2.13.3) changed the COLRv1 colour-stop
///    API, causing an out-of-bounds assert inside `colrv1_configure_skpaint`
///    whenever WebKit measures or renders a COLRv1 emoji glyph (e.g. Noto
///    Color Emoji).  This fires during layout metrics — before any CSS is
///    applied — so CSS-level workarounds have no effect.
///
///    Fix: write a minimal fontconfig that includes the system config but
///    rejects known COLRv1 emoji fonts, then set FONTCONFIG_FILE to it.
///    WebKit (via fontconfig) will never select those fonts, so the broken
///    code path is never entered.  Emoji fall back to monochrome glyphs.
#[cfg(target_os = "linux")]
fn setup_linux_env() {
    // SAFETY: called from main() before any threads are spawned.
    unsafe {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    const FONTCONFIG_XML: &str = r#"<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <!-- Include the system-wide font configuration. -->
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>

  <!-- Reject COLRv1 colour emoji fonts.  The AppImage's bundled Skia was
       compiled against a different FreeType ABI than the one shipped with
       Fedora 43, causing an out-of-bounds assert in colrv1_configure_skpaint
       during glyph metric computation.  Emoji fall back to monochrome glyphs
       (e.g. Noto Emoji) which use the safe COLR v0 / bitmap path. -->
  <selectfont>
    <rejectfont>
      <pattern><patelt name="family"><string>Noto Color Emoji</string></patelt></pattern>
    </rejectfont>
  </selectfont>
  <selectfont>
    <rejectfont>
      <pattern><patelt name="family"><string>Twemoji Mozilla</string></patelt></pattern>
    </rejectfont>
  </selectfont>
  <selectfont>
    <rejectfont>
      <pattern><patelt name="family"><string>EmojiOne Color</string></patelt></pattern>
    </rejectfont>
  </selectfont>
</fontconfig>
"#;

    let path = std::env::temp_dir().join("grimoire-atziluth-fontconfig.xml");
    if std::fs::write(&path, FONTCONFIG_XML).is_ok() {
        // SAFETY: called before any threads are spawned.
        unsafe { std::env::set_var("FONTCONFIG_FILE", &path) };
    }
}
