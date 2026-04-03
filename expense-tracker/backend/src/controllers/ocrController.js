const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

// Category keywords for auto-classification
const CATEGORY_KEYWORDS = {
  Food: ['restaurant', 'cafe', 'food', 'pizza', 'burger', 'kfc', 'mcdonalds', 'swiggy', 'zomato', 'uber eats', 'doordash', 'grubhub', 'starbucks', 'subway', 'dominos', 'bakery', 'grocery', 'supermarket'],
  Transport: ['uber', 'lyft', 'taxi', 'ola', 'rapido', 'metro', 'bus', 'train', 'fuel', 'petrol', 'gas station', 'parking', 'toll', 'flight', 'airline', 'grab'],
  Bills: ['electricity', 'water', 'internet', 'wifi', 'broadband', 'phone', 'mobile', 'recharge', 'netflix', 'spotify', 'amazon prime', 'insurance', 'rent', 'emi', 'loan'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'walmart', 'target', 'zara', 'h&m', 'nike', 'adidas', 'mall', 'store', 'shop', 'purchase'],
  Health: ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine', 'apollo', 'cvs', 'walgreens', 'gym', 'fitness'],
  Entertainment: ['cinema', 'movie', 'theatre', 'concert', 'netflix', 'gaming', 'steam', 'playstation', 'xbox'],
};

const classifyCategory = (text) => {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return 'Others';
};

// Extract amount from OCR text
const extractAmount = (text) => {
  // Enhanced patterns for multiple currencies including ETB (Birr)
  const patterns = [
    // Ethiopian Birr patterns with explicit currency markers
    /(?:birr|br|etb)[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:birr|br|etb)/gi,
    
    // Common currency symbols
    /(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /(?:usd|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /(?:€|eur|euro)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /(?:£|gbp)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    
    // Amount with labels (high priority)
    /(?:amount|total|paid|debit|credit|price|cost|sum|debited|credited)[:\s]+(?:birr|br|etb|₹|rs\.?|\$|€|£)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    
    // Transaction patterns
    /([0-9,]+\.[0-9]{2})\s*(?:dr|cr|debit|credit|debited|credited)/gi,
  ];

  const amounts = [];
  const datePatterns = [
    /\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b/g,  // 2025-12-21
    /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{4}\b/g,  // 21-03-2026
    /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2}\b/g,  // 21/03/26
  ];
  
  // Remove dates from text to avoid confusion
  let cleanText = text;
  for (const datePattern of datePatterns) {
    cleanText = cleanText.replace(datePattern, '');
  }
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      
      // Filter out invalid amounts
      if (!isNaN(amount) && amount > 0 && amount < 10000000) {
        // Skip if it looks like a date component (year, day, month)
        if (amount > 31 || amount < 1900) {
          amounts.push(amount);
        }
      }
    }
  }

  // If we found amounts with currency markers, return the largest
  if (amounts.length > 0) {
    amounts.sort((a, b) => b - a);
    return amounts[0];
  }
  
  // Fallback: look for standalone amounts with decimal points (likely prices)
  const decimalPattern = /\b([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})\b/g;
  let match;
  while ((match = decimalPattern.exec(cleanText)) !== null) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0 && amount < 10000000) {
      amounts.push(amount);
    }
  }
  
  if (amounts.length > 0) {
    amounts.sort((a, b) => b - a);
    return amounts[0];
  }
  
  return null;
};

// Extract date from OCR text
const extractDate = (text) => {
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,4})/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      try {
        return new Date(match[0]).toISOString().split('T')[0];
      } catch {
        continue;
      }
    }
  }
  return new Date().toISOString().split('T')[0];
};

// Extract merchant name
const extractMerchant = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Look for "from" or "to" patterns (common in bank transactions)
  const fromToPattern = /(?:from|to|for)\s+([A-Z][A-Za-z\s]{3,50}?)(?:\s+for|\s+on|\s+ETB|\s+Br|\s+with|$)/i;
  for (const line of lines) {
    const match = line.match(fromToPattern);
    if (match) {
      const merchant = match[1].trim();
      // Filter out common non-merchant words
      if (!/(amount|total|balance|account|date|time|ref|transaction|commission|vat|disaster|fund)/i.test(merchant)) {
        return merchant;
      }
    }
  }

  // Look for common merchant patterns
  const merchantPatterns = [
    /(?:merchant|paid to|at|store|shop|recipient)[:\s]+([A-Za-z0-9\s&'.,-]{3,50})/i,
    /(?:transaction at|payment to|sent to)[:\s]+([A-Za-z0-9\s&'.,-]{3,50})/i,
  ];

  for (const line of lines) {
    for (const pattern of merchantPatterns) {
      const match = line.match(pattern);
      if (match) {
        const merchant = match[1].trim();
        if (!/(amount|total|balance|account|date|time|ref|transaction|commission|vat)/i.test(merchant)) {
          return merchant;
        }
      }
    }
  }

  // Look for "Reason" field (common in mobile banking)
  const reasonMatch = text.match(/reason[:\s]+([^\n]{3,50})/i);
  if (reasonMatch) {
    return reasonMatch[1].trim();
  }

  // Look for capitalized words (likely business names)
  for (const line of lines) {
    // Match lines with multiple capitalized words (business names)
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(line) && line.length < 50) {
      if (!/(amount|total|balance|account|date|time|ref|transaction|commission|vat|disaster|fund)/i.test(line)) {
        return line;
      }
    }
  }

  // Return first meaningful line as fallback
  const meaningful = lines.find((l) => 
    l.length > 3 && 
    l.length < 50 && 
    /[a-zA-Z]/.test(l) &&
    !/(amount|total|balance|account|date|time|ref|transaction|receipt|invoice|commission|vat|disaster|fund|success|completed|processed)/i.test(l)
  );
  
  return meaningful || 'Unknown';
};

const processOCR = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const imagePath = req.file.path;

  try {
    console.log('Processing OCR for:', imagePath);

    const { data: { text, confidence } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log('OCR Text extracted:', text.substring(0, 200));

    const amount = extractAmount(text);
    const date = extractDate(text);
    const merchant = extractMerchant(text);
    const suggestedCategory = classifyCategory(text + ' ' + merchant);

    // Clean up uploaded file
    fs.unlink(imagePath, () => {});

    res.json({
      success: true,
      confidence: Math.round(confidence),
      extracted: {
        amount,
        date,
        merchant,
        suggestedCategory,
        rawText: text,
      },
    });
  } catch (err) {
    console.error('OCR error:', err);
    // Clean up on error
    if (fs.existsSync(imagePath)) fs.unlink(imagePath, () => {});
    res.status(500).json({ error: 'OCR processing failed', details: err.message });
  }
};

module.exports = { processOCR };
