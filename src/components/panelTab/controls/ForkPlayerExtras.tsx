import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerChromeSettingsStore } from '../../../stores/usePlayerChromeSettingsStore';
import { useTypographySettingsStore } from '../../../stores/useTypographySettingsStore';
import { useStageSettingsStore } from '../../../stores/useStageSettingsStore';
import { selectWebObsSource } from '../../../services/obs/webObsTarget';
import { Toggle } from '../../modal/settings/kit';
import ObsLinkRows from '../../modal/settings/pages/ObsLinkRows';

// src/components/panelTab/controls/ForkPlayerExtras.tsx
// FORK-ONLY. The player-panel additions upstream does not carry: four quick toggles that are
// re-touched per stream segment (also in Lab / Appearance settings, same store fields; the fifth,
// the transparent player background, now sits in upstream's own AppearanceSection) and the
// web-only OBS copy buttons (URL + Custom CSS for uploaded assets). Kept in its own component so an
// upstream ControlsTab refactor only needs the single <ForkPlayerExtras/> line re-added, not the
// whole block re-ported. Upstream declined these in the panel on review (#189).

// The same row upstream draws for the transparent-player-background switch in AppearanceSection, so
// the panel reads as one set. Module scope so toggling one row does not remount the others.
const QuickToggleRow: React.FC<{
    label: string;
    hint: string;
    on: boolean;
    onChange: (enable: boolean) => void;
}> = ({ label, hint, on, onChange }) => {
    const labelId = useId();
    return (
        <div className="flex min-h-11 items-center gap-3 py-1.5" title={hint}>
            <span id={labelId} className="min-w-0 flex-1 text-sm leading-5">{label}</span>
            <Toggle checked={on} onChange={onChange} labelledBy={labelId} />
        </div>
    );
};

const ForkPlayerExtras: React.FC = () => {
    const { t } = useTranslation();
    const autoHidePlayerChrome = usePlayerChromeSettingsStore(state => state.autoHidePlayerChrome);
    const toggleAutoHidePlayerChrome = usePlayerChromeSettingsStore(state => state.handleToggleAutoHidePlayerChrome);
    const hidePlayerProgressBar = usePlayerChromeSettingsStore(state => state.hidePlayerProgressBar);
    const toggleHidePlayerProgressBar = usePlayerChromeSettingsStore(state => state.handleToggleHidePlayerProgressBar);
    const hidePlayerTranslationSubtitle = useTypographySettingsStore(state => state.hidePlayerTranslationSubtitle);
    const toggleHidePlayerTranslationSubtitle = useTypographySettingsStore(state => state.handleToggleHidePlayerTranslationSubtitle);
    const showHarmonySubtitle = useTypographySettingsStore(state => state.showHarmonySubtitle);
    const toggleShowHarmonySubtitle = useTypographySettingsStore(state => state.handleToggleShowHarmonySubtitle);

    // OBS static URL is a web-deploy concept, so these copy buttons are web-only.
    const isElectron = typeof window !== 'undefined' && Boolean((window as { electron?: unknown }).electron);
    const webObsSource = useStageSettingsStore(selectWebObsSource);

    return (
        <>
            <div className="pt-1 border-t border-white/5">
                <QuickToggleRow
                    label={t('options.autoHidePlayerChrome')}
                    hint={t('options.autoHidePlayerChromeDesc')}
                    on={autoHidePlayerChrome}
                    onChange={toggleAutoHidePlayerChrome}
                />
                <QuickToggleRow
                    label={t('options.hidePlayerProgressBar')}
                    hint={t('options.hidePlayerProgressBar')}
                    on={hidePlayerProgressBar}
                    onChange={toggleHidePlayerProgressBar}
                />
                <QuickToggleRow
                    label={t('options.hidePlayerTranslationSubtitle')}
                    hint={t('options.hidePlayerTranslationSubtitleDesc')}
                    on={hidePlayerTranslationSubtitle}
                    onChange={toggleHidePlayerTranslationSubtitle}
                />
                <QuickToggleRow
                    label={t('options.showHarmonySubtitle')}
                    hint={t('options.showHarmonySubtitleDesc')}
                    on={showHarmonySubtitle}
                    onChange={toggleShowHarmonySubtitle}
                />
            </div>

            {/* 与设置里同一组 OBS 链接行（主题模式、复制链接、有上传图片时复制 CSS）；链接是给舞台源的，
                没有开着的 web 舞台源时不显示。 */}
            {!isElectron && webObsSource !== null && (
                <div className="mt-2">
                    <ObsLinkRows />
                </div>
            )}
        </>
    );
};

export default ForkPlayerExtras;
