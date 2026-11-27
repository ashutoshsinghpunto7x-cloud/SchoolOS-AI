import { describe, it, expect } from 'vitest';
import { exportAnswer } from './principal-assistant.export';

const text = 'Fee defaulters: 3 students\n- Riya (6A): ₹4,500 due\n- Aman (7B): ₹2,000 due\n- Sana (8A): ₹9,000 due';

describe('exportAnswer', () => {
  it('builds a PDF', async () => {
    const f = await exportAnswer({ title: 'Fee defaulters', text, format: 'pdf' });
    expect(f.buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(f.fileName).toMatch(/^Fee_defaulters_.*\.pdf$/);
  });
  it('builds an Excel file', async () => {
    const f = await exportAnswer({ title: 'Fee defaulters', text, format: 'xlsx' });
    expect(f.buffer.subarray(0, 2).toString()).toBe('PK');
  });
  it('rejects empty text', async () => {
    await expect(exportAnswer({ title: 'x', text: '', format: 'pdf' })).rejects.toThrow();
  });
});
