import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

describe('CacheService', () => {
  let service: CacheService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'cache') {
          return {
            type: 'memory',
            maxSize: 1000,
            defaultTTL: 300000,
            keyPrefix: 'apijson:',
          };
        }
        return undefined;
      }),
    } as any;

    service = new CacheService(mockConfigService);
  });

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      const result = await service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return value for existing key', async () => {
      await service.set('test-key', 'test-value');
      const result = await service.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should return null for expired key', async () => {
      await service.set('test-key', 'test-value', 100);
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('should handle complex objects', async () => {
      const obj = { id: 1, name: 'test', nested: { key: 'value' } };
      await service.set('test-key', obj);
      const result = await service.get('test-key');
      expect(result).toEqual(obj);
    });

    it('should handle arrays', async () => {
      const arr = [1, 2, 3, 4, 5];
      await service.set('test-key', arr);
      const result = await service.get('test-key');
      expect(result).toEqual(arr);
    });

    it('should handle null values', async () => {
      await service.set('test-key', null);
      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('should handle undefined values', async () => {
      await service.set('test-key', undefined);
      const result = await service.get('test-key');
      expect(result).toBeUndefined();
    });

    it('should handle numbers', async () => {
      await service.set('test-key', 12345);
      const result = await service.get('test-key');
      expect(result).toBe(12345);
    });

    it('should handle boolean values', async () => {
      await service.set('test-key', true);
      const result = await service.get('test-key');
      expect(result).toBe(true);
    });

    it('should handle string values', async () => {
      await service.set('test-key', 'test-string');
      const result = await service.get('test-key');
      expect(result).toBe('test-string');
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      await service.set('test-key', 'test-value');
      const result = await service.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should set value with custom TTL', async () => {
      await service.set('test-key', 'test-value', 1000);
      const result = await service.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should overwrite existing value', async () => {
      await service.set('test-key', 'value1');
      await service.set('test-key', 'value2');
      const result = await service.get('test-key');
      expect(result).toBe('value2');
    });

    it('should handle TTL of 1ms (very short expiry)', async () => {
      await service.set('test-key', 'test-value', 1);
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('should handle very large TTL', async () => {
      const largeTTL = 365 * 24 * 60 * 60 * 1000; // 1 year
      await service.set('test-key', 'test-value', largeTTL);
      const result = await service.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should handle very large values', async () => {
      const largeValue = 'x'.repeat(100000);
      await service.set('test-key', largeValue);
      const result = await service.get('test-key');
      expect(result).toBe(largeValue);
    });
  });

  describe('del', () => {
    it('should delete existing key', async () => {
      await service.set('test-key', 'test-value');
      await service.del('test-key');
      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('should handle deleting non-existent key', async () => {
      await expect(service.del('non-existent-key')).resolves.not.toThrow();
    });

    it('should delete multiple keys', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');
      
      await service.del('key1');
      await service.del('key2');
      
      expect(await service.get('key1')).toBeNull();
      expect(await service.get('key2')).toBeNull();
      expect(await service.get('key3')).toBe('value3');
    });
  });

  describe('exists', () => {
    it('should return true for existing key', async () => {
      await service.set('test-key', 'test-value');
      const result = await service.exists('test-key');
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await service.exists('non-existent-key');
      expect(result).toBe(false);
    });

    it('should return false for expired key', async () => {
      await service.set('test-key', 'test-value', 100);
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await service.exists('test-key');
      expect(result).toBe(false);
    });
  });

  describe('setnx', () => {
    it('should set value if key does not exist', async () => {
      const result = await service.setnx('test-key', 'test-value');
      expect(result).toBe(1);
      const value = await service.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should not set value if key already exists', async () => {
      await service.set('test-key', 'original-value');
      const result = await service.setnx('test-key', 'new-value');
      expect(result).toBe(0);
      const value = await service.get('test-key');
      expect(value).toBe('original-value');
    });

    it('should work with custom TTL', async () => {
      const result = await service.setnx('test-key', 'test-value', 1000);
      expect(result).toBe(1);
      const value = await service.get('test-key');
      expect(value).toBe('test-value');
    });
  });

  describe('getset', () => {
    it('should get old value and set new value', async () => {
      await service.set('test-key', 'old-value');
      const result = await service.getset('test-key', 'new-value');
      expect(result).toBe('old-value');
      const value = await service.get('test-key');
      expect(value).toBe('new-value');
    });

    it('should return null for non-existent key', async () => {
      const result = await service.getset('test-key', 'new-value');
      expect(result).toBeNull();
      const value = await service.get('test-key');
      expect(value).toBe('new-value');
    });

    it('should work with custom TTL', async () => {
      await service.set('test-key', 'old-value');
      const result = await service.getset('test-key', 'new-value', 1000);
      expect(result).toBe('old-value');
      const value = await service.get('test-key');
      expect(value).toBe('new-value');
    });
  });

  describe('incr', () => {
    it('should increment non-existent key', async () => {
      const result = await service.incr('test-key');
      expect(result).toBe(1);
      const value = await service.get('test-key');
      expect(value).toBe(1);
    });

    it('should increment existing key', async () => {
      await service.set('test-key', 5);
      const result = await service.incr('test-key');
      expect(result).toBe(6);
      const value = await service.get('test-key');
      expect(value).toBe(6);
    });

    it('should increment by custom amount', async () => {
      await service.set('test-key', 5);
      const result = await service.incr('test-key', 10);
      expect(result).toBe(15);
      const value = await service.get('test-key');
      expect(value).toBe(15);
    });

    it('should handle negative increment', async () => {
      await service.set('test-key', 10);
      const result = await service.incr('test-key', -3);
      expect(result).toBe(7);
      const value = await service.get('test-key');
      expect(value).toBe(7);
    });

    it('should throw error for non-numeric value', async () => {
      await service.set('test-key', 'not-a-number');
      await expect(service.incr('test-key')).rejects.toThrow();
    });

    it('should handle expired key', async () => {
      await service.set('test-key', 5, 100);
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await service.incr('test-key');
      expect(result).toBe(1);
    });
  });

  describe('decr', () => {
    it('should decrement non-existent key', async () => {
      const result = await service.decr('test-key');
      expect(result).toBe(-1);
      const value = await service.get('test-key');
      expect(value).toBe(-1);
    });

    it('should decrement existing key', async () => {
      await service.set('test-key', 10);
      const result = await service.decr('test-key');
      expect(result).toBe(9);
      const value = await service.get('test-key');
      expect(value).toBe(9);
    });

    it('should decrement by custom amount', async () => {
      await service.set('test-key', 10);
      const result = await service.decr('test-key', 3);
      expect(result).toBe(7);
      const value = await service.get('test-key');
      expect(value).toBe(7);
    });

    it('should throw error for non-numeric value', async () => {
      await service.set('test-key', 'not-a-number');
      await expect(service.decr('test-key')).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return empty stats', async () => {
      const stats = await service.getStats();
      expect(stats).toBeDefined();
      expect(stats.type).toBe('memory');
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(1000);
      expect(stats.expiredCount).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should return stats with items', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      const stats = await service.getStats();
      expect(stats.size).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should count expired items', async () => {
      await service.set('key1', 'value1', 100);
      await service.set('key2', 'value2', 1000);
      await new Promise(resolve => setTimeout(resolve, 150));
      const stats = await service.getStats();
      expect(stats.expiredCount).toBe(1);
    });
  });

  describe('clearExpired', () => {
    it('should clear expired items', async () => {
      await service.set('key1', 'value1', 100);
      await service.set('key2', 'value2', 1000);
      await new Promise(resolve => setTimeout(resolve, 150));
      const count = await service.clearExpired();
      expect(count).toBe(1);
      expect(await service.exists('key1')).toBe(false);
      expect(await service.exists('key2')).toBe(true);
    });

    it('should return 0 when no expired items', async () => {
      await service.set('key1', 'value1', 10000);
      const count = await service.clearExpired();
      expect(count).toBe(0);
    });

    it('should return 0 when cache is empty', async () => {
      const count = await service.clearExpired();
      expect(count).toBe(0);
    });
  });

  describe('flush', () => {
    it('should clear all items', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');
      
      await service.flush();
      
      expect(await service.exists('key1')).toBe(false);
      expect(await service.exists('key2')).toBe(false);
      expect(await service.exists('key3')).toBe(false);
    });

    it('should handle empty cache', async () => {
      await expect(service.flush()).resolves.not.toThrow();
    });
  });

  describe('keys', () => {
    it('should return empty array for empty cache', async () => {
      const keys = await service.keys();
      expect(keys).toEqual([]);
    });

    it('should return all keys', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');
      
      const keys = await service.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should not include keys with prefix', async () => {
      await service.set('key1', 'value1');
      const keys = await service.keys();
      expect(keys).not.toContain('apijson:key1');
    });
  });

  describe('mget', () => {
    it('should return empty array for empty keys', async () => {
      const values = await service.mget([]);
      expect(values).toEqual([]);
    });

    it('should return values for multiple keys', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');
      
      const values = await service.mget(['key1', 'key2', 'key3']);
      expect(values).toEqual(['value1', 'value2', 'value3']);
    });

    it('should return null for non-existent keys', async () => {
      await service.set('key1', 'value1');
      const values = await service.mget(['key1', 'key2', 'key3']);
      expect(values).toEqual(['value1', null, null]);
    });
  });

  describe('mset', () => {
    it('should set multiple key-value pairs', async () => {
      await service.mset({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
      
      expect(await service.get('key1')).toBe('value1');
      expect(await service.get('key2')).toBe('value2');
      expect(await service.get('key3')).toBe('value3');
    });

    it('should handle empty object', async () => {
      await expect(service.mset({})).resolves.not.toThrow();
    });

    it('should work with custom TTL', async () => {
      await service.mset({
        key1: 'value1',
        key2: 'value2',
      }, 1000);
      
      expect(await service.get('key1')).toBe('value1');
      expect(await service.get('key2')).toBe('value2');
    });
  });

  describe('mdel', () => {
    it('should delete multiple keys', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');
      
      await service.mdel(['key1', 'key2']);
      
      expect(await service.exists('key1')).toBe(false);
      expect(await service.exists('key2')).toBe(false);
      expect(await service.exists('key3')).toBe(true);
    });

    it('should handle empty array', async () => {
      await expect(service.mdel([])).resolves.not.toThrow();
    });

    it('should handle non-existent keys', async () => {
      await expect(service.mdel(['key1', 'key2'])).resolves.not.toThrow();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest key when cache is full', async () => {
      // Set a small cache size for testing
      const smallCacheService = new CacheService({
        get: vi.fn(() => ({
          type: 'memory',
          maxSize: 3,
          defaultTTL: 300000,
          keyPrefix: 'apijson:',
        })),
      } as any);

      await smallCacheService.set('key1', 'value1');
      await smallCacheService.set('key2', 'value2');
      await smallCacheService.set('key3', 'value3');
      await smallCacheService.set('key4', 'value4');
      
      expect(await smallCacheService.exists('key1')).toBe(false);
      expect(await smallCacheService.exists('key2')).toBe(true);
      expect(await smallCacheService.exists('key3')).toBe(true);
      expect(await smallCacheService.exists('key4')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000);
      await service.set(longKey, 'value');
      const result = await service.get(longKey);
      expect(result).toBe('value');
    });

    it('should handle special characters in keys', async () => {
      const specialKeys = [
        'key-with-dash',
        'key_with_underscore',
        'key.with.dot',
        'key:with:colon',
        'key/with/slash',
      ];
      
      for (const key of specialKeys) {
        await service.set(key, 'value');
        expect(await service.get(key)).toBe('value');
      }
    });

    it('should handle unicode characters in values', async () => {
      const unicodeValue = '你好世界 🌍';
      await service.set('test-key', unicodeValue);
      const result = await service.get('test-key');
      expect(result).toBe(unicodeValue);
    });

    it('should handle empty string values', async () => {
      await service.set('test-key', '');
      const result = await service.get('test-key');
      expect(result).toBe('');
    });

    it('should handle zero values', async () => {
      await service.set('test-key', 0);
      const result = await service.get('test-key');
      expect(result).toBe(0);
    });

    it('should handle negative zero values', async () => {
      await service.set('test-key', -0);
      const result = await service.get('test-key');
      expect(result).toBe(-0);
    });

    it('should handle very large numbers', async () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      await service.set('test-key', largeNumber);
      const result = await service.get('test-key');
      expect(result).toBe(largeNumber);
    });

    it('should handle very small numbers', async () => {
      const smallNumber = Number.MIN_SAFE_INTEGER;
      await service.set('test-key', smallNumber);
      const result = await service.get('test-key');
      expect(result).toBe(smallNumber);
    });

    it('should handle floating point numbers', async () => {
      const floatNumber = 3.14159265359;
      await service.set('test-key', floatNumber);
      const result = await service.get('test-key');
      expect(result).toBe(floatNumber);
    });

    it('should handle scientific notation numbers', async () => {
      const sciNumber = 1.23e+10;
      await service.set('test-key', sciNumber);
      const result = await service.get('test-key');
      expect(result).toBe(sciNumber);
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent sets', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(service.set(`key${i}`, `value${i}`));
      }
      await Promise.all(promises);
      
      for (let i = 0; i < 100; i++) {
        expect(await service.get(`key${i}`)).toBe(`value${i}`);
      }
    });

    it('should handle concurrent gets', async () => {
      await service.set('test-key', 'test-value');
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(service.get('test-key'));
      }
      const results = await Promise.all(promises);
      expect(results.every(r => r === 'test-value')).toBe(true);
    });

    it('should handle concurrent increments', async () => {
      await service.set('test-key', 0);
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(service.incr('test-key'));
      }
      const results = await Promise.all(promises);
      expect(results[results.length - 1]).toBe(100);
    });
  });
});
