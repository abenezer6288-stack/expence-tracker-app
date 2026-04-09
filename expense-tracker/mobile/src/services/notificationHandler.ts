import { AppRegistry } from 'react-native';
import { storage } from '../utils/storage';

// Headless task handler for background notifications
const headlessNotificationHandler = async ({ notification }: any) => {
  try {
    // Check if auto-tracking is enabled
    const autoTrackEnabled = await storage.getItem('autoTrackEnabled');
    const autoSaveEnabled = await storage.getItem('autoSaveEnabled');

    if (autoTrackEnabled !== 'true') {
      return;
    }

    const { title, text, app } = notification;
    const fullText = `${title || ''} ${text || ''}`.toLowerCase();

    // Check if it's a payment notification
    const isPayment = checkPaymentNotification(fullText, app);
    
    if (isPayment) {
      const payment = extractPaymentData(title || '', text || '');
      
      if (payment.amount && autoSaveEnabled === 'true') {
        // Store notification for processing when app opens
        const pendingPayments = await storage.getItem('pendingPayments');
        const payments = pendingPayments ? JSON.parse(pendingPayments) : [];
        payments.push({
          ...payment,
          timestamp: Date.now(),
        });
        await storage.setItem('pendingPayments', JSON.stringify(payments));
      }
    }
  } catch (error) {
    console.error('Headless notification handler error:', error);
  }
};

// Helper functions
const PAYMENT_KEYWORDS = [
  'debited', 'credited', 'paid', 'payment', 'transaction', 'spent',
  'withdrawn', 'purchase', 'bought', 'charged', 'debit', 'credit',
  'transferred', 'sent', 'received', 'upi', 'atm', 'pos', 'card',
  'bank', 'account', 'balance', 'amount', 'rs', 'inr', 'usd', 'eur',
  'birr', 'etb', '₹', 'br'
];

const BANKING_APPS = [
  'sbi', 'hdfc', 'icici', 'axis', 'kotak', 'pnb', 'bob', 'canara',
  'phonepe', 'paytm', 'gpay', 'googlepay', 'bhim', 'upi',
  'cbe', 'dashen', 'awash', 'abyssinia', 'nib', 'wegagen', 'telebirr',
  'bank', 'payment', 'wallet', 'finance'
];

function checkPaymentNotification(text: string, app: string): boolean {
  const isBankingApp = BANKING_APPS.some(a => app.toLowerCase().includes(a));
  const hasPaymentKeyword = PAYMENT_KEYWORDS.some(k => text.includes(k));
  return isBankingApp || hasPaymentKeyword;
}

function extractPaymentData(title: string, body: string) {
  const fullText = `${title} ${body}`;
  
  return {
    amount: extractAmount(fullText),
    merchant: extractMerchant(fullText),
    type: extractType(fullText),
    date: new Date().toISOString(),
    rawText: fullText,
  };
}

function extractAmount(text: string): number | null {
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

function extractMerchant(text: string): string {
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

  return 'Unknown';
}

function extractType(text: string): 'debit' | 'credit' {
  const debitKeywords = ['debited', 'paid', 'spent', 'withdrawn', 'purchase', 'bought', 'charged'];
  const creditKeywords = ['credited', 'received', 'refund', 'cashback'];

  const lowerText = text.toLowerCase();
  
  if (debitKeywords.some(k => lowerText.includes(k))) {
    return 'debit';
  }
  if (creditKeywords.some(k => lowerText.includes(k))) {
    return 'credit';
  }

  return 'debit';
}

export default headlessNotificationHandler;
