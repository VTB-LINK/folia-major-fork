// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// test/unit/search/homeViewTabMemory.test.ts
// 首页两级页签存下来的东西：上次停在哪一页（last_home_view_tab，键与取值都是平铺页签时代的）、在线组上次停在哪一页
// （last_home_online_tab，新键）。旧版本存的六个值升级后原样落在对应的组与页上，一个不丢。

vi.mock('@/services/navidromeService', () => ({ getNavidromeConfig: vi.fn(() => null), navidromeApi: {} }));
vi.mock('@/services/onlineMusic/omni', () => ({ omni: {} }));

const loadStore = async () => {
    vi.resetModules();
    return (await import('@/stores/useSearchNavigationStore')).useSearchNavigationStore;
};

const setElectron = (present: boolean) => {
    const target = window as { electron?: unknown };
    if (present) target.electron = {};
    else delete target.electron;
};

describe('home view tab memory', () => {
    beforeEach(() => {
        localStorage.clear();
        // 本 fork 在 web 上把存下的在线页落到本地页（useSearchNavigationStore 的 getInitialHomeViewTab），
        // 这里按桌面端测上游的行为。
        setElectron(true);
    });

    afterEach(() => {
        setElectron(false);
    });

    // 本 fork：web 版不显示在线页，存下的在线页或未知值都落到本地页；Folia 页照旧。
    it.each([['radio', 'local'], ['somewhere', 'local'], ['folia', 'folia']] as const)(
        'on the web a stored %s opens on %s',
        async (saved, expected) => {
            setElectron(false);
            localStorage.setItem('last_home_view_tab', saved);
            expect((await loadStore()).getState().homeViewTab).toBe(expected);
        },
    );

    it.each(['playlist', 'radio', 'albums', 'explore', 'local', 'navidrome'] as const)(
        'a stored %s from before two-level tabs is still the page the home opens on',
        async (saved) => {
            localStorage.setItem('last_home_view_tab', saved);
            const store = await loadStore();
            expect(store.getState().homeViewTab).toBe(saved);
        },
    );

    it('with no online page remembered yet, the online group starts on the stored page when that is an online one', async () => {
        localStorage.setItem('last_home_view_tab', 'albums');
        expect((await loadStore()).getState().homeOnlineTab).toBe('albums');
    });

    it('and on the playlists when the stored page is in another group', async () => {
        localStorage.setItem('last_home_view_tab', 'local');
        const store = await loadStore();
        expect(store.getState().homeViewTab).toBe('local');
        expect(store.getState().homeOnlineTab).toBe('playlist');
    });

    it('an unknown stored value falls back to the playlists', async () => {
        localStorage.setItem('last_home_view_tab', 'somewhere');
        localStorage.setItem('last_home_online_tab', 'local');
        const store = await loadStore();
        expect(store.getState().homeViewTab).toBe('playlist');
        expect(store.getState().homeOnlineTab).toBe('playlist');
    });

    it('remembers the online page across a visit to another group, and keeps the Folia page', async () => {
        const store = await loadStore();
        store.getState().setHomeViewTab('radio');
        store.getState().setHomeViewTab('local');
        expect(store.getState().homeOnlineTab).toBe('radio');
        expect(localStorage.getItem('last_home_online_tab')).toBe('radio');
        expect(localStorage.getItem('last_home_view_tab')).toBe('local');

        store.getState().setHomeViewTab('folia');
        const reloaded = await loadStore();
        expect(reloaded.getState().homeViewTab).toBe('folia');
        expect(reloaded.getState().homeOnlineTab).toBe('radio');
    });
});
