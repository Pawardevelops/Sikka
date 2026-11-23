package com.sikka.expense.sms

import android.Manifest
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.core.content.ContextCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/**
 * Reads received SMS from the inbox so users can catch up on payments the
 * receiver missed (phone off, battery saver, permission granted later).
 * Exposed to JS as NativeModules.SikkaSmsInbox.
 */
class SmsInboxModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
    override fun getName() = "SikkaSmsInbox"

    /** Resolves [{ sender, body, timestamp }] received at or after `sinceMs`, oldest first. */
    @ReactMethod
    fun readSince(sinceMs: Double, limit: Double, promise: Promise) {
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            promise.reject("E_PERMISSION", "READ_SMS not granted")
            return
        }
        try {
            val out = Arguments.createArray()
            ctx.contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
                "${Telephony.Sms.DATE} >= ?",
                arrayOf(sinceMs.toLong().toString()),
                "${Telephony.Sms.DATE} ASC",
            )?.use { c ->
                val iAddr = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val iBody = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val iDate = c.getColumnIndexOrThrow(Telephony.Sms.DATE)
                var n = 0
                while (c.moveToNext() && n < limit.toInt()) {
                    out.pushMap(Arguments.createMap().apply {
                        putString("sender", c.getString(iAddr) ?: "Unknown")
                        putString("body", c.getString(iBody) ?: "")
                        putDouble("timestamp", c.getLong(iDate).toDouble())
                    })
                    n++
                }
            }
            promise.resolve(out)
        } catch (e: Exception) {
            promise.reject("E_READ", e.message, e)
        }
    }
}

class SmsInboxPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> = listOf(SmsInboxModule(ctx))
    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
