package com.classicfc.games;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.pm.ActivityInfo;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;

public class MainActivity extends BridgeActivity {
    private long lastBackPress = 0L;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
        getBridge().getWebView().addJavascriptInterface(new OrientationBridge(), "NativeOrientation");
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                long now = System.currentTimeMillis();
                if (now - lastBackPress < 2000L) {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    return;
                }
                lastBackPress = now;
                Toast.makeText(MainActivity.this, "再次侧滑或返回即可退出", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private class OrientationBridge {
        @JavascriptInterface
        public void set(String orientation) {
            runOnUiThread(() -> setRequestedOrientation(
                "landscape".equals(orientation)
                    ? ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                    : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            ));
        }
    }
}
