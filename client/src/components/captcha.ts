/**
 * 主办方首次入驻 · 图形验证码前端规则
 * 与 Vue3 工程 src/utils/captcha.ts 保持一致
 * 每次发送短信前都必须通过一次图形验证 用过即作废 防止短信被脚本批量盗刷
 * 本地样例模式在浏览器内生成图形并比对答案
 * 真实环境由服务端 GET /auth/captcha 下发图片与 captchaId 答案只保存在服务端
 * 发送短信时携带 captchaId 与 captchaCode 由服务端校验
 */
export const CAPTCHA_LENGTH = 4;
export const CAPTCHA_TTL_SECONDS = 120;
/** 去掉易混淆的 0 O 1 I L */
export const CAPTCHA_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const CAPTCHA_MESSAGES = {
  empty: "请输入图形验证码",
  invalidFormat: `请输入 ${CAPTCHA_LENGTH} 位图形验证码`,
  wrong: "图形验证码不正确 已更换一张",
  expired: "图形验证码已过期 已更换一张",
  loadFailed: "图形验证码加载失败 请点击换一张",
} as const;

export type CaptchaChallenge = {
  id: string;
  /** data URL 或服务端图片地址 */
  image: string;
  expiresAt: number;
  /** 仅本地样例模式存在 真实环境答案不下发到浏览器 */
  answer?: string;
};

export type CaptchaCheck =
  | { ok: true }
  | { ok: false; error: string; refresh: boolean };

/** 只保留字母和数字 统一转为大写 最多 4 位 */
export function sanitizeCaptcha(input: string): string {
  return input
    .replace(/[^0-9a-z]/gi, "")
    .toUpperCase()
    .slice(0, CAPTCHA_LENGTH);
}

const PALETTE = ["#472677", "#6a32b5", "#243c6c", "#7c3fd0", "#9d174d"];

function fixed(value: number): string {
  return value.toFixed(1);
}

/** 生成带旋转字符 干扰线和噪点的 SVG 图形 */
export function renderCaptchaSvg(
  text: string,
  random: () => number = Math.random
): string {
  const width = 120;
  const height = 44;
  const between = (min: number, max: number) => min + random() * (max - min);
  const pick = () => PALETTE[Math.floor(random() * PALETTE.length)];
  let body = `<rect width="${width}" height="${height}" rx="8" fill="#f6f1fd"/>`;
  for (let index = 0; index < 28; index += 1) {
    body += `<circle cx="${fixed(between(0, width))}" cy="${fixed(between(0, height))}" r="${fixed(between(0.6, 1.6))}" fill="${pick()}" opacity="0.35"/>`;
  }
  for (let index = 0; index < 3; index += 1) {
    body += `<path d="M${fixed(between(0, 16))} ${fixed(between(8, 36))} C${fixed(between(30, 50))} ${fixed(between(0, height))} ${fixed(between(70, 90))} ${fixed(between(0, height))} ${fixed(between(104, width))} ${fixed(between(8, 36))}" stroke="${pick()}" stroke-width="${fixed(between(1, 1.8))}" fill="none" opacity="0.55"/>`;
  }
  const step = (width - 20) / text.length;
  text.split("").forEach((char, index) => {
    const x = 10 + step * index + step / 2 + between(-3, 3);
    const y = 31 + between(-3, 3);
    body += `<text x="${fixed(x)}" y="${fixed(y)}" transform="rotate(${fixed(between(-22, 22))} ${fixed(x)} ${fixed(y - 9)})" fill="${pick()}" font-family="'DejaVu Sans Mono','Menlo','Consolas',monospace" font-size="${fixed(between(24, 28))}" font-weight="700" text-anchor="middle">${char}</text>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 本地样例模式生成一张图形验证码 */
export function createCaptcha(
  now: number = Date.now(),
  random: () => number = Math.random
): CaptchaChallenge {
  const answer = Array.from(
    { length: CAPTCHA_LENGTH },
    () => CAPTCHA_CHARSET[Math.floor(random() * CAPTCHA_CHARSET.length)]
  ).join("");
  return {
    id: `cap_${now.toString(36)}_${Math.floor(random() * 1e8).toString(36)}`,
    image: renderCaptchaSvg(answer, random),
    expiresAt: now + CAPTCHA_TTL_SECONDS * 1000,
    answer,
  };
}

/**
 * 前端校验顺序 未填写 → 位数不足 → 已过期 → 答案不符
 * 过期或答案不符时需要更换一张 每张图只能尝试一次
 * 真实环境没有 answer 只做格式与有效期检查 答案由服务端校验
 */
export function verifyCaptcha(
  challenge: CaptchaChallenge | null,
  input: string,
  now: number
): CaptchaCheck {
  const value = sanitizeCaptcha(input);
  if (!value)
    return { ok: false, error: CAPTCHA_MESSAGES.empty, refresh: false };
  if (value.length < CAPTCHA_LENGTH)
    return { ok: false, error: CAPTCHA_MESSAGES.invalidFormat, refresh: false };
  if (!challenge || now >= challenge.expiresAt)
    return { ok: false, error: CAPTCHA_MESSAGES.expired, refresh: true };
  if (challenge.answer !== undefined && value !== challenge.answer)
    return { ok: false, error: CAPTCHA_MESSAGES.wrong, refresh: true };
  return { ok: true };
}
