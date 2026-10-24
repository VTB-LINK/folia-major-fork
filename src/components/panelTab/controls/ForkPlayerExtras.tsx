import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Theme } from '../../../types';
import { usePlayerChromeSettingsStore } from '../../../stores/usePlayerChromeSettingsStore';
import { useTypographySettingsStore } from '../../../stores/useTypographySettingsStore';
import { useStageSettingsStore } from '../../../stores/useStageSettingsStore';
import { selectWebObsSource } from '../../../services/obs/webObsTarget';
import ObsLinkRows from '../../modal/settings/pages/ObsLinkRows';

// src/components/panelTab/controls/ForkPlayerExtras.tsx
// FORK-ONLY. The player-panel additions upstream does not carry: four quick toggles that are
// re-touched per stream segment (also in Lab / Appearance settings, same store fields; the fifth,
// the transparent player background, now sits in upstream's own AppearanceSection) and the
// web-only OBS copy buttons (URL + Custom CSS for uploaded assets). Kept in its own component so an
// upstream ControlsTab refactor only needs the single <ForkPlayerExtras/> line re-added, not the
// whole block re-ported. Upstream declined these in the panel on review (#189).

// Compact label + switch row, borrowing the settings modal's switch sized to this panel. Module
// scope so toggling one row does not remount the others.
const QuickToggleRow: React.FC<{
    label: string;
    hint: string;
    on: boolean;
    accent?: string;
    offClass: string;
    onToggle: () => void;
}> = ({ label, hint, on, accent, offClass, onToggle }) => (
    <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest truncate" title={hint}>
            {label}
        </span>
        <button
            type="button"
            onClick={onToggle}
            role="switch"
            aria-checked={on}
            aria-label={label}
            title={hint}
            className={`w-9 h-5 shrink-0 rounded-full p-0.5 transition-colors ${on ? '' : offClass}`}
            style={{ backgroundColor: on ? (accent || 'rgba(114, 119, 134, 1)') : undefined }}
        >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
    </div>
);

interface ForkPlayerExtrasProps {
    theme: Theme;
    isDaylight: boolean;
}

const ForkPlayerExtras: React.FC<ForkPlayerExtrasProps> = ({ theme, isDaylight }) => {
    const { t } = useTranslation();
    const autoHidePlayerChrome = usePlayerChromeSettingsStore(state => state.autoHidePlayerChrome);
    const toggleAutoHidePlayerChrome = usePlayerChromeSettingsStore(state => state.handleToggleAutoHidePlayerChrome);
    const hidePlayerProgressBar = usePlayerChromeSettingsStore(state => state.hidePlayerProgressBar);
    const toggleHidePlayerProgressBar = usePlayerChromeSettingsStore(state => state.handleToggleHidePlayerProgressBar);
    const hidePlayerTranslationSubtitle = useTypographySettingsStore(state => state.hidePlayerTranslationSubtitle);
    const toggleHidePlayerTranslationSubtitle = useTypographySettingsStore(state => state.handleToggleHidePlayerTranslationSubtitle);
    const showHarmonySubtitle = useTypographySettingsStore(state => state.showHarmonySubtitle);
    const toggleShowHarmonySubtitle = useTypographySettingsStore(state => state.handleToggleShowHarmonySubtitle);
    const toggleOffClass = isDaylight ? 'bg-black/10' : 'bg-white/10';

    // OBS static URL is a web-deploy concept, so these copy buttons are web-only.
    const isElectron = typeof window !== 'undefined' && Boolean((window as { electron?: unknown }).electron);
    const webObsSource = useStageSettingsStore(selectWebObsSource);

    return (
        <>
            <div className="pt-2 border-t border-white/5 space-y-2">
                <QuickToggleRow
                    label={t('options.autoHidePlayerChrome')}
                    hint={t('options.autoHidePlayerChromeDesc')}
                    on={autoHidePlayerChrome}
                    accent={theme.secondaryColor}
                    offClass={toggleOffClass}
                    onToggle={() => toggleAutoHidePlayerChrome(!autoHidePlayerChrome)}
                />
                <QuickToggleRow
                    label={t('options.hidePlayerProgressBar')}
                    hint={t('options.hidePlayerProgressBar')}
                    on={hidePlayerProgressBar}
                    accent={theme.secondaryColor}
                    offClass={toggleOffClass}
                    onToggle={() => toggleHidePlayerProgressBar(!hidePlayerProgressBar)}
                />
                <QuickToggleRow
                    label={t('options.hidePlayerTranslationSubtitle')}
                    hint={t('options.hidePlayerTranslationSubtitleDesc')}
                    on={hidePlayerTranslationSubtitle}
                    accent={theme.secondaryColor}
                    offClass={toggleOffClass}
                    onToggle={() => toggleHidePlayerTranslationSubtitle(!hidePlayerTranslationSubtitle)}
                />
                <QuickToggleRow
                    label={t('options.showHarmonySubtitle')}
                    hint={t('options.showHarmonySubtitleDesc')}
                    on={showHarmonySubtitle}
                    accent={theme.secondaryColor}
                    offClass={toggleOffClass}
                    onToggle={() => toggleShowHarmonySubtitle(!showHarmonySubtitle)}
                />
            </div>

            {/* 与设置里同一组 OBS 链接行（主题模式、复制链接、有上传图片时复制 CSS）；链接是给舞台源的，
                没有开着的 web 舞台源时不显示。 */}
            {!isElectron && webObsSource !== null && (
                <div className="pt-2 border-t border-white/5">
                    <ObsLinkRows />
                </div>
            )}
        </>
    );
};

export default ForkPlayerExtras;
