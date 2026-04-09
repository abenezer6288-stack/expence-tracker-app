import { expenseService } from './expenseService';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { Platform } from 'react-native';

// Payment keywords to detect bank/payment notifications
const PAYMENT_KEYWORDS = [
  'debited', 'credited', 'paid', 'payment', 'transaction', 'spent',
  'withdrawn', 'purchase', 'bought', 'charged', 'debit', 'credit',
  'transferred', 'sent', 'received', 'upi', 'atm', 'pos', 'card',
  'bank', 'account', 'balance', 'amount', 'rs', 'inr', 'usd', 'eur',
  'birr', 'etb', '$', '₹', 'br'
];

interface ExtractedPayment {
  amount: number | null;
  merchant: string;
  type: 'debit' | 'credit';
  date: string;
  rawText: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private isListening = false;
  private paymentCallback: ((payment: ExtractedPayment) => void) | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      // Check if notification listener permission is granted
      const status = await RNAndroidNotificationListener.getPermissionStatus();
      
      if (status !== 'authorized') {
        // Open settings to grant permission
        await RNAndroidNotificationListener.requestPermission();
        return false; // User needs to manually enable in settings
      }

      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  // Start listening to notifications
  async startListening(onPaymentDetected: (payment: ExtractedPayment) => void) {
    if (this.isListening) return;
    if (Platform.OS !== 'android') {
      console.log('Notification listener only works on Android');
      return;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return;
    }

    this.isListening = true;
    this.paymentCallback = onPaymentDetected;

    // Start listening to all notifications
    RNAndroidNotificationListener.onNotificationPosted((notification: any) => {
      this.handleAndroidNotification(notification);
    });

    console.log('Android notification listener started');
  }

  // Stop listening
  stopListening() {
    this.isListening = false;
    this.paymentCallback = null;
    if (Platform.OS === 'android') {
      RNAndroidNotificationListener.stop();
    }
  }

  // Handle Android notification from other apps
  private handleAndroidNotification(notification: any) {
    if (!this.isListening || !this.paymentCallback) return;

    try {
      const { title, text, app } = notification;
      const fullText = `${title || ''} ${text || ''}`.toLowerCase();

      // Check if it's from a banking/payment app
      const isBankingApp = this.isBankingApp(app);
      
      // Check if it's a payment notification
      if (isBankingApp || this.isPaymentNotification(fullText)) {
        const extracted = this.extractPaymentData(title || '', text || '');
        if (extracted.amount && extracted.amount > 0) {
          console.log('Payment detected from:', app, extracted);
          this.paymentCallback(extracted);
        }
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  }

  // Check if app is a banking/payment app
  private isBankingApp(packageName: string): boolean {
    const lowerPackage = packageName.toLowerCase();
    
    // Ethiopian banks (PRIORITY - checked first)
    const ethiopianBanks = [
      'cbe', 'commercial bank of ethiopia',
      'awash', 'aib', 'awash international',
      'dashen', 'dashen bank',
      'abyssinia', 'boa', 'bank of abyssinia',
      'nib', 'nib international',
      'wegagen', 'wegagen bank',
      'united bank',
      'coop', 'cooperative bank', 'oromia',
      'abay', 'abay bank',
      'berhan', 'berhan bank',
      'bunna', 'bunna international',
      'oromia international',
      'enat', 'enat bank',
      'debub', 'debub global',
      'lion', 'lion international',
      'addis', 'addis international',
      'amhara', 'amhara bank',
      'tsehay', 'tsehay bank',
      'tsedey', 'tsedey bank',
      'goh betoch', 'gohbetoch',
      'hijra', 'hijra bank',
      'zamzam', 'zam zam',
      'gadaa', 'gadaa bank',
      'rammis', 'rammis bank',
      'siket', 'siket bank',
      'sidama', 'sidama bank',
      'ahadu', 'ahadu bank',
      'telebirr', 'ethiotelecom', 'ethio telecom',
      'mpesa', 'm-pesa', 'm pesa', 'safaricom'
    ];
    
    // Check Ethiopian banks first (priority)
    if (ethiopianBanks.some(bank => lowerPackage.includes(bank))) {
      return true;
    }
    
    // Indian banks and UPI apps
    const indianBanks = [
      'sbi', 'hdfc', 'icici', 'axis', 'kotak', 'pnb', 'bob', 'canara',
      'phonepe', 'paytm', 'gpay', 'googlepay', 'bhim', 'upi'
    ];
    
    if (indianBanks.some(bank => lowerPackage.includes(bank))) {
      return true;
    }
    
    // Generic banking/payment keywords
    const genericKeywords = [
      'bank', 'payment', 'wallet', 'finance', 'money', 'pay'
    ];
    
    return genericKeywords.some(keyword => lowerPackage.includes(keyword));
  }

  // Check if notification is payment-related
  private isPaymentNotification(text: string): boolean {
    return PAYMENT_KEYWORDS.some(keyword => text.includes(keyword));
  }

  // Extract payment data from notification text
  private extractPaymentData(title: string, body: string): ExtractedPayment {
    const fullText = `${title} ${body}`;
    
    // Extract amount
    const amount = this.extractAmount(fullText);
    
    // Extract merchant
    const merchant = this.extractMerchant(fullText);
    
    // Determine transaction type
    const type = this.extractType(fullText);
    
    return {
      amount,
      merchant,
      type,
      date: new Date().toISOString(),
      rawText: fullText,
    };
  }

  // Extract amount from text
  private extractAmount(text: string): number | null {
    // Patterns for different currency formats
    const patterns = [
      // Ethiopian Birr (PRIORITY)
      /(?:etb|birr|br)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:etb|birr|br)/i,
      // Indian Rupee
      /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i,
      // US Dollar
      /(?:usd|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:usd|\$)/i,
      // Generic amount patterns
      /(?:amount|amt|paid|debited|credited|withdrawn|spent|transferred)[:\s]+(?:rs\.?|₹|\$|etb|birr|br)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /([0-9,]+\.[0-9]{2})\s*(?:debited|credited|paid|spent|withdrawn|transferred)/i,
      // Just numbers with currency context
      /(?:paid|sent|received|debited|credited)\s+(?:of\s+)?([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    return null;
  }

  // Extract merchant name
  private extractMerchant(text: string): string {
    // Common patterns for merchant extraction
    const patterns = [
      /(?:at|to|from)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+on|\s+for|\s+via|\.)/i,
      /(?:paid to|sent to|received from)\s+([A-Za-z0-9\s&]+)/i,
      /(?:merchant|store|shop)[:\s]+([A-Za-z0-9\s&]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no merchant found, try to extract capitalized words
    const words = text.split(/\s+/);
    const capitalizedWords = words.filter(w => /^[A-Z][a-z]+/.test(w));
    if (capitalizedWords.length > 0) {
      return capitalizedWords.slice(0, 2).join(' ');
    }

    return 'Unknown';
  }

  // Determine transaction type
  private extractType(text: string): 'debit' | 'credit' {
    const debitKeywords = ['debited', 'paid', 'spent', 'withdrawn', 'purchase', 'bought', 'charged'];
    const creditKeywords = ['credited', 'received', 'refund', 'cashback'];

    const lowerText = text.toLowerCase();
    
    if (debitKeywords.some(k => lowerText.includes(k))) {
      return 'debit';
    }
    if (creditKeywords.some(k => lowerText.includes(k))) {
      return 'credit';
    }

    return 'debit'; // Default to debit
  }

  // Auto-save expense from notification
  async autoSaveExpense(payment: ExtractedPayment, _userId: string) {
    if (!payment.amount || payment.type !== 'debit') {
      return; // Only auto-save debit transactions
    }

    try {
      await expenseService.create({
        amount: payment.amount,
        merchant: payment.merchant,
        description: `Auto-tracked from notification`,
        date: payment.date,
        source: 'notification',
        notes: payment.rawText,
      });
      
      console.log('Expense auto-saved:', payment);
      return true;
    } catch (error) {
      console.error('Failed to auto-save expense:', error);
      
      // If offline, save to pending queue for later sync
      if (error.message?.includes('Network') || error.message?.includes('timeout')) {
        await this.saveToPendingQueue(payment);
        console.log('Saved to pending queue for offline sync');
      }
      
      return false;
    }
  }

  // Save to pending queue for offline sync
  private async saveToPendingQueue(payment: ExtractedPayment) {
    try {
      const { storage } = await import('../utils/storage');
      const pendingStr = await storage.getItem('pendingPayments');
      const pending = pendingStr ? JSON.parse(pendingStr) : [];
      
      pending.push({
        ...payment,
        timestamp: Date.now(),
      });
      
      await storage.setItem('pendingPayments', JSON.stringify(pending));
    } catch (error) {
      console.error('Failed to save to pending queue:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
