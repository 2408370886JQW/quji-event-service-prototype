import { describe, expect, it } from "vitest";
import {
  CAPTCHA_CHARSET,
  CAPTCHA_LENGTH,
  CAPTCHA_MESSAGES,
  CAPTCHA_TTL_SECONDS,
  createCaptcha,
  sanitizeCaptcha,
  verifyCaptcha,
} from "./captcha";

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("图形验证码", () => {
  it("只保留字母数字 自动转大写 最多 4 位", () => {
    expect(sanitizeCaptcha(" ab-c!")).toBe("ABC");
    expect(sanitizeCaptcha("k7m9x2")).toBe("K7M9");
    expect(sanitizeCaptcha("验证码")).toBe("");
  });

  it("生成 4 位不含易混字符的答案和 SVG 图形 有效期 120 秒", () => {
    const now = 1_790_000_000_000;
    for (let seed = 1; seed <= 50; seed += 1) {
      const challenge = createCaptcha(now, seeded(seed));
      expect(challenge.answer).toHaveLength(CAPTCHA_LENGTH);
      expect(
        (challenge.answer ?? "")
          .split("")
          .every(char => CAPTCHA_CHARSET.includes(char))
      ).toBe(true);
      expect(challenge.answer).not.toMatch(/[01OIL]/);
      expect(challenge.image.startsWith("data:image/svg+xml")).toBe(true);
      expect(challenge.expiresAt - now).toBe(CAPTCHA_TTL_SECONDS * 1000);
    }
    const a = createCaptcha(now, seeded(7));
    const b = createCaptcha(now, seeded(8));
    expect(a.id).not.toBe(b.id);
  });

  it("按 未填写 位数不足 过期 答案不符 的顺序校验", () => {
    const now = 1_790_000_000_000;
    const challenge = createCaptcha(now, seeded(3));
    const answer = challenge.answer ?? "";
    expect(verifyCaptcha(challenge, "", now)).toEqual({
      ok: false,
      error: CAPTCHA_MESSAGES.empty,
      refresh: false,
    });
    expect(verifyCaptcha(challenge, answer.slice(0, 3), now)).toEqual({
      ok: false,
      error: CAPTCHA_MESSAGES.invalidFormat,
      refresh: false,
    });
    const wrong = answer === "AAAA" ? "BBBB" : "AAAA";
    expect(verifyCaptcha(challenge, wrong, now)).toEqual({
      ok: false,
      error: CAPTCHA_MESSAGES.wrong,
      refresh: true,
    });
    expect(verifyCaptcha(challenge, answer.toLowerCase(), now)).toEqual({
      ok: true,
    });
    expect(
      verifyCaptcha(challenge, answer, now + CAPTCHA_TTL_SECONDS * 1000)
    ).toEqual({ ok: false, error: CAPTCHA_MESSAGES.expired, refresh: true });
    expect(verifyCaptcha(null, answer, now)).toEqual({
      ok: false,
      error: CAPTCHA_MESSAGES.expired,
      refresh: true,
    });
  });

  it("真实环境不下发答案时只做格式与有效期检查", () => {
    const now = 1_790_000_000_000;
    const remote = {
      id: "cap_remote",
      image: "/api/auth/captcha/cap_remote.png",
      expiresAt: now + 120_000,
    };
    expect(verifyCaptcha(remote, "k7m9", now)).toEqual({ ok: true });
    expect(verifyCaptcha(remote, "k7", now).ok).toBe(false);
  });
});
