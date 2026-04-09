# Auto-Tracking Setup Guide

## What Changed

The auto-tracking feature now properly monitors payment notifications from banking apps on your Android phone.

## New Dependencies

- `react-native-android-notification-listener` - Listens to notifications from other apps

## How It Works

1. **Permission Required**: The app needs "Notification Access" permission to read notifications from banking apps
2. **Background Monitoring**: Even when the app is closed, it monitors payment notifications
3. **Smart Detection**: Automatically detects amounts, merchants, and transaction types
4. **Auto-Save**: If enabled, expenses are saved automatically without confirmation

## Setup Steps

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Rebuild the App

Since we added a native module, you need to rebuild:

```bash
# Using EAS Build (recommended)
eas build --profile preview --platform android

# OR locally (requires Android Studio)
npx expo prebuild
npx expo run:android
```

### 3. Enable Auto-Tracking

1. Open the app
2. Go to Settings → Auto-Track Settings
3. Toggle "Enable Auto-Tracking"
4. When prompted, tap "Open Settings"
5. Find "Expense Tracker" in the list
6. Enable notification access
7. Return to the app
8. Optionally enable "Auto-Save Expenses"

## Testing

### Test with a Real Bank Notification

1. Make a payment using your bank app or UPI app
2. Wait for the payment notification
3. The app will detect it and either:
   - Auto-save the expense (if auto-save is enabled)
   - Show a confirmation dialog (if auto-save is disabled)

### Test with a Simulated Notification

You can test by sending a test notification that looks like a bank notification:

```
Title: HDFC Bank
Body: Rs 250.00 debited from A/c XX1234 at Starbucks on 09-Apr-26
```

## Supported Banks & Apps

The app detects notifications from:

- **Indian Banks**: SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, Canara, etc.
- **UPI Apps**: PhonePe, Paytm, Google Pay, BHIM
- **Ethiopian Banks**: CBE, Dashen, Awash, Abyssinia, NIB, Wegagen
- **Mobile Money**: TeleBirr
- **Any app** with payment keywords in notifications

## Notification Patterns Detected

The app looks for these patterns:

- `Rs 250 debited from account`
- `₹250.00 paid to Merchant Name`
- `ETB 500 withdrawn from ATM`
- `$25.50 charged to card`
- `Payment of Rs 1,000 to PhonePe`

## Privacy & Security

- The app only reads notification text, not notification content
- No data is sent to external servers
- Notifications are processed locally on your device
- You can disable auto-tracking anytime

## Troubleshooting

### Auto-tracking not working?

1. Check if notification access is enabled:
   - Settings → Apps → Expense Tracker → Notifications → Notification access
2. Make sure auto-tracking is enabled in the app
3. Check if the banking app sends notifications
4. Try making a test payment

### Expenses not being saved?

1. Check if auto-save is enabled
2. Verify the notification contains an amount
3. Check app logs for errors

### Permission keeps resetting?

Some Android versions may reset notification access. You'll need to re-enable it in settings.

## Known Limitations

- Only works on Android (iOS doesn't allow reading other apps' notifications)
- Requires Android 4.3+ (API level 18+)
- Some banks may use non-standard notification formats
- Background processing may be limited by battery optimization settings

## Future Improvements

- Machine learning to improve merchant name extraction
- Category auto-assignment based on merchant
- Support for more international banks
- Duplicate detection to avoid saving the same expense twice
