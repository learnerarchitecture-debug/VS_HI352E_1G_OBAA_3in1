package com.obaa.launcher;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class FirewallManager {
    private static final String TAG = "FirewallManager";

    private final Context context;
    private final Prefs prefs;
    private final PackageManager pm;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private VpnService vpnService;
    private ParcelFileDescriptor vpnInterface;
    private final Set<String> blockedApps = new HashSet<>();
    private boolean vpnActive = false;
    private Thread vpnThread;

    public FirewallManager(Context context) {
        this.context = context;
        this.prefs = new Prefs();
        this.pm = context.getPackageManager();
    }

    public boolean isFirewallEnabled() {
        return Prefs.firewallEnabled(context);
    }

    public void setFirewallEnabled(boolean enabled) {
        Prefs.setFirewallEnabled(context, enabled);
        if (enabled) {
            enableFirewall();
        } else {
            disableFirewall();
        }
    }

    public Set<String> getBlockedApps() {
        String apps = Prefs.firewallApps(context);
        if (apps.isEmpty()) return new HashSet<>();
        String[] parts = apps.split(",");
        Set<String> set = new HashSet<>();
        for (String pkg : parts) {
            if (!pkg.isEmpty()) set.add(pkg);
        }
        return set;
    }

    public void setBlockedApps(Set<String> packages) {
        StringBuilder sb = new StringBuilder();
        for (String pkg : packages) {
            if (sb.length() > 0) sb.append(",");
            sb.append(pkg);
        }
        Prefs.setFirewallApps(context, sb.toString());
    }

    public void addBlockedApp(String packageName) {
        Set<String> blocked = getBlockedApps();
        blocked.add(packageName);
        setBlockedApps(blocked);
    }

    public void removeBlockedApp(String packageName) {
        Set<String> blocked = getBlockedApps();
        blocked.remove(packageName);
        setBlockedApps(blocked);
    }

    public boolean isAppBlocked(String packageName) {
        return getBlockedApps().contains(packageName);
    }

    public void enableFirewall() {
        if (vpnActive) return;
        startVpnService();
    }

    public void disableFirewall() {
        if (!vpnActive) return;
        stopVpnService();
    }

    private void startVpnService() {
        Intent intent = VpnService.prepare(context);
        if (intent != null) {
            // Need user permission - would need to be called from Activity
            return;
        }
        // Start VPN service
        Intent vpnIntent = new Intent(context, FirewallVpnService.class);
        context.startService(vpnIntent);
        vpnActive = true;
    }

    private void stopVpnService() {
        Intent intent = new Intent(context, FirewallVpnService.class);
        context.stopService(intent);
        vpnActive = false;
    }

    public boolean isVpnActive() {
        return vpnActive;
    }

    public List<String> getInstalledApps() {
        List<String> apps = new ArrayList<>();
        List<ApplicationInfo> appsList = pm.getInstalledApplications(PackageManager.GET_META_DATA);
        for (ApplicationInfo app : appsList) {
            if ((app.flags & ApplicationInfo.FLAG_SYSTEM) == 0) {
                apps.add(app.packageName);
            }
        }
        return apps;
    }

    // VPN Service implementation
    public static class FirewallVpnService extends VpnService {
        private static final String TAG = "FirewallVpnService";
        private Thread vpnThread;
        private ParcelFileDescriptor vpnInterface;
        private Set<String> blockedApps = new HashSet<>();

        @Override
        public int onStartCommand(Intent intent, int flags, int startId) {
            if (vpnInterface != null) return START_STICKY;

            Builder builder = new Builder();
            builder.setSession("OBAA Firewall")
                   .addDnsServer("8.8.8.8")
                   .addDnsServer("1.1.1.1")
                   .addRoute("0.0.0.0", 0); // All traffic

            try {
                vpnInterface = establish(vpnInterface);
                startVpnThread();
            } catch (Exception e) {
                Log.e("FirewallVpnService", "Failed to establish VPN", e);
            }
            return START_STICKY;
        }

        private void startVpnThread() {
            vpnThread = new Thread(() -> {
                try {
                    ByteBuffer packet = ByteBuffer.allocate(32767);
                    while (true) {
                        int length = vpnInterface.getFileDescriptor().read(packet.array());
                        if (length > 0) {
                            processPacket(packet, length);
                        }
                    }
                } catch (Exception e) {
                    Log.e("FirewallVpnService", "VPN thread error", e);
                }
            }

            private void processPacket(ByteBuffer packet, int length) {
                // Parse IP header
                // Check if packet belongs to blocked app
                // If blocked, drop packet
                // Otherwise forward
            }

            @Override
            public void onDestroy() {
                if (vpnThread != null) vpnThread.interrupt();
                super.onDestroy();
            }

            @Override
            public void onRevoke() {
                super.onRevoke();
                if (vpnThread != null) vpnThread.interrupt();
            }
        }

        public void setBlockedApps(Set<String> apps) {
            this.blockedApps = apps;
        }
    }

    public void updateBlockedApps() {
        // Would need to communicate with VPN service
    }
}