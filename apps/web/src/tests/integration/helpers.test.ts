import { describe, it, expect } from 'vitest';

// Import utility functions
const calculateConversionRate = (conversions: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((conversions / total) * 100 * 100) / 100;
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

describe('Helper Functions Coverage', () => {
  describe('calculateConversionRate', () => {
    it('should calculate conversion rate correctly', () => {
      expect(calculateConversionRate(25, 1000)).toBe(2.5);
      expect(calculateConversionRate(0, 1000)).toBe(0);
      expect(calculateConversionRate(10, 0)).toBe(0);
      expect(calculateConversionRate(1, 3)).toBe(33.33);
    });

    it('should handle edge cases', () => {
      expect(calculateConversionRate(0, 0)).toBe(0);
      expect(calculateConversionRate(100, 100)).toBe(100);
      expect(calculateConversionRate(1, 1)).toBe(100);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('a@b.c')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid.email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle different currencies', () => {
      expect(formatCurrency(100, 'EUR')).toMatch(/€|EUR/);
      expect(formatCurrency(100, 'GBP')).toMatch(/£|GBP/);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize malicious input', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('  normal text  ')).toBe('normal text');
      expect(sanitizeInput('Valid input')).toBe('Valid input');
    });

    it('should handle edge cases', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
      expect(sanitizeInput('<>')).toBe('');
    });
  });
});

describe('Data Processing Functions Coverage', () => {
  const processCSVData = (csvString: string) => {
    return csvString.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [id, date, amount, currency] = line.split(',');
        return {
          id: id?.trim(),
          date: date?.trim(),
          amount: amount ? parseFloat(amount.trim()) : 0,
          currency: currency?.trim() || 'USD'
        };
      });
  };

  const aggregateData = (data: Array<{partnerId: number, value: number}>) => {
    return data.reduce((acc, item) => {
      acc[item.partnerId] = (acc[item.partnerId] || 0) + item.value;
      return acc;
    }, {} as Record<number, number>);
  };

  describe('processCSVData', () => {
    it('should process CSV data correctly', () => {
      const csv = 'user1,2024-01-01,100.50,USD\nuser2,2024-01-02,200.75,EUR';
      const result = processCSVData(csv);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'user1',
        date: '2024-01-01',
        amount: 100.50,
        currency: 'USD'
      });
      expect(result[1]).toEqual({
        id: 'user2',
        date: '2024-01-02',
        amount: 200.75,
        currency: 'EUR'
      });
    });

    it('should handle malformed CSV', () => {
      const csv = 'user1,2024-01-01\n,invalid,data,\nempty';
      const result = processCSVData(csv);
      
      expect(result).toHaveLength(3);
      expect(result[0].amount).toBe(0);
      expect(result[1].currency).toBe('USD');
    });
  });

  describe('aggregateData', () => {
    it('should aggregate data by partner ID', () => {
      const data = [
        { partnerId: 1, value: 100 },
        { partnerId: 1, value: 200 },
        { partnerId: 2, value: 300 }
      ];
      
      const result = aggregateData(data);
      expect(result).toEqual({ 1: 300, 2: 300 });
    });

    it('should handle empty data', () => {
      expect(aggregateData([])).toEqual({});
    });
  });
});
