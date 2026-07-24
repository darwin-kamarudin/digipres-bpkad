package com.absensidigital.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

/**
 * Plugin native custom untuk deteksi Fake GPS / Mock Location di Android.
 *
 * @capacitor/geolocation resmi TIDAK mengekspos Location.isFromMockProvider()/isMock()
 * ke JavaScript. Plugin ini membaca lokasi terakhir yang diketahui (last known location)
 * langsung lewat LocationManager HANYA untuk memeriksa flag mock-nya — tidak menggantikan
 * alur pengambilan koordinat @capacitor/geolocation yang sudah ada.
 */
@CapacitorPlugin(name = "MockLocationDetector")
public class MockLocationDetectorPlugin extends Plugin {

    @PluginMethod
    public void checkMockLocation(PluginCall call) {
        boolean isMock = false;

        boolean hasPermission =
                ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                        || ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        if (hasPermission) {
            try {
                LocationManager locationManager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
                if (locationManager != null) {
                    List<String> providers = locationManager.getProviders(true);
                    for (String provider : providers) {
                        try {
                            Location location = locationManager.getLastKnownLocation(provider);
                            if (location != null && isLocationMocked(location)) {
                                isMock = true;
                                break;
                            }
                        } catch (SecurityException ignored) {
                            // Lewati provider ini kalau izin tidak cukup untuknya
                        }
                    }
                }
            } catch (Exception ignored) {
                // Gagal memeriksa -> anggap bukan mock (fail-open), jangan blokir pengguna sah
                // hanya karena pemeriksaan tambahan ini error.
            }
        }

        JSObject ret = new JSObject();
        ret.put("isMock", isMock);
        call.resolve(ret);
    }

    private boolean isLocationMocked(Location location) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return location.isMock();
        } else {
            //noinspection deprecation
            return location.isFromMockProvider();
        }
    }
}
