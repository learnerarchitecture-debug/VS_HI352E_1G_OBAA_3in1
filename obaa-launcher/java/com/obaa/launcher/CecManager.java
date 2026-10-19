package com.obaa.launcher;

import android.content.Context;
import android.hardware.hdmi.HdmiControlManager;
import android.content.Intent;
import android.content.Context;
import android.hardware.hdmi.HdmiDeviceInfo;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

public class CecManager {
    private static final String TAG = "CecManager";

    private final Context context;
    private final Prefs prefs;
    private final HdmiControlManager hdmiControlManager;
    private final Map<Integer, CecDevice> devices = new HashMap<>();

    public CecManager(Context context) {
        this.context = context;
        this.prefs = new Prefs();
        this.hdmiControlManager = (HdmiControlManager) context.getSystemService(Context.HDMI_CONTROL_SERVICE);
    }

    public boolean isCecEnabled() {
        return Prefs.cecEnabled(context);
    }

    public void setCecEnabled(boolean enabled) {
        Prefs.setCecEnabled(context, enabled);
        if (enabled) {
            enableCec();
        } else {
            disableCec();
        }
    }

    public boolean isCecSupported() {
        return hdmiControlManager != null;
    }

    public List<CecDevice> getDevices() {
        if (!isCecSupported()) return new ArrayList<>();

        List<HdmiDeviceInfo> devices = hdmiControlManager.getDevices();
        if (devices == null) return new ArrayList<>();

        List<CecDevice> cecDevices = new ArrayList<>();
        for (HdmiDeviceInfo device : devices) {
            CecDevice cecDevice = new CecDevice();
            cecDevice.id = device.getId();
            cecDevice.logicalAddress = device.getLogicalAddress();
            cecDevice.deviceType = getDeviceTypeName(device.getDeviceType());
            cecDevice.vendorName = device.getVendorName();
            cecDevice.productName = device.getProductName();
            cecDevice.physicalAddress = device.getPhysicalAddress();
            cecDevice.powerStatus = getPowerStatus(device.getPowerStatus());
            cecDevice.activeSource = device.isActiveSource();
            cecDevices.add(cecDevice);
        }
        return cecDevices;
    }

    private String getDeviceTypeName(int type) {
        switch (type) {
            case HdmiDeviceInfo.DEVICE_TV: return "TV";
            case HdmiDeviceInfo.DEVICE_RECORDER: return "Recorder";
            case HdmiDeviceInfo.DEVICE_TUNER: return "Set-top Box";
            case HdmiDeviceInfo.DEVICE_PLAYBACK: return "Playback Device";
            case HdmiDeviceInfo.DEVICE_AUDIO_SYSTEM: return "Soundbar";
            case HdmiDeviceInfo.DEVICE_SWITCH: return "Switch";
            case HdmiDeviceInfo.DEVICE_VIDEO_PROCESSOR: return "Video Processor";
            default: return "Unknown";
        }
    }

    private String getPowerStatus(int status) {
        switch (status) {
            case HdmiDeviceInfo.POWER_STATUS_ON: return "ON";
            case HdmiDeviceInfo.POWER_STATUS_STANDBY: return "STANDBY";
            case HdmiDeviceInfo.POWER_STATUS_IN_TRANSITION_STANDBY_TO_ON: return "STARTING";
            case HdmiDeviceInfo.POWER_STATUS_IN_TRANSITION_ON_TO_STANDBY: return "STOPPING";
            default: return "UNKNOWN";
        }
    }

    public void enableCec() {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.enableCec(true);
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public void disableCec() {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.enableCec(false);
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public void powerOnDevice(int deviceId) {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.sendStandby(deviceId, false);
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public void powerOffDevice(int deviceId) {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.sendStandby(deviceId, true);
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public void powerOnAll() {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.sendStandby(0, false); // Broadcast to all
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public void powerOffAll() {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.sendStandby(0, true); // Broadcast to all
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public void volumeUp() {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.sendKeyEvent(HdmiControlManager.KEY_EVENT_VOLUME_UP, false);
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public void volumeDown() {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.sendKeyEvent(HdmiControlManager.KEY_EVENT_VOLUME_DOWN, false);
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public void sendKeyEvent(int keyCode) {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.sendKeyEvent(keyCode, false);
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public void setActiveSource(int deviceId) {
        if (hdmiControlManager != null) {
            try {
                hdmiControlManager.sendKeyEvent(HdmiControlManager.KEY_EVENT_ACTIVE_SOURCE, false);
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public Map<String, Object> getDeviceInfo(int deviceId) {
        Map<String, Object> info = new HashMap<>();
        if (hdmiControlManager != null) {
            List<HdmiDeviceInfo> devices = hdmiControlManager.getDevices();
            if (devices != null) {
                for (HdmiDeviceInfo device : devices) {
                    if (device.getId() == deviceId) {
                        info.put("id", device.getId());
                        info.put("logicalAddress", device.getLogicalAddress());
                        info.put("deviceType", getDeviceTypeName(device.getDeviceType()));
                        info.put("vendorName", device.getVendorName());
                        info.put("productName", device.getProductName());
                        info.put("physicalAddress", device.getPhysicalAddress());
                        info.put("powerStatus", getPowerStatus(device.getPowerStatus()));
                        info.put("activeSource", device.isActiveSource());
                        break;
                    }
                }
            }
        }
        return info;
    }

    public static class CecDevice {
        public int id;
        public int logicalAddress;
        public String deviceType;
        public String vendorName;
        public String productName;
        public String physicalAddress;
        public String powerStatus;
        public boolean activeSource;
    }
}