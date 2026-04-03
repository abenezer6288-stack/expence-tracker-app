import * as Notifications from 'expo-notifications';
import { expenseService } from './expenseService';

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

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  // Start listening to notifications
  async startListening(onPaymentDetected: (payment: ExtractedPayment) => void) {
    if (this.isListening) return;

    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return;
    }

    this.isListening = true;

    // Listen for notifications when app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      this.handleNotification(notification, onPaymentDetected);
    });

    // Listen for notification responses (when user taps notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      this.handleNotification(response.notification, onPaymentDetected);
    });

    console.log('Notification listener started');
  }

  // Stop listening
  stopListening() {
    this.isListening = false;
  }

  // Handle incoming notification
  private handleNotification(
    notification: Notifications.Notification,
    onPaymentDetected: (payment: ExtractedPayment) => void
  ) {
    const { title, body } = notification.request.content;
    const fullText = `${title || ''} ${body || ''}`.toLowerCase();

    // Check if it's a payment notification
    if (this.isPaymentNotification(fullText)) {
      const extracted = this.extractPaymentData(title || '', body || '');
      if (extracted.amount) {
        console.log('Payment detected:', extracted);
        onPaymentDetected(extracted);
      }
    }
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
      /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:usd|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:etb|birr|br)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:amount|amt|paid|debited|credited)[:\s]+(?:rs\.?|₹|\$)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /([0-9,]+\.[0-9]{2})\s*(?:debited|credited|paid|spent)/i,
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
      return false;
    }
  }
}

export const notificationService = NotificationService.getInstance();
