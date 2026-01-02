/**
 * 测试验证器修复 - 验证 * 字符是否被正确处理
 */

import { VerifierService } from '../src/modules/verifier/verifier.service';

describe('VerifierService - * 字符处理', () => {
  let verifierService: VerifierService;

  beforeAll(() => {
    verifierService = new VerifierService();
  });

  describe('verifyColumns', () => {
    it('应该允许 * 作为列名（SQL 通配符）', async () => {
      const errors = await (verifierService as any).verifyColumns(['*']);
      expect(errors).toHaveLength(0);
    });

    it('应该允许字符串中的 *', async () => {
      const errors = await (verifierService as any).verifyColumns('*');
      expect(errors).toHaveLength(0);
    });

    it('应该允许包含 * 的列列表', async () => {
      const errors = await (verifierService as any).verifyColumns(['id', 'name', '*']);
      expect(errors).toHaveLength(0);
    });

    it('应该拒绝包含其他非法字符的列名', async () => {
      const errors = await (verifierService as any).verifyColumns(['id<name']);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('包含非法字符');
    });
  });

  describe('verifyGroup', () => {
    it('应该允许 * 作为分组字段', async () => {
      const errors = await (verifierService as any).verifyGroup(['*']);
      expect(errors).toHaveLength(0);
    });

    it('应该允许包含 * 的分组列表', async () => {
      const errors = await (verifierService as any).verifyGroup(['id', 'name', '*']);
      expect(errors).toHaveLength(0);
    });
  });

  describe('verifyOrder', () => {
    it('应该允许 * 作为排序字段', async () => {
      const errors = await (verifierService as any).verifyOrder(['*']);
      expect(errors).toHaveLength(0);
    });

    it('应该允许包含 * 的排序列表', async () => {
      const errors = await (verifierService as any).verifyOrder(['id+', 'name-', '*']);
      expect(errors).toHaveLength(0);
    });
  });
});
