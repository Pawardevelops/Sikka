package com.sikka.expense.sms

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/** Runs the JS task registered as "SikkaSmsReceived" in index.ts. */
class SmsHeadlessTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val extras = intent?.extras ?: return null
        val data = Arguments.createMap().apply {
            putString("sender", extras.getString("sender"))
            putString("body", extras.getString("body"))
            putDouble("timestamp", extras.getDouble("timestamp", System.currentTimeMillis().toDouble()))
        }
        // 60s timeout; allowed while the app is in the foreground too.
        return HeadlessJsTaskConfig("SikkaSmsReceived", data, 60_000, true)
    }
}
