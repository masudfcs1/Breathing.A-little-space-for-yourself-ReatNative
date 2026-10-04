import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getItem, setItem } = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem, setItem } }));

import { createInitialData, loadAppData, persistAppData, RECOVERY_STORAGE_KEY, STORAGE_KEY } from './index';

beforeEach(() => { getItem.mockReset(); setItem.mockReset(); setItem.mockResolvedValue(undefined); });

describe('local persistence', () => {
  it('starts with empty real history and isolated preview mode', async () => {
    getItem.mockResolvedValue(null);
    expect(await loadAppData()).toMatchObject({ realSessions: [], demoMode: true });
    expect(setItem).not.toHaveBeenCalled();
  });

  it('retains malformed data in a recovery key before reporting a hydration error', async () => {
    getItem.mockResolvedValue('{broken json');
    await expect(loadAppData()).rejects.toThrow('valid JSON');
    expect(setItem).toHaveBeenCalledWith(RECOVERY_STORAGE_KEY, '{broken json');
    expect(setItem).not.toHaveBeenCalledWith(STORAGE_KEY, expect.anything());
  });

  it('serializes writes and allows a later retry after a storage failure', async () => {
    const order: string[] = [];
    let completeFirst!: () => void;
    setItem.mockImplementationOnce(() => new Promise<void>((resolve) => { order.push('first-start'); completeFirst = () => { order.push('first-finish'); resolve(); }; }));
    setItem.mockImplementationOnce(async () => { order.push('second-start'); throw new Error('Storage full'); });
    setItem.mockImplementationOnce(async () => { order.push('retry-start'); });
    const first = persistAppData(createInitialData());
    const second = persistAppData({ ...createInitialData(), demoMode: false });
    const rejected = expect(second).rejects.toThrow('Storage full');
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(['first-start']);
    completeFirst();
    await first;
    await rejected;
    await persistAppData({ ...createInitialData(), demoMode: false });
    expect(order).toEqual(['first-start', 'first-finish', 'second-start', 'retry-start']);
    expect(setItem.mock.calls[2][0]).toBe(STORAGE_KEY);
    expect(JSON.parse(setItem.mock.calls[2][1]).demoMode).toBe(false);
  });
});
