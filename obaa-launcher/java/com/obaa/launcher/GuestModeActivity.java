package com.obaa.launcher;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.UserInfo;
import android.os.Bundle;
import android.os.UserManager;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

public class GuestModeActivity extends Activity {
    private GuestModeManager guestModeManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_guest_mode);

        guestModeManager = new GuestModeManager(this);

        TextView title = findViewById(R.id.title);
        TextView subtitle = findViewById(R.id.subtitle);
        Button enterGuest = findViewById(R.id.enter_guest);
        Button cancel = findViewById(R.id.cancel);

        enterGuest.setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                    .setTitle(R.string.guest_mode_warning)
                    .setPositiveButton("Continue", (d, w) -> {
                        GuestModeManager gmm = new GuestModeManager(this);
                        gmm.startGuestSession(this);
                        finish();
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
        });

        cancel.setOnClickListener(v -> finish());
    }
}