package com.obaa.launcher;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

public class AppLockActivity extends Activity {
    private static final String TAG = "AppLockActivity";

    private String targetPackage;
    private String enteredPin = "";
    private int pinLength = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private AppLockManager appLockManager;
    private TextView pinDots[];
    private TextView pinPrompt;
    private TextView biometricHint;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_app_lock);

        appLockManager = new AppLockManager(this);

        Intent intent = getIntent();
        targetPackage = intent.getStringExtra("package");
        if (targetPackage == null) {
            finish();
            return;
        }

        pinDots = new TextView[8];
        pinDots[0] = findViewById(R.id.pin_dot_1);
        pinDots[1] = findViewById(R.id.pin_dot_2);
        pinDots[2] = findViewById(R.id.pin_dot_3);
        pinDots[3] = findViewById(R.id.pin_dot_4);
        pinDots[4] = findViewById(R.id.pin_dot_5);
        pinDots[5] = findViewById(R.id.pin_dot_6);
        pinDots[6] = findViewById(R.id.pin_dot_7);
        pinDots[5] = findViewById(R.id.pin_dot_8);

        pinPrompt = findViewById(R.id.pin_prompt);
        biometricHint = findViewById(R.id.biometric_hint);

        AppLockManager appLockManager = new AppLockManager(this);
        if (appLockManager.isBiometricEnabled()) {
            // Try biometric first
            authenticateBiometric();
        }

        // Setup number pad
        setupNumberPad();
    }

    private void setupNumberPad() {
        int[] buttonIds = {
            R.id.btn_1, R.id.btn_2, R.id.btn_3,
            R.id.btn_4, R.id.btn_5, R.id.btn_6,
            R.id.btn_7, R.id.btn_8, R.id.btn_9,
            R.id.btn_clear, R.id.btn_0, R.id.btn_backspace
        };

        View.OnClickListener clickListener = v -> {
            int id = v.getId();
            if (id == R.id.btn_backspace) {
                if (enteredPin.length() > 0) {
                    enteredPin = enteredPin.substring(0, enteredPin.length() - 1);
                    pinLength--;
                    updatePinDots();
                }
            } else if (id == R.id.btn_clear) {
                enteredPin = "";
                pinLength = 0;
                updatePinDots();
            } else {
                int digit = 0;
                switch (v.getId()) {
                    case R.id.btn_1: digit = 1; break;
                    case R.id.btn_2: digit = 2; break;
                    case R.id.btn_3: digit = 3; break;
                    case R.id.btn_4: digit = 4; break;
                    case R.id.btn_5: digit = 5; break;
                    case R.id.btn_6: digit = 6; break;
                    case R.id.btn_7: digit = 7; break;
                    case R.id.btn_8: digit = 8; break;
                    case R.id.btn_9: digit = 9; break;
                    case R.id.btn_0: digit = 0; break;
                }
                if (enteredPin.length() < 8) {
                    enteredPin += digit;
                    pinLength++;
                    updatePinDots();
                    if (enteredPin.length() >= 4) {
                        checkPin();
                    }
                }
            }
        };

        int[] buttonIds = {R.id.btn_1, R.id.btn_2, R.id.btn_3, R.id.btn_4, R.id.btn_5, R.id.btn_6,
                R.id.btn_7, R.id.btn_8, R.id.btn_9, R.id.btn_clear, R.id.btn_0, R.id.btn_backspace};
        for (int id : buttonIds) {
            View btn = findViewById(id);
            if (btn != null) {
                btn.setOnClickListener(v -> {
                    int id = v.getId();
                    if (id == R.id.btn_backspace) {
                        if (enteredPin.length() > 0) {
                            enteredPin = enteredPin.substring(0, enteredPin.length() - 1);
                            pinLength--;
                            updatePinDots();
                        }
                    } else if (id == R.id.btn_clear) {
                        enteredPin = "";
                        pinLength = 0;
                        updatePinDots();
                    } else {
                        int digit = 0;
                        if (v.getId() == R.id.btn_1) digit = 1;
                        else if (v.getId() == R.id.btn_2) digit = 2;
                        else if (v.getId() == R.id.btn_3) digit = 3;
                        else if (v.getId() == R.id.btn_4) digit = 4;
                        else if (v.getId() == R.id.btn_5) digit = 5;
                        else if (v.getId() == R.id.btn_6) digit = 6;
                        else if (v.getId() == R.id.btn_7) digit = 7;
                        else if (v.getId() == R.id.btn_8) digit = 8;
                        else if (v.getId() == R.id.btn_9) digit = 9;
                        else if (v.getId() == R.id.btn_0) digit = 0;

                        if (enteredPin.length() < 8) {
                            enteredPin += digit;
                            pinLength++;
                            updatePinDots();
                            if (enteredPin.length() >= 4) {
                                checkPin();
                            }
                        }
                    }
                });
            }
        }
    }

    private void updatePinDots() {
        for (int i = 0; i < 8; i++) {
            if (i < enteredPin.length()) {
                pinDots[i].setText("●");
            } else {
                pinDots[i].setText("");
            }
        }
    }

    private void checkPin() {
        AppLockManager appLockManager = new AppLockManager(this);
        if (appLockManager.verifyPin(enteredPin)) {
            // Success - unlock app
            // For now, just open the app
            Intent intent = getPackageManager().getLaunchIntentForPackage(targetPackage);
            if (intent != null) {
                startActivity(intent);
            }
            finish();
        } else {
            // Wrong PIN
            enteredPin = "";
            pinLength = 0;
            updatePinDots();
            Toast.makeText(this, "Incorrect PIN", Toast.LENGTH_SHORT).show();
        }
    }
}