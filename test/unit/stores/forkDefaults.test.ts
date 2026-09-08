import { describe, expect, it } from 'vitest';
import { usePlayerChromeSettingsStore } from '@/stores/usePlayerChromeSettingsStore';
import { useTypographySettingsStore } from '@/stores/useTypographySettingsStore';

// test/unit/stores/forkDefaults.test.ts
// Guards the fork-specific initial defaults against silent upstream drift. Upstream owns these
// getStoredBoolean fallbacks (split out of the former useSettingsUiStore into the domain stores
// below), so a sync merge that refactors the surrounding initializer could reset our values
// without producing a textual conflict -- and neither tsc nor the build would catch it. Under the
// node test environment window is undefined, so getStoredBoolean returns the fallback and
// getState() reflects the baked-in defaults directly.
describe('fork store defaults', () => {
    it('hides the player progress bar by default', () => {
        expect(usePlayerChromeSettingsStore.getState().hidePlayerProgressBar).toBe(true);
    });

    it('hides the player translation subtitle by default', () => {
        expect(useTypographySettingsStore.getState().hidePlayerTranslationSubtitle).toBe(true);
    });

    it('leaves the harmony subtitle off by default', () => {
        expect(useTypographySettingsStore.getState().showHarmonySubtitle).toBe(false);
    });
});
