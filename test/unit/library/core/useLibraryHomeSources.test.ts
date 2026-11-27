// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type * as ReactI18next from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryAccountController, LibraryAccountSnapshot } from '@/library/core/account/account.contract';
import type { OmniProviderCapabilities, ProviderAccountSummary } from '@/types/onlineMusic';

// test/unit/library/core/useLibraryHomeSources.test.ts
// 首页来源与页签 hook 在 Web 与桌面端的门控与回退：Web 端隐藏 Folia 与在线页签/组并在运行期归正状态，
// 同时保留 Navidrome；桌面端保持 Folia 页签与冻结 TUI（folia=false）不改写 storedTab 的行为。

const translate = vi.hoisted(() => (key: string) => key);
const providerCapabilities = vi.hoisted((): { current: OmniProviderCapabilities } => ({
    current: {
        search: true,
        playback: true,
        lyrics: true,
        auth: true,
        userLibrary: true,
        playlists: true,
        albums: true,
        artists: true,
        recommendations: true,
        mutations: true,
        wordByWordLyrics: true,
        userAlbums: true,
        explore: true,
    },
}));

vi.mock('react-i18next', async importOriginal => ({
    ...(await importOriginal<typeof ReactI18next>()),
    useTranslation: () => ({ t: translate }),
}));
vi.mock('@/services/navidromeService', () => ({ getNavidromeConfig: vi.fn(() => null), navidromeApi: {} }));
vi.mock('@/services/onlineMusic/omni', () => ({ omni: {} }));
vi.mock('@/library/core/home/online/onlineHomeProvider.service', () => ({
    readOnlineProviderCapabilities: () => providerCapabilities.current,
    readOnlineProviderLabel: (providerId: string) => `Label(${providerId})`,
}));
vi.mock('@/hooks/usePersonalFmCatalog', () => ({
    usePersonalFmCatalog: () => null,
}));
vi.mock('@/services/localLibraryAvailability', () => ({
    getLocalLibraryAvailability: () => ({ supported: true, reason: null }),
}));
vi.mock('@/services/onlineMusic/sourceReadiness', () => ({
    builtinSourcesSettled: () => Promise.resolve(),
}));

import { useLibraryHomeSources, type LibraryHomeSources } from '@/library/core/home/useLibraryHomeSources';
import { useHomeLayoutSettingsStore } from '@/stores/useHomeLayoutSettingsStore';
import { useSearchNavigationStore } from '@/stores/useSearchNavigationStore';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const setElectron = (present: boolean) => {
    const target = window as { electron?: unknown };
    if (present) target.electron = {};
    else delete target.electron;
};

const createAccount = (): LibraryAccountController => {
    const provider: ProviderAccountSummary = {
        providerId: 'p',
        displayName: 'Provider P',
        shortName: 'P',
        availability: { configured: true },
        status: 'authenticated',
        user: { id: 1, nickname: 'U' },
        collections: [],
    };
    const snapshot: LibraryAccountSnapshot = {
        providers: [provider],
        activeProviderId: 'p',
        login: null,
        setup: null,
        pendingSwitch: null,
        logout: { providerId: null, status: 'idle' },
        sync: { providerId: null, status: 'idle' },
        lastLoginCompletion: null,
    };
    return {
        getSnapshot: () => snapshot,
        subscribe: () => () => {},
    } as unknown as LibraryAccountController;
};

let root: Root | null = null;

const renderSources = async (options: { folia?: boolean; navidromeEnabled?: boolean } = {}) => {
    const account = createAccount();
    let latest: LibraryHomeSources | null = null;
    const Probe = () => {
        latest = useLibraryHomeSources({
            account,
            folia: options.folia,
            navidromeEnabled: options.navidromeEnabled,
        });
        return null;
    };
    root = createRoot(document.createElement('div'));
    await act(async () => {
        root!.render(React.createElement(Probe));
        await Promise.resolve();
    });
    return () => latest!;
};

describe('useLibraryHomeSources web/desktop gating', () => {
    beforeEach(() => {
        localStorage.clear();
        setElectron(false);
        providerCapabilities.current = {
            ...providerCapabilities.current,
            explore: true,
        };
        useHomeLayoutSettingsStore.setState({
            showHomeTabFolia: true,
            showHomeTabPlaylist: true,
            showHomeTabRadio: true,
            showHomeTabExplore: true,
            showHomeTabAlbums: true,
            showHomeTabLocal: true,
        });
        useSearchNavigationStore.setState({
            homeViewTab: 'local',
            homeOnlineTab: 'playlist',
        });
    });

    afterEach(() => {
        act(() => root?.unmount());
        root = null;
        setElectron(false);
    });

    it('hides Folia and online tabs/groups on the web and normalizes stored Folia or online tabs to local', async () => {
        useSearchNavigationStore.setState({ homeViewTab: 'folia', homeOnlineTab: 'radio' });

        const read = await renderSources({ folia: true, navidromeEnabled: false });

        expect(read().tabs.map(tab => tab.key)).toEqual(['local']);
        expect(read().groups.map(group => group.key)).toEqual(['local']);
        expect(read().tab).toBe('local');
        expect(read().group).toBe('local');
        expect(read().isOnlineTab).toBe(false);
        expect(useSearchNavigationStore.getState().homeViewTab).toBe('local');

        // Runtime switch to an online tab (including explore when unsupported) also lands on local, not playlist.
        providerCapabilities.current = { ...providerCapabilities.current, explore: false };
        act(() => { useSearchNavigationStore.getState().setHomeViewTab('explore'); });
        expect(read().tab).toBe('local');
        expect(useSearchNavigationStore.getState().homeViewTab).toBe('local');

        act(() => { useSearchNavigationStore.getState().setHomeViewTab('radio'); });
        expect(read().tab).toBe('local');
        expect(useSearchNavigationStore.getState().homeViewTab).toBe('local');
    });

    it('keeps navidrome active on the web when enabled', async () => {
        useSearchNavigationStore.setState({ homeViewTab: 'navidrome' });

        const read = await renderSources({ folia: true, navidromeEnabled: true });

        expect(read().tabs.map(tab => tab.key)).toEqual(['local', 'navidrome']);
        expect(read().groups.map(group => group.key)).toEqual(['local', 'navidrome']);
        expect(read().tab).toBe('navidrome');
        expect(read().group).toBe('navidrome');
        expect(useSearchNavigationStore.getState().homeViewTab).toBe('navidrome');
    });

    it('keeps Folia and online tabs/groups in the desktop app when folia is enabled', async () => {
        setElectron(true);
        useSearchNavigationStore.setState({ homeViewTab: 'folia', homeOnlineTab: 'radio' });

        const read = await renderSources({ folia: true, navidromeEnabled: true });

        expect(read().tabs.map(tab => tab.key)).toEqual(['folia', 'playlist', 'radio', 'explore', 'albums', 'local', 'navidrome']);
        expect(read().groups.map(group => group.key)).toEqual(['folia', 'online', 'local', 'navidrome']);
        expect(read().tab).toBe('folia');
        expect(read().group).toBe('folia');
        expect(useSearchNavigationStore.getState().homeViewTab).toBe('folia');
    });

    it('in the desktop app frozen TUI (folia=false) displays rememberedOnlineTab without overwriting stored folia', async () => {
        setElectron(true);
        useSearchNavigationStore.setState({ homeViewTab: 'folia', homeOnlineTab: 'radio' });

        const read = await renderSources({ folia: false, navidromeEnabled: false });

        expect(read().tabs.map(tab => tab.key)).toEqual(['playlist', 'radio', 'explore', 'albums', 'local']);
        expect(read().tab).toBe('radio');
        expect(read().isOnlineTab).toBe(true);
        expect(useSearchNavigationStore.getState().homeViewTab).toBe('folia');
    });
});
