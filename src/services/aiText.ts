import { DualTheme } from "../types";
import { applyStoredAnimationIntensityToDualTheme } from "./themePreferences";
import { sanitizeDualTheme } from "./themeSanitizer";
import type { WebAiProvider } from "./runtimeConfig";
// FORK-ONLY: web 的 AI 连接取自用户自带的 webAiConfig，不读部署方的 runtimeConfig。
import { getWebAiConfig } from "./webAiConfig";
export {
  AI_PROVIDER_PRESETS,
  inferAiProviderFromUrl,
  modelAlwaysThinks,
  resolveAiConnection,
  resolveAiProviderPreset,
  retiredModelHint,
} from '../../shared/ai/providerRegistry.mjs';

// src/services/aiText.ts

/**
 * The window's one way out to the AI text services (Gemini, OpenAI and OpenAI-compatible hosts).
 * The app asks them for three things: a theme made from a song's lyrics, a segmentation of lyric
 * lines into words, and the connection test of the settings form. This file is the only place in
 * src/ that knows how those asks leave the window: the desktop bridge (window.electron's
 * generateTheme, segmentLyrics and testAiConnection) and our own web routes (/api/generate-theme,
 * /api/generate-theme_openai, /api/segment-lyrics).
 *
 * The window never sends a request to a service itself. The only key it handles is the one typed
 * into the settings form, which it hands to the main process to store or to test. On the desktop
 * the main process sends the request, with the service and the key from the user's settings
 * (electron/aiTextClient.cjs, behind the IPC handlers in electron/main.cjs). On the web our
 * serverless routes send it, with the deployment's key (worker/, and api-ts/ built into api/;
 * segmentation in shared/lyricSegmentationService.mjs). Which service the web build uses is the
 * deployment's choice, read by ./runtimeConfig.
 *
 * It lives in src/services/ because the theme controller, the OBS overlay, the lyric segmentation
 * and the settings form all use it, and none of them owns it.
 *
 * FORK-ONLY: 本 fork 的 web 主题请求由用户自带 key（存于 ./webAiConfig，OBS 覆盖层经 URL 传入），
 * 随请求体交给 SWA 无密钥中继（swa-api/）转发；分词与连接测试保持上游原样。
 *
 * The settings form also reads the provider registry through here (presets, sites, default and
 * retired models: shared/ai/providerRegistry.mjs), so no component imports shared/ai/ itself.
 */

/** Our web route for the theme ask, one per service. */
const THEME_ROUTES: Record<WebAiProvider, string> = {
  gemini: '/api/generate-theme',
  openai: '/api/generate-theme_openai',
};

/** Anything that is not a service of the table goes to Gemini's route. */
const themeRoute = (provider: WebAiProvider) => THEME_ROUTES[provider] ?? THEME_ROUTES.gemini;

/** Our web route for the segmentation ask. The route picks the service itself. */
const SEGMENTATION_ROUTE = '/api/segment-lyrics';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? '');
};

/** What our web theme routes answer when the deployment has no key; they say it for nothing else. */
const WEB_ROUTE_WITHOUT_KEY = 'Server configuration error';

export const isMissingAiApiKeyError = (error: unknown) => {
  const message = getErrorMessage(error);
  return message === WEB_ROUTE_WITHOUT_KEY
    || (/(?:openai_api_key|gemini_api_key|api key)/i.test(message)
      && /(?:not configured|missing|configure)/i.test(message));
};

export const generateThemeFromLyrics = async (
  lyricsText: string,
  options?: { isPureMusic?: boolean; songTitle?: string }
): Promise<DualTheme> => {
  try {
    // Check if running in Electron environment
    if ((window as any).electron && typeof (window as any).electron.generateTheme === 'function') {
      const dualTheme = await (window as any).electron.generateTheme(lyricsText, options);
      return sanitizeDualTheme(dualTheme);
    }

    // FORK-ONLY: web 用户自带 key（存于 webAiConfig），随请求走 SWA 无密钥中继（swa-api/）。
    const webAi = getWebAiConfig();
    const provider = webAi.provider;
    const apiKey = provider === 'openai' ? webAi.openaiApiKey : webAi.geminiApiKey;
    if (!apiKey) {
      // 未配置 key：客户端直接抛出，交由 isMissingAiApiKeyError 捕获并回退内置主题，省一次注定失败的请求。
      throw new Error(provider === 'openai' ? 'OpenAI API key is not configured' : 'Gemini API key is not configured');
    }
    const requestBody = provider === 'openai'
      ? { lyricsText, ...options, apiKey, apiUrl: webAi.openaiApiUrl || undefined, apiModel: webAi.openaiApiModel || undefined }
      : { lyricsText, ...options, apiKey };

    const response = await fetch(themeRoute(provider), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate theme');
    }

    const dualTheme = await response.json();
    return applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(dualTheme as DualTheme));
  } catch (error) {
    console.error("Failed to generate theme via API:", error);
    throw error;
  }
};

// The AI connection the web OBS overlay (Dynamic AI mode) generates a theme with. The overlay runs
// in a separate browser context, so it takes an explicit provider instead of reading anything from
// the app; the provider is selected by Docker runtime config or the Vite build fallback.
export interface ObsAiConfig {
  provider: WebAiProvider;
  // FORK-ONLY: fork 的无密钥中继需要 key，由 OBS URL 传入；服务端自带 key 的部署不传。
  apiKey?: string;
  apiUrl?: string;
  apiModel?: string;
}

// OBS-overlay variant of generateThemeFromLyrics: keyless (the endpoint uses its own server env
// key), abortable, and with no Electron branch since the overlay is web-only. Used per song by the
// overlay; the caller falls back to the builtin theme if it rejects.
export const generateObsThemeFromLyrics = async (
  lyricsText: string,
  options: { isPureMusic?: boolean; songTitle?: string } | undefined,
  aiConfig: ObsAiConfig,
  signal?: AbortSignal,
): Promise<DualTheme> => {
  // FORK-ONLY: 不预先要求 key。服务端自带 key 的部署忽略缺省的 body key；fork 的无密钥中继缺 key 时
  // 由服务端报错，调用方回退内置主题。
  const requestBody: Record<string, unknown> = { lyricsText, ...(options ?? {}) };
  if (aiConfig.apiKey) requestBody.apiKey = aiConfig.apiKey;
  if (aiConfig.provider === 'openai') {
    if (aiConfig.apiUrl) requestBody.apiUrl = aiConfig.apiUrl;
    if (aiConfig.apiModel) requestBody.apiModel = aiConfig.apiModel;
  }

  const response = await fetch(themeRoute(aiConfig.provider), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || 'Failed to generate theme');
  }

  const dualTheme = await response.json();
  return applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(dualTheme as DualTheme));
};

type SegmentationBridge = {
  segmentLyrics?: (lines: string[]) => Promise<string[][]>;
};

const getSegmentationBridge = (): SegmentationBridge | null => {
  if (typeof window === 'undefined') return null;
  const bridge = (window as unknown as { electron?: SegmentationBridge }).electron;
  return bridge && typeof bridge.segmentLyrics === 'function' ? bridge : null;
};

/** Whether an AI segmentation request can be made at all from this build. */
export const isLyricSegmentationAiAvailable = (): boolean => (
  typeof window !== 'undefined' && (Boolean(getSegmentationBridge()) || typeof fetch === 'function')
);

/**
 * One segmentation request: the desktop build goes through IPC so it can use the model the user
 * configured in settings, and the web build posts to the deployment's own route because its
 * credentials live server-side. Resolves to the rows as they were answered; checking them against
 * the lines is the caller's. `signal` only reaches the web path; ipcRenderer.invoke cannot be
 * cancelled.
 */
export const requestLyricSegmentation = async (lines: string[], signal?: AbortSignal): Promise<unknown> => {
  const bridge = getSegmentationBridge();
  if (bridge?.segmentLyrics) {
    return bridge.segmentLyrics(lines);
  }

  const response = await fetch(SEGMENTATION_ROUTE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'Failed to segment lyrics');
  }

  return (payload as { lines?: unknown }).lines;
};

/** Whether model discovery can run here; saved credentials stay in the desktop main process. */
export const canListAiModels = (): boolean => Boolean(window.electron?.listAiModels);

/** Loads the current connection's models without exposing its saved key to the renderer. */
export const fetchAiModels = (payload: AiConnectionTestPayload): Promise<AiModelListResult> => (
  window.electron?.listAiModels
    ? window.electron.listAiModels(payload)
    : Promise.resolve({ ok: false, errorKind: 'config' })
);

/** Whether the connection test can run here. It is desktop only: there is no web route for it. */
export const canRunAiConnectionTest = (): boolean => Boolean(window.electron?.testAiConnection);

/**
 * Hands the unsaved values of the settings form to the main process, which sends one "hello" with
 * them and answers with what came back. Only where canRunAiConnectionTest() says yes.
 */
export const runAiConnectionTest = (payload: AiConnectionTestPayload): Promise<AiConnectionTestResult> => (
  window.electron!.testAiConnection(payload)
);
