import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetButton } from '../shared/Sheet';
import { NewFeaturesIntro } from './NewFeaturesIntro';
import { USER_GUIDE_AUTO_OPEN_VERSION } from './userGuideContent';
import { FORK_SOURCE_URL, FORK_SOURCE_LABEL } from '../../utils/forkSource';

// src/components/modal/ReleaseNotesDialog.tsx
// The 版本更新 dialog: what the current release brought. Opened from the Help page, and by the app
// shell on the first start of a new release.

type ReleaseNotesDialogProps = {
    isOpen: boolean;
    isDaylight: boolean;
    onClose: () => void;
};

const ReleaseNotesDialog: React.FC<ReleaseNotesDialogProps> = ({ isOpen, isDaylight, onClose }) => {
    const { t } = useTranslation();

    return (
        <Sheet
            isOpen={isOpen}
            onClose={onClose}
            isDaylight={isDaylight}
            size="m"
            title={t('help.releaseNotes')}
            // The release the notes were written for.
            subtitle={USER_GUIDE_AUTO_OPEN_VERSION ? `v${USER_GUIDE_AUTO_OPEN_VERSION}` : undefined}
            footer={<SheetButton data-testid="release-notes-close" onClick={onClose}>{t('ui.close')}</SheetButton>}
        >
            <div data-testid="release-notes-dialog">
                <NewFeaturesIntro />
                {/* fork：AGPL §13 应用内源码声明（Help 面板也常驻有一份）。 */}
                <p className="mt-6 text-center text-[11px] leading-relaxed text-[color:var(--st-t2)]">
                    {t('userGuide.agplNotice')}
                    <a href={FORK_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-current/30 hover:decoration-current transition-colors">{FORK_SOURCE_LABEL}</a>
                </p>
            </div>
        </Sheet>
    );
};

export default ReleaseNotesDialog;
