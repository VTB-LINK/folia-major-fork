import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AI_PROVIDER_PRESETS } from '../../../../services/aiText';
import { getWebAiConfig, setWebAiConfig, type WebAiConfig } from '../../../../services/webAiConfig';
import { Group, Row, Segmented, TextField, option, type SettingsGroupDef, type SettingsOptionDef } from '../kit';

// src/components/modal/settings/pages/ForkWebAiSettings.tsx
// FORK-ONLY. 纯 web 的 AI 主题连接：用户自带 key，只存于本机浏览器（services/webAiConfig），主题请求经
// SWA 无密钥中继（swa-api/）转发。桌面端由 ai/AiProviderSettings 配置（key 存主进程），两者互斥。
// 外观页在非桌面端挂载它；分组经 available 让桌面端的设置搜索略过。

const isDesktopApp = () => typeof window !== 'undefined' && Boolean(window.electron);

const WEB_AI: SettingsGroupDef = { id: 'forkWebAi', titleKey: 'options.electronSettings', available: () => !isDesktopApp() };
const O = {
    provider: option(WEB_AI, 'forkWebAiProvider', 'options.aiProvider'),
    geminiKey: option(WEB_AI, 'forkWebAiGeminiKey', 'options.geminiApiKey'),
    url: option(WEB_AI, 'forkWebAiOpenaiUrl', 'options.aiApiUrl'),
    model: option(WEB_AI, 'forkWebAiOpenaiModel', 'options.aiModel'),
    key: option(WEB_AI, 'forkWebAiOpenaiKey', 'options.aiApiKey'),
};
export const FORK_WEB_AI_OPTIONS: SettingsOptionDef[] = Object.values(O);

// 示例地址取自 provider 注册表：服务地址只写在 services/aiText 背后（aiTextArchitecture.test.ts）。
const presetBaseUrl = (id: string) => AI_PROVIDER_PRESETS.find(preset => preset.id === id)?.baseUrl ?? '';
const OPENAI_URL_PLACEHOLDER = `${presetBaseUrl('openai')} or ${presetBaseUrl('deepseek')}`;

const PROVIDERS: ReadonlyArray<{ value: WebAiConfig['provider']; label: string }> = [
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'openai', label: 'OpenAI Compatible' },
];

const ForkWebAiSettings: React.FC = () => {
    const { t } = useTranslation();
    const [webAi, setWebAiState] = useState<WebAiConfig>(() => getWebAiConfig());
    // 改即存：每次改动立刻写入 webAiConfig，下一次主题请求与复制的 OBS 链接即用新值。
    const update = (patch: Partial<WebAiConfig>) => {
        setWebAiConfig(patch);
        setWebAiState(previous => ({ ...previous, ...patch }));
    };

    return (
        <Group def={WEB_AI}>
            <Row notice={t('options.obsAiKeyLeakWarning')} />
            <Row option={O.provider} hint={t('options.aiProviderDesc')}>
                <Segmented value={webAi.provider} options={PROVIDERS} onChange={provider => update({ provider })} />
            </Row>
            {webAi.provider !== 'openai' ? (
                <Row option={O.geminiKey}>
                    <TextField type="password" value={webAi.geminiApiKey} onChange={geminiApiKey => update({ geminiApiKey })} placeholder="AI Theme Generation Key" />
                </Row>
            ) : (
                <>
                    <Row option={O.url}>
                        <TextField value={webAi.openaiApiUrl} onChange={openaiApiUrl => update({ openaiApiUrl })} placeholder={OPENAI_URL_PLACEHOLDER} />
                    </Row>
                    <Row option={O.model}>
                        <TextField value={webAi.openaiApiModel} onChange={openaiApiModel => update({ openaiApiModel })} placeholder="gpt-4o / gpt-4.1-mini / deepseek-v4-flash" />
                    </Row>
                    <Row option={O.key}>
                        <TextField type="password" value={webAi.openaiApiKey} onChange={openaiApiKey => update({ openaiApiKey })} placeholder="sk-..." />
                    </Row>
                </>
            )}
        </Group>
    );
};

export default ForkWebAiSettings;
