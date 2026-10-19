package com.obaa.system;

import android.os.IInterface;
import android.os.RemoteException;

public interface IObaaSystemService extends IInterface {
    String getSystemStatus() throws RemoteException;
    void reboot(String reason) throws RemoteException;
    void setCpuGovernor(String governor) throws RemoteException;
    void setGpuGovernor(String governor) throws RemoteException;
    void triggerUpdateCheck() throws RemoteException;
    String getConfig(String key) throws RemoteException;
    void setConfig(String key, String value) throws RemoteException;
    void factoryReset(String reason) throws RemoteException;
    void installPackage(String apkPath) throws RemoteException;
    void setAnimationScales(float scale) throws RemoteException;
    void runShellCommand(String cmd) throws RemoteException;
}