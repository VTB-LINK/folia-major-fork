import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpDown, Check, Moon, RefreshCw, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Theme, ThemeMode, VisualizerMode } from '../../types';
import type { ThemeSourceModel } from '../../hooks/themeControllerState';
import { useThemeQuickEditorStore } from '../../stores/useThemeQuickEditorStore';
import { useThemeSyncAction } from '../../hooks/useThemeSyncAction';
import AudioEqualizerDialog from './AudioEqualizerDialog';
import AppearanceSection from './controls/AppearanceSection';
import SongActionRow from './controls/SongActionRow';
import VolumeRow from './controls/VolumeRow';
import { useSettingsUiStore } from '../../stores/useSettingsUiStore';
import { ObsCopyUrlButton } from '../shared/ObsCopyUrlButton';
import { ObsCopyCssButton } from '../shared/ObsCopyCssButton';
import { buildCurrentObsUrl } from '../../utils/currentObsUrl';
import { resolveWebObsTarget, selectWebObsSource } from '../../utils/webObsTarget';
import { resolveObsCopyHintKey } from '../../utils/visualSettingsConfig';

// src/components/panelTab/ControlsTab.tsx
// 控制标签页只负责装配：歌曲动作、音量、外观区，以及底部的当前主题行。

interface ControlsTabProps {
    loopMode: 'off' | 'all' | 'one';
    onToggleLoop: () => void;
    onLike: () => void;
    isLiked: boolean;
    likeDisabled?: boolean;
    likeDisabledReason?: string;
    onGenerateAITheme: () => void;
    isGeneratingTheme: boolean;
    canGenerateAITheme: boolean;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    bgMode: ThemeMode;
    onBgModeChange: (mode: ThemeMode) => void;
    hasCustomTheme: boolean;
    themeSourceModel: ThemeSourceModel;
    defaultTheme: Theme;
    daylightTheme: Theme;
    visualizerMode: VisualizerMode;
    onVisualizerModeChange: (mode: VisualizerMode) => void;
    useCoverColorBg: boolean;
    onToggleCoverColorBg: (enable: boolean) => void;
    isDaylight: boolean;
    onToggleDaylight: () => void;
    volume: number;
    isMuted: boolean;
    onVolumePreview: (val: number) => void;
    onVolumeChange: (val: number) => void;
    onToggleMute: () => void;
    loopToggleDisabled?: boolean;
    onClosePanel?: () => void;
}

// FORK-ONLY. Compact label + switch row for the player panel's quick toggles, borrowing the settings
// modal's switch sized to this panel. Module scope so toggling one row does not remount the others.
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

const ControlsTab: React.FC<ControlsTabProps> = ({
    loopMode,
    onToggleLoop,
    onLike,
    isLiked,
    likeDisabled = false,
    likeDisabledReason,
    onGenerateAITheme,
    isGeneratingTheme,
    canGenerateAITheme,
    theme,
    onThemeChange,
    onBgModeChange,
    hasCustomTheme,
    themeSourceModel,
    defaultTheme,
    daylightTheme,
    visualizerMode,
    onVisualizerModeChange,
    useCoverColorBg,
    onToggleCoverColorBg,
    isDaylight,
    onToggleDaylight,
    volume,
    isMuted,
    onVolumePreview,
    onVolumeChange,
    onToggleMute,
    loopToggleDisabled = false,
    onClosePanel,
}) => {
    const { t } = useTranslation();
    const openThemeQuickEditor = useThemeQuickEditorStore(state => state.openEditor);
    const { themeSyncState, runThemeSync } = useThemeSyncAction();

    // FORK-ONLY. Player-UI quick toggles + OBS copy buttons, surfaced in the player panel (the "老地方")
    // because they are re-touched per stream segment. The five toggles also live in Lab / Appearance
    // settings (same store fields); the OBS URL/CSS copy is web-only. Upstream declined these in the panel.
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

    const formatThemeDisplayName = (name: string) => {
        if (themeSourceModel.activeSource !== 'default') {
            return name;
        }

        return name === defaultTheme.name
            ? t('theme.midnightDefault')
            : (name === daylightTheme.name ? t('theme.daylightDefault') : name);
    };

    const activeThemeSource = themeSourceModel.current;
    const currentEditableSource = themeSourceModel.editableSource;
    const themeDisplayName = formatThemeDisplayName(activeThemeSource.label || theme.name);

    const openCurrentThemeQuickEditor = () => {
        if (currentEditableSource) {
            openThemeQuickEditor(currentEditableSource);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
        >
            <div className="space-y-4">
                <SongActionRow
                    loopMode={loopMode}
                    onToggleLoop={onToggleLoop}
                    loopToggleDisabled={loopToggleDisabled}
                    onLike={onLike}
                    isLiked={isLiked}
                    likeDisabled={likeDisabled}
                    likeDisabledReason={likeDisabledReason}
                    onGenerateAITheme={onGenerateAITheme}
                    isGeneratingTheme={isGeneratingTheme}
                    canGenerateAITheme={canGenerateAITheme}
                    themeSourceModel={themeSourceModel}
                    isDaylight={isDaylight}
                />

                <div className="pt-2 border-t border-white/5 space-y-3">
                    <VolumeRow
                        volume={volume}
                        isMuted={isMuted}
                        onVolumePreview={onVolumePreview}
                        onVolumeChange={onVolumeChange}
                        onToggleMute={onToggleMute}
                        theme={theme}
                        isDaylight={isDaylight}
                    />

                    <AppearanceSection
                        theme={theme}
                        onThemeChange={onThemeChange}
                        isDaylight={isDaylight}
                        visualizerMode={visualizerMode}
                        onVisualizerModeChange={onVisualizerModeChange}
                        useCoverColorBg={useCoverColorBg}
                        onToggleCoverColorBg={onToggleCoverColorBg}
                        themeSourceModel={themeSourceModel}
                        onBgModeChange={onBgModeChange}
                        hasCustomTheme={hasCustomTheme}
                        defaultTheme={defaultTheme}
                        daylightTheme={daylightTheme}
                        onClosePanel={onClosePanel}
                    />
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onToggleDaylight}
                            className={`rounded-md p-1 transition-all ${isDaylight ? 'text-amber-500' : 'text-blue-300'}`}
                            title={isDaylight ? t('theme.switchToDark') : t('theme.switchToLight')}
                            aria-label={isDaylight ? t('theme.switchToDark') : t('theme.switchToLight')}
                        >
                            {isDaylight ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        {currentEditableSource ? (
                            <button
                                type="button"
                                onClick={openCurrentThemeQuickEditor}
                                className={`max-w-[120px] truncate rounded-md px-1.5 py-1 text-left text-xs font-bold transition-colors ${isDaylight ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
                                title={currentEditableSource === 'custom'
                                    ? (t('options.customThemeQuickEditTitle') || 'Edit Custom Theme')
                                    : (t('options.aiThemeQuickEditTitle') || 'Edit AI Theme')}
                            >
                                {themeDisplayName}
                            </button>
                        ) : (
                            <span className="text-xs font-bold truncate max-w-[120px]">
                                {themeDisplayName}
                            </span>
                        )}
                        {themeSourceModel.activeSource !== 'default' && (
                            <button
                                onClick={() => void runThemeSync()}
                                disabled={themeSyncState === 'syncing'}
                                className={`p-1 rounded-full ${isDaylight ? 'hover:bg-black/10' : 'hover:bg-white/10'} transition-colors disabled:cursor-wait`}
                                title={themeSyncState === 'syncing'
                                    ? t('options.syncing')
                                    : themeSyncState === 'complete'
                                        ? t('ui.synced')
                                        : t('commandPalette.commands.sync-now.title')}
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.span
                                        key={themeSyncState}
                                        initial={{ opacity: 0, scale: 0.55, rotate: -35 }}
                                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                        exit={{ opacity: 0, scale: 0.55, rotate: 35 }}
                                        transition={{ duration: 0.16, ease: 'easeOut' }}
                                        className="block"
                                    >
                                        {themeSyncState === 'syncing' ? (
                                            <RefreshCw size={12} className="animate-spin" />
                                        ) : themeSyncState === 'complete' ? (
                                            <Check size={12} className="text-green-500" strokeWidth={3} />
                                        ) : (
                                            <ArrowUpDown size={12} />
                                        )}
                                    </motion.span>
                                </AnimatePresence>
                            </button>
                        )}
                    </div>
                </div>

                {/* FORK-ONLY. Player-UI quick toggles (also in Lab / Appearance settings). */}
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

                {/* FORK-ONLY. Web-only OBS copy buttons (URL + Custom CSS for uploaded assets). */}
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

            </div>

            <AudioEqualizerDialog isDaylight={isDaylight} theme={theme} />

        </motion.div>
    );
};

export default ControlsTab;
