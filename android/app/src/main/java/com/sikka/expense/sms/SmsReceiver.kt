package com.sikka.expense.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.facebook.react.HeadlessJsTaskService

/**
 * Receives incoming SMS and hands each message (multipart bodies joined) to the
 * JS headless task "SikkaSmsReceived", which parses bank / UPI messages.
 */
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        if (parts.isEmpty()) return

        // One broadcast can carry several messages; group parts by sender.
        parts.groupBy { it.originatingAddress ?: "Unknown" }.forEach { (sender, msgs) ->
            val body = msgs.joinToString("") { it.messageBody ?: "" }
            if (body.isBlank()) return@forEach
            val service = Intent(context, SmsHeadlessTaskService::class.java).apply {
                putExtra("sender", sender)
                putExtra("body", body)
                putExtra("timestamp", msgs.first().timestampMillis.toDouble())
            }
            // SMS_RECEIVED grants a temporary background-start allowance.
            context.startService(service)
            HeadlessJsTaskService.acquireWakeLockNow(context)
        }
    }
}
