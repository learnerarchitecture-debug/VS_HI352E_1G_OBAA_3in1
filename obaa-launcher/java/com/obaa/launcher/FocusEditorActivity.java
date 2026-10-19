package com.obaa.launcher;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.widget.SeekBar;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

public class FocusEditorActivity extends Activity {
    private FocusManager focusManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_focus_editor);

        focusManager = new FocusManager(this);

        // Style selector
        View[] styleButtons = {
            findViewById(R.id.style_subtle),
            findViewById(R.id.style_bold),
            findViewById(R.id.style_minimal)
        };

        int currentStyle = FocusManager.getFocusStyle(this);
        updateStyleSelection(styleButtons, currentStyle);

        for (int i = 0; i < styleButtons.length; i++) {
            final int style = i;
            styleButtons[i].setOnClickListener(v -> {
                FocusManager fm = new FocusManager(this);
                fm.setFocusStyle(style);
                updateStyleSelection(styleButtons, style);
                fm.applyFocusStyle(findViewById(android.R.id.content));
                Toast.makeText(this, "Style updated", Toast.LENGTH_SHORT).show();
            });
        }

        // Color picker (simplified - just a few presets)
        View[] colorButtons = {
            findViewById(R.id.color_blue),
            findViewById(R.id.color_orange),
            findViewById(R.id.color_purple),
            findViewById(R.id.color_green),
            findViewById(R.id.color_red)
        };

        int currentColor = FocusManager.getFocusColor(this);
        updateColorSelection(colorButtons, currentColor);

        int[] colors = {0xFF00D4FF, 0xFFFF6B35, 0xFF9B5CFF, 0xFF00E676, 0xFFFF3D00};
        for (int i = 0; i < colorButtons.length; i++) {
            final int color = colors[i];
            colorButtons[i].setOnClickListener(v -> {
                FocusManager fm = new FocusManager(this);
                fm.setFocusColor(color);
                updateColorSelection(colorButtons, color);
                fm.applyFocusStyle(findViewById(android.R.id.content));
                Toast.makeText(this, "Color updated", Toast.LENGTH_SHORT).show();
            });
        }

        // Scale slider
        SeekBar scaleSeek = findViewById(R.id.scale_seek);
        TextView scaleValue = findViewById(R.id.scale_value);
        scaleSeek.setProgress((int) ((FocusManager.getFocusScale(this) - 1.0f) * 100));
        scaleValue.setText(String.format("%.0f%%", FocusManager.getFocusScale(this) * 100));
        scaleSeek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                float scale = 1.0f + progress / 100.0f;
                FocusManager fm = new FocusManager(FocusEditorActivity.this);
                fm.setFocusScale(scale);
                scaleValue.setText(String.format("%.0f%%", scale * 100));
                fm.applyFocusStyle(findViewById(android.R.id.content));
            }
            @Override public void onStartTrackingTouch(SeekBar seekBar) {}
            @Override public void onStopTrackingTouch(SeekBar seekBar) {}
        });

        // Glow toggle
        Switch glowSwitch = findViewById(R.id.glow_switch);
        glowSwitch.setChecked(FocusManager.isGlowEnabled(this));
        glowSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            FocusManager fm = new FocusManager(this);
            fm.setGlowEnabled(isChecked);
            fm.applyFocusStyle(findViewById(android.R.id.content));
        });
    }

    private void updateStyleSelection(View[] buttons, int selected) {
        for (int i = 0; i < buttons.length; i++) {
            buttons[i].setSelected(i == selected);
            buttons[i].setBackgroundResource(i == selected ? R.drawable.style_selected : R.drawable.style_unselected);
        }
    }

    private void updateColorSelection(View[] buttons, int currentColor) {
        int[] colors = {0xFF00D4FF, 0xFFFF6B35, 0xFF9B5CFF, 0xFF00E676, 0xFFFF3D00};
        for (int i = 0; i < buttons.length; i++) {
            buttons[i].setSelected(false);
            if (colors[i] == currentColor) {
                buttons[i].setSelected(true);
                buttons[i].setBackgroundResource(R.drawable.color_selected);
            } else {
                buttons[i].setBackgroundResource(R.drawable.color_unselected);
            }
        }
    }
}