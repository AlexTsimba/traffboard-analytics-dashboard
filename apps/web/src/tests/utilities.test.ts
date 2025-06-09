import { describe, it, expect } from 'vitest';

describe('Utility Functions Tests', () => {
  describe('Data Processing Utilities', () => {
    it('should process CSV data correctly', () => {
      const csvRow = 'user123,2024-01-01,100.50,USD';
      const processCSVRow = (row: string) => {
        const [userId, date, amount, currency] = row.split(',');
        return {
          userId,
          date,
          amount: parseFloat(amount),
          currency
        };
      };

      const result = processCSVRow(csvRow);
      expect(result.userId).toBe('user123');
      expect(result.date).toBe('2024-01-01');
      expect(result.amount).toBe(100.50);
      expect(result.currency).toBe('USD');
    });

    it('should handle data aggregation', () => {
      const data = [
        { partnerId: 1, clicks: 100, registrations: 10 },
        { partnerId: 1, clicks: 150, registrations: 15 },
        { partnerId: 2, clicks: 200, registrations: 20 }
      ];

      const aggregateByPartner = (data: any[]) => {
        return data.reduce((acc, item) => {
          if (!acc[item.partnerId]) {
            acc[item.partnerId] = { clicks: 0, registrations: 0 };
          }
          acc[item.partnerId].clicks += item.clicks;
          acc[item.partnerId].registrations += item.registrations;
          return acc;
        }, {} as Record<number, { clicks: number; registrations: number }>);
      };

      const result = aggregateByPartner(data);
      expect(result[1]).toEqual({ clicks: 250, registrations: 25 });
      expect(result[2]).toEqual({ clicks: 200, registrations: 20 });
    });

    it('should calculate conversion rates', () => {
      const calculateConversionRate = (conversions: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((conversions / total) * 100 * 100) / 100; // Round to 2 decimal places
      };

      expect(calculateConversionRate(25, 1000)).toBe(2.5);
      expect(calculateConversionRate(0, 1000)).toBe(0);
      expect(calculateConversionRate(10, 0)).toBe(0);
      expect(calculateConversionRate(1, 3)).toBe(33.33);
    });

    it('should format currency values', () => {
      const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency
        }).format(amount);
      };

      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should validate date formats', () => {
      const isValidDate = (dateString: string) => {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
      };

      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('2024-12-31')).toBe(true);
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false);
    });
  });

  describe('Performance Calculation Utilities', () => {
    it('should calculate ROAS (Return on Ad Spend)', () => {
      const calculateROAS = (revenue: number, cost: number) => {
        if (cost === 0) return 0;
        return Math.round((revenue / cost) * 100) / 100;
      };

      expect(calculateROAS(5000, 1000)).toBe(5);
      expect(calculateROAS(1500, 500)).toBe(3);
      expect(calculateROAS(100, 0)).toBe(0);
    });

    it('should calculate LTV (Lifetime Value)', () => {
      const calculateLTV = (avgOrderValue: number, purchaseFreq: number, grossMargin: number, lifespan: number) => {
        return Math.round(avgOrderValue * purchaseFreq * grossMargin * lifespan * 100) / 100;
      };

      expect(calculateLTV(100, 2, 0.3, 12)).toBe(720);
      expect(calculateLTV(50, 1, 0.5, 24)).toBe(600);
    });

    it('should calculate retention rates', () => {
      const calculateRetentionRate = (retained: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((retained / total) * 100 * 100) / 100;
      };

      expect(calculateRetentionRate(80, 100)).toBe(80);
      expect(calculateRetentionRate(45, 60)).toBe(75);
      expect(calculateRetentionRate(0, 50)).toBe(0);
    });
  });

  describe('Data Validation Utilities', () => {
    it('should validate email addresses', () => {
      const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid.email')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });

    it('should validate partner IDs', () => {
      const isValidPartnerId = (id: any) => {
        return typeof id === 'number' && id > 0 && Number.isInteger(id);
      };

      expect(isValidPartnerId(1)).toBe(true);
      expect(isValidPartnerId(100)).toBe(true);
      expect(isValidPartnerId(0)).toBe(false);
      expect(isValidPartnerId(-1)).toBe(false);
      expect(isValidPartnerId(1.5)).toBe(false);
      expect(isValidPartnerId('1')).toBe(false);
    });

    it('should sanitize user input', () => {
      const sanitizeInput = (input: string) => {
        return input.trim().replace(/[<>]/g, '');
      };

      expect(sanitizeInput('  normal text  ')).toBe('normal text');
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('Valid input')).toBe('Valid input');
    });
  });
});
