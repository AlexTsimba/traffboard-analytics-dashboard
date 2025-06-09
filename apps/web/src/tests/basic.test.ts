import { describe, it, expect } from 'vitest';

describe('Basic functionality tests', () => {
  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
    expect(10 * 5).toBe(50);
    expect(100 / 4).toBe(25);
  });

  it('should handle string operations', () => {
    const testString = 'Traffboard Analytics Dashboard';
    expect(testString.toLowerCase()).toBe('traffboard analytics dashboard');
    expect(testString.includes('Analytics')).toBe(true);
    expect(testString.split(' ')).toHaveLength(3);
  });

  it('should handle array operations', () => {
    const testArray = [1, 2, 3, 4, 5];
    expect(testArray.length).toBe(5);
    expect(testArray.includes(3)).toBe(true);
    expect(testArray.filter(n => n > 3)).toEqual([4, 5]);
    expect(testArray.map(n => n * 2)).toEqual([2, 4, 6, 8, 10]);
  });

  it('should handle object operations', () => {
    const testObject = {
      name: 'Traffboard',
      version: '1.0.0',
      features: ['analytics', 'normalization', 'dashboard'],
      active: true
    };
    expect(testObject.name).toBe('Traffboard');
    expect(testObject.features).toHaveLength(3);
    expect(testObject.active).toBe(true);
    expect(Object.keys(testObject)).toEqual(['name', 'version', 'features', 'active']);
  });

  it('should handle async operations', async () => {
    const asyncFunction = async (value: string) => {
      return new Promise(resolve => setTimeout(() => resolve(`processed: ${value}`), 10));
    };
    
    const result = await asyncFunction('test');
    expect(result).toBe('processed: test');
  });

  it('should handle promises', async () => {
    const promise1 = Promise.resolve(42);
    const promise2 = Promise.resolve('hello');
    
    const [num, text] = await Promise.all([promise1, promise2]);
    expect(num).toBe(42);
    expect(text).toBe('hello');
  });

  it('should handle error scenarios', () => {
    expect(() => {
      throw new Error('Test error');
    }).toThrow('Test error');
    
    expect(() => {
      JSON.parse('invalid json');
    }).toThrow();
  });

  it('should handle date operations', () => {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    const specificDate = new Date('2024-01-01');
    expect(specificDate.getFullYear()).toBe(2024);
    expect(specificDate.getMonth()).toBe(0); // January is 0
  });

  it('should handle JSON operations', () => {
    const data = { name: 'test', value: 123, active: true };
    const jsonString = JSON.stringify(data);
    const parsed = JSON.parse(jsonString);
    
    expect(parsed).toEqual(data);
    expect(typeof jsonString).toBe('string');
  });

  it('should handle regular expressions', () => {
    const email = 'test@example.com';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test(email)).toBe(true);
    expect(emailRegex.test('invalid-email')).toBe(false);
  });
});
