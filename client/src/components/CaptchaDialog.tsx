import { useEffect, useRef, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CAPTCHA_LENGTH,
  createCaptcha,
  sanitizeCaptcha,
  verifyCaptcha,
  type CaptchaChallenge,
} from "./captcha";
import { maskPhone } from "./smsCode";

/**
 * 获取短信验证码前的图形验证
 * 每次打开都会生成新的一张 验证通过后立即关闭并由父组件发送短信
 * 接入后端时 生成改为 GET /auth/captcha 校验随 POST /auth/sms-code 由服务端完成
 */
export function CaptchaDialog({
  open,
  phone,
  onCancel,
  onPassed,
}: {
  open: boolean;
  phone: string;
  onCancel: () => void;
  onPassed: (captcha: { captchaId: string; captchaCode: string }) => void;
}) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = (message = "") => {
    setChallenge(createCaptcha());
    setValue("");
    setError(message);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    if (open) refresh();
    else {
      setChallenge(null);
      setValue("");
      setError("");
    }
  }, [open]);

  const confirm = () => {
    const result = verifyCaptcha(challenge, value, Date.now());
    if (!result.ok) {
      if (result.refresh) refresh(result.error);
      else {
        setError(result.error);
        inputRef.current?.focus();
      }
      return;
    }
    if (challenge)
      onPassed({
        captchaId: challenge.id,
        captchaCode: sanitizeCaptcha(value),
      });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        data-cy="captcha-dialog"
        onOpenAutoFocus={event => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        className="max-w-[calc(100%-2rem)] gap-0 rounded-2xl border-slate-200 bg-white p-6 text-slate-900 shadow-[0_18px_48px_rgba(71,38,119,0.18)] sm:max-w-[400px]"
      >
        <form
          noValidate
          onSubmit={event => {
            event.preventDefault();
            event.stopPropagation();
            confirm();
          }}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-grad text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-[18px] leading-7 font-semibold text-slate-900">
                安全验证
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap gap-x-2 text-[14px] leading-6 text-slate-600">
                <span className="whitespace-nowrap">为防止短信被恶意发送</span>
                <span className="whitespace-nowrap">
                  请输入图中字符后获取验证码
                </span>
              </DialogDescription>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] leading-6 text-slate-600">
            <span className="whitespace-nowrap">短信将发送至</span>{" "}
            <span
              className="whitespace-nowrap font-semibold text-slate-900 tabular-nums"
              data-cy="captcha-phone"
            >
              {maskPhone(phone)}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => refresh()}
              aria-label="看不清 换一张"
              className="shrink-0 overflow-hidden rounded-lg border border-brand-100"
            >
              {challenge && (
                <img
                  src={challenge.image}
                  alt="图形验证码"
                  width={132}
                  height={48}
                  data-cy="captcha-image"
                  data-captcha-id={challenge.id}
                  data-mock-answer={challenge.answer}
                  className="block h-12 w-[132px]"
                  draggable={false}
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => refresh()}
              data-cy="captcha-refresh"
              className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[14px] font-semibold text-brand-700 hover:bg-brand-50"
            >
              <RefreshCw className="h-4 w-4" />
              换一张
            </button>
          </div>

          <label className="mt-4 block">
            <span className="text-[14px] font-semibold text-slate-800">
              图形验证码
            </span>
            <input
              ref={inputRef}
              value={value}
              onChange={event => {
                setValue(sanitizeCaptcha(event.target.value));
                setError("");
              }}
              maxLength={CAPTCHA_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={`请输入图中 ${CAPTCHA_LENGTH} 位字符`}
              aria-invalid={Boolean(error)}
              data-cy="captcha-input"
              className="mt-2 block h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-[15px] tracking-[0.2em] uppercase outline-none placeholder:tracking-normal placeholder:normal-case focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <p className="mt-2 text-[13px] leading-5 text-slate-500">
            <span className="whitespace-nowrap">不区分大小写</span>{" "}
            <span className="whitespace-nowrap">看不清可点击图片更换</span>
          </p>

          {error && (
            <div
              role="alert"
              data-cy="captcha-error"
              className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-[14px] text-rose-700"
            >
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              data-cy="captcha-cancel"
              className="h-11 whitespace-nowrap rounded-full border border-brand-200 px-5 text-[14px] font-semibold text-brand-700 hover:bg-brand-50"
            >
              取消
            </button>
            <button
              type="submit"
              data-cy="captcha-confirm"
              className="h-11 whitespace-nowrap rounded-full bg-brand-grad px-5 text-[14px] font-semibold text-white"
            >
              确认并发送
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
