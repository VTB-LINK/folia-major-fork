import { describe, expect, it } from 'vitest';
import { useSettingsUiStore } from '@/stores/useSettingsUiStore';

// test/unit/stores/useSettingsUiStore.defaults.test.ts
// Guards the fork-specific initial defaults against silent upstream drift. Upstream owns these
// getStoredBoolean fallbacks, so a sync merge that refactors the surrounding initializer could
// reset our values without producing a textual conflict -- and neither tsc nor the build would
// catch it. Under the node test environment window is undefined, so getStoredBoolean returns the
// fallback and getState() reflects the baked-in defaults directly.
describe('useSettingsUiStore fork defaults', () => {
    it('hides the player progress bar by default', () => {
        expect(useSettingsUiStore.getState().hidePlayerProgressBar).toBe(true);
    });

    it('hides the player translation subtitle by default', () => {
        expect(useSettingsUiStore.getState().hidePlayerTranslationSubtitle).toBe(true);
    });

    it('leaves the harmony subtitle off by default', () => {
        expect(useSettingsUiStore.getState().showHarmonySubtitle).toBe(false);
    });
});
