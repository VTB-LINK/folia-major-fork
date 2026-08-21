import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Theme } from '../../../types';
import { useSettingsUiStore } from '../../../stores/useSettingsUiStore';
import { ObsCopyUrlButton } from '../../shared/ObsCopyUrlButton';
import { ObsCopyCssButton } from '../../shared/ObsCopyCssButton';
import { buildCurrentObsUrl } from '../../../utils/currentObsUrl';
import { resolveWebObsTarget, selectWebObsSource } from '../../../utils/webObsTarget';
import { resolveObsCopyHintKey } from '../../../utils/visualSettingsConfig';

// src/components/panelTab/controls/ForkPlayerExtras.tsx
// FORK-ONLY. The player-panel additions upstream does not carry: five quick toggles that are
// re-touched per stream segment (also in Lab / Appearance settings, same store fields) and the
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
    const statusSetter = useSettingsUiStore(state => state.statusSetter);
    const transparentPlayerBackground = useSettingsUiStore(state => state.transparentPlayerBackground);
    const toggleTransparentPlayerBackground = useSettingsUiStore(state => state.handleToggleTransparentPlayerBackground);
    const autoHidePlayerChrome = useSettingsUiStore(state => state.autoHidePlayerChrome);
    const toggleAutoHidePlayerChrome = useSettingsUiStore(state => state.handleToggleAutoHidePlayerChrome);
    const hidePlayerProgressBar = useSettingsUiStore(state => state.hidePlayerProgressBar);
    const toggleHidePlayerProgressBar = useSettingsUiStore(state => state.handleToggleHidePlayerProgressBar);
    const hidePlayerTranslationSubtitle = useSettingsUiStore(state => state.hidePlayerTranslationSubtitle);
    const toggleHidePlayerTranslationSubtitle = useSettingsUiStore(state => state.handleToggleHidePlayerTranslationSubtitle);
    const showHarmonySubtitle = useSettingsUiStore(state => state.showHarmonySubtitle);
    const toggleShowHarmonySubtitle = useSettingsUiStore(state => state.handleToggleShowHarmonySubtitle);
    const toggleOffClass = isDaylight ? 'bg-black/10' : 'bg-white/10';

    // OBS static URL is a web-deploy concept, so these copy buttons are web-only.
    const isElectron = typeof window !== 'undefined' && Boolean((window as { electron?: unknown }).electron);
    const webObsSource = useSettingsUiStore(selectWebObsSource);
    const [obsUrlCopied, setObsUrlCopied] = useState(false);
    const handleCopyObsUrl = async () => {
        const target = resolveWebObsTarget();
        if (!target) return;
        const url = await buildCurrentObsUrl(target.source, target.host, target.extra);
        try {
            await navigator.clipboard.writeText(url);
            setObsUrlCopied(true);
            window.setTimeout(() => setObsUrlCopied(false), 1600);
            const hint = resolveObsCopyHintKey();
            statusSetter?.({ type: hint.type, text: t(hint.key) });
        } catch (err) {
            // The URL is built asynchronously, so a browser that requires the write to stay inside the
            // click's own task can reject here. Say so instead of leaving the button inert.
            console.error('Failed to copy OBS URL:', err);
            statusSetter?.({ type: 'error', text: t('status.copyFailed') });
        }
    };

    return (
        <>
            <div className="pt-2 border-t border-white/5 space-y-2">
                <QuickToggleRow
                    label={t('options.transparentPlayerBackground')}
                    hint={t('options.transparentPlayerBackgroundDesc')}
                    on={transparentPlayerBackground}
                    accent={theme.secondaryColor}
                    offClass={toggleOffClass}
                    onToggle={() => toggleTransparentPlayerBackground(!transparentPlayerBackground)}
                />
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

            {!isElectron && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                    <ObsCopyUrlButton
                        onCopy={handleCopyObsUrl}
                        copied={obsUrlCopied}
                        disabled={webObsSource === null}
                        containerClassName="flex w-full"
                        buttonClassName="flex-1 py-2"
                    />
                    <ObsCopyCssButton
                        disabled={webObsSource === null}
                        containerClassName="flex w-full"
                        buttonClassName="flex-1 py-2"
                    />
                </div>
            )}
        </>
    );
};

export default ForkPlayerExtras;
