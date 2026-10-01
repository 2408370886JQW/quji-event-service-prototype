import { Home } from "lucide-react";
import { useLocation } from "wouter";

const MASCOT_EMPTY = "/manus-storage/quji-mascot-surprised_42519e8c.webp";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="workspace-canvas min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-lg vi-sticker rounded-2xl px-6 py-10 text-center">
        <img
          src={MASCOT_EMPTY}
          alt=""
          aria-hidden="true"
          width={150}
          height={144}
          className="mx-auto h-auto w-[150px] select-none"
        />
        <h1 className="mt-4 text-[22px] font-semibold text-slate-900">
          页面不存在
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-slate-600">
          链接可能已调整 请返回工作台继续处理
        </p>
        <button
          onClick={() => setLocation("/")}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-brand-grad px-6 text-[14px] font-semibold text-white"
        >
          <Home className="h-4 w-4" />
          返回工作台
        </button>
      </div>
    </div>
  );
}
