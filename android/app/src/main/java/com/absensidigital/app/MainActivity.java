package com.absensidigital.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MockLocationDetectorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
