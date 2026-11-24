/**
 * Web preview only. Browsers can't read SMS, so the web build (used to preview
 * screens) gets a sample inbox. Android never loads this: it has the native
 * SikkaSmsInbox module.
 */
import { IncomingSms } from './types';

const DAY = 86_400_000;

const SAMPLES: [number, string, string][] = [
    [0.1, 'VM-HDFCBK', 'Rs.240.00 debited from A/c XX7731 to VPA bluetokai@ybl on 24-11-26. UPI Ref 431012. Avl Bal Rs 4,100.00'],
    [0.3, 'VM-HDFCBK', 'Rs.612.00 debited from A/c XX7731 to VPA blinkit.payu@hdfcbank on 24-11-26. UPI Ref 441012.'],
    [0.6, 'AD-ICICIB', 'INR 1,450.00 spent on ICICI Bank Credit Card XX0441 at UBER INDIA on 24-Nov-26. Avl Lmt: INR 1,01,350.00'],
    [1.2, 'JM-KOTAKB', 'INR 899.00 spent at RELIANCE DIGITAL on card XX9020 23/11'],
    [1.4, 'VM-HDFCBK', 'Rs.186.00 debited from A/c XX7731 to VPA uber.india@axisbank on 23-11-26. UPI Ref 442113.'],
    [2.1, 'VM-HDFCBK', 'Rs.348.00 debited from A/c XX7731 to VPA blinkit.payu@hdfcbank on 22-11-26. UPI Ref 443114.'],
    [2.5, 'AD-ICICIB', 'INR 6,250.00 spent on ICICI Bank Credit Card XX0441 at SWIGGY on 22-Nov-26. Avl Lmt: INR 1,02,800.00'],
    [3.2, 'VM-HDFCBK', 'Rs.1,120.00 debited from A/c XX7731 to VPA pvrcinemas@icici on 21-11-26. UPI Ref 444115.'],
    [4.0, 'VM-HDFCBK', 'Rs.240.00 debited from A/c XX7731 to VPA bluetokai@ybl on 20-11-26. UPI Ref 445116.'],
    [4.6, 'VM-HDFCBK', 'Rs.5,000.00 debited from A/c XX7731 towards NACH PPFAS MF on 20-11-26.'],
    [5.3, 'VM-HDFCBK', 'Rs.220.00 debited from A/c XX7731 to VPA blinkit.payu@hdfcbank on 19-11-26. UPI Ref 446117.'],
    [6.1, 'VM-HDFCBK', 'Rs.162.00 credited to A/c XX7731 on 18-11-26 by UPI from rahul.k@okaxis'],
    [7.0, 'VM-HDFCBK', 'Rs.649.00 debited from A/c XX7731 to VPA netflix.upi@hdfcbank on 17-11-26. UPI AutoPay.'],
    [8.2, 'VM-HDFCBK', 'Rs.420.00 debited from A/c XX7731 to VPA blinkit.payu@hdfcbank on 16-11-26. UPI Ref 447118.'],
    [9.0, 'VM-HDFCBK', 'Rs.240.00 debited from A/c XX7731 to VPA bluetokai@ybl on 15-11-26. UPI Ref 448119.'],
    [10.4, 'VM-HDFCBK', 'Rs.312.00 debited from A/c XX7731 to VPA uber.india@axisbank on 14-11-26.'],
    [12.0, 'VM-HDFCBK', 'Rs.880.00 debited from A/c XX7731 to VPA blinkit.payu@hdfcbank on 12-11-26.'],
    [13.5, 'VM-HDFCBK', 'Rs.1,499.00 debited from A/c XX7731 to VPA cultfit@ybl on 11-11-26.'],
    [15.0, 'VM-HDFCBK', 'Rs.260.00 debited from A/c XX7731 to VPA uber.india@axisbank on 09-11-26.'],
    [17.0, 'VM-HDFCBK', 'Rs.540.00 debited from A/c XX7731 to VPA blinkit.payu@hdfcbank on 07-11-26.'],
    [19.0, 'VM-HDFCBK', 'Rs.480.00 debited from A/c XX7731 to VPA bluetokai@ybl on 05-11-26.'],
    [21.0, 'VM-HDFCBK', 'Your UPI AutoPay mandate for NETFLIX of Rs.649.00 monthly is created on A/c XX7731.'],
    [22.0, 'VM-HDFCBK', 'Rs.1,100.00 debited from A/c XX7731 to VPA blinkit.payu@hdfcbank on 02-11-26.'],
    [25.0, 'AD-ICICIB', 'INR 12,400.00 spent on ICICI Bank Credit Card XX0441 at AMAZON on 30-Oct-26. Avl Lmt: INR 1,07,600.00'],
    [27.0, 'VM-HDFCBK', 'Rs.390.00 debited from A/c XX7731 to VPA uber.india@axisbank on 28-10-26.'],
    [0.15, 'JM-KOTAKB', 'Sent Rs 1,499.00 from Kotak Bank AC X4410 to CULT FIT on 24-11-26. UPI Ref 630912'],
    [6.5, 'JM-KOTAKB', 'Sent Rs 2,250.00 from Kotak Bank AC X4410 to DECATHLON on 18-11-26. UPI Ref 630577'],
    [0.2, 'VK-AIRTEL', 'Your Airtel bill of Rs 499 is due on 28-11. Pay now on Airtel Thanks app.'],
    [0.4, 'TM-SWIGGY', 'Hungry? Get 50% off on your next order. Use code YUMMY.'],
];

export function demoInbox(since: number): IncomingSms[] {
    const now = Date.now();
    return SAMPLES.map(([daysAgo, sender, body]) => ({ sender, body, timestamp: Math.round(now - daysAgo * DAY) })).filter(
        (m) => (m.timestamp ?? 0) >= since,
    );
}
