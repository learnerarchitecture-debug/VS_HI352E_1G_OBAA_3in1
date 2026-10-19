package com.obaa.launcher;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.UserInfo;
import android.os.UserManager;
import android.util.Log;

import java.util.List;

public class GuestModeManager {
    private static final String TAG = "GuestModeManager";

    private final Context context;
    private final Prefs prefs;

    public GuestModeManager(Context context) {
        this.context = context;
        this.prefs = new Prefs();
    }

    public boolean isGuestModeEnabled() {
        return Prefs.guestMode(context);
    }

    public void setGuestMode(boolean enabled) {
        Prefs.setGuestMode(context, enabled);
        if (enabled) {
            enableGuestMode();
        } else {
            disableGuestMode();
        }
    }

    private void enableGuestMode() {
        // Create guest user if not exists
        UserManager userManager = (UserManager) context.getSystemService(Context.USER_SERVICE);
        if (userManager != null) {
            List<UserInfo> users = userManager.getUsers();
            boolean hasGuest = false;
            for (UserInfo user : users) {
                if (user.isGuest()) {
                    hasGuest = true;
                    break;
                }
            }
            if (!hasGuest) {
                // Create guest user
                UserInfo guest = userManager.createGuest();
                Log.d("GuestModeManager", "Created guest user: " + guest.id);
            }
        }
    }

    private void disableGuestMode() {
        UserManager userManager = (UserManager) context.getSystemService(Context.USER_SERVICE);
        if (userManager != null) {
            List<UserInfo> users = userManager.getUsers();
            for (UserInfo user : users) {
                if (user.isGuest()) {
                    userManager.removeUser(user.id);
                    Log.d("GuestModeManager", "Removed guest user: " + user.id);
                    break;
                }
            }
        }
    }

    public void startGuestSession(Activity activity) {
        if (!isGuestModeEnabled()) {
            setGuestMode(true);
        }
        UserManager userManager = (UserManager) context.getSystemService(Context.USER_SERVICE);
        if (userManager != null) {
            List<UserInfo> users = userManager.getUsers();
            for (UserInfo user : users) {
                if (user.isGuest()) {
                    Intent intent = new Intent();
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    // Switch to guest user
                    userManager.switchUser(user.id);
                    break;
                }
            }
        }
    }

    public void exitGuestMode(Activity activity) {
        setGuestMode(false);
        // Return to primary user
        UserManager userManager = (UserManager) context.getSystemService(Context.USER_SERVICE);
        if (userManager != null) {
            userManager.switchUser(UserHandle.USER_SYSTEM);
        }
    }

    public boolean isGuestUser() {
        UserManager userManager = (UserManager) context.getSystemService(Context.USER_SERVICE);
        if (userManager != null) {
            int currentUser = android.os.Process.myUserHandle().getIdentifier();
            UserInfo user = userManager.getUserInfo(currentUser);
            return user != null && user.isGuest();
        }
        return false;
    }
}