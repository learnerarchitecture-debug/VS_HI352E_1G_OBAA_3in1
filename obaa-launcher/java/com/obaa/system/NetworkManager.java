package com.obaa.system;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.net.NetworkRequest;
import android.os.Binder;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

public class NetworkManager {
    private static final String TAG = "ObaaNetworkManager";
    private final Context context;
    private final ConnectivityManager cm;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable monitorTask;
    private ConnectivityManager.NetworkCallback networkCallback;
    private ConnectivityReceiver connectivityReceiver;
    private boolean running = false;
    private boolean isConnected = false;
    private String connectionType = "none";
    private String ipAddress = "0.0.0.0";

    public NetworkManager(Context context) {
        this.context = context;
        this.cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        this.monitorTask = new Runnable() {
            @Override public void run() { checkConnectivity(); }
        };
    }

    public IBinder getBinder() {
        return new Binder() {
            @Override
            protected boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws android.os.RemoteException {
                try {
                    switch (code) {
                        case 1: reply.writeInt(isConnected ? 1 : 0); return true;
                        case 2: reply.writeString(connectionType); return true;
                        case 3: reply.writeString(ipAddress); return true;
                    }
                } catch (Exception e) {
                    Log.w("ObaaNetworkManager", "Transaction failed", e);
                }
                return super.onTransact(code, data, reply, flags);
            }
        };
    }

    public void startMonitoring() {
        if (running) return;
        running = true;
        
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(Network network) {
                updateNetworkInfo(network);
            }
            @Override public void onLost(Network network) {
                isConnected = false;
                connectionType = "none";
                ipAddress = "0.0.0.0";
            }
            @Override public void onCapabilitiesChanged(Network network, NetworkCapabilities nc) {
                updateNetworkInfo(network);
            }
        };
        
        NetworkRequest request = new NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build();
        cm.registerNetworkCallback(request, networkCallback);
        
        // Also register broadcast receiver for legacy support
        connectivityReceiver = new ConnectivityReceiver();
        IntentFilter filter = new IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION);
        context.registerReceiver(connectivityReceiver, filter);
        
        handler.post(monitorTask);
    }

    public void stopMonitoring() {
        running = false;
        if (networkCallback != null) {
            try { cm.unregisterNetworkCallback(networkCallback); } catch (Exception ignored) {}
        }
        if (connectivityReceiver != null) {
            try { context.unregisterReceiver(connectivityReceiver); } catch (Exception ignored) {}
        }
        handler.removeCallbacks(monitorTask);
    }

    public static class ConnectivityReceiver extends BroadcastReceiver {
        @Override public void onReceive(Context context, Intent intent) {
            // Network state changed - handled by NetworkCallback
        }
    }

    private void checkConnectivity() {
        if (!running) return;
        NetworkInfo active = cm.getActiveNetworkInfo();
        isConnected = active != null && active.isConnected();
        if (isConnected) {
            connectionType = active.getTypeName();
            // IP detection would need additional code
        } else {
            connectionType = "none";
            ipAddress = "0.0.0.0";
        }
        handler.postDelayed(monitorTask, 30000);
    }

    private void updateNetworkInfo(Network network) {
        NetworkCapabilities nc = cm.getNetworkCapabilities(network);
        if (nc != null) {
            isConnected = nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
            if (nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) connectionType = "wifi";
            else if (nc.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) connectionType = "ethernet";
            else if (nc.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) connectionType = "cellular";
        }
    }

    public boolean isConnected() { return isConnected; }
    public String getConnectionType() { return connectionType; }
    public String getIpAddress() { return ipAddress; }

    public void runSpeedTest() {
        // Placeholder for speed test integration
        Log.i(TAG, "Speed test requested");
    }
}