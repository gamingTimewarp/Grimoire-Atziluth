package com.grimoire.atziluth

import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  // Called by Tauri/WRY after the WebView is created — enable pinch-to-zoom.
  // WRY disables zoom by default; builtInZoomControls restores it.
  // displayZoomControls = false hides the on-screen +/- buttons.
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webView.settings.builtInZoomControls = true
    webView.settings.displayZoomControls = false
  }
}
