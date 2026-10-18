import type { FC } from "react";
import type { CoserSubmission } from "../mockData";

interface MobileClientProps {
  onNewSubmission: (submission: CoserSubmission) => void;
}

/**
 * @deprecated 旧组件未接入当前 Home 路由，并且曾使用随机订单和本地成功码。
 * 保留导出以兼容旧调用方，但停用先付款后审核及所有合成资金/出票结果。
 * 当前漫圈设计在 CoDesign，真实客户端应使用团队服务端的订单与支付状态。
 */
export const MobileClient: FC<MobileClientProps> = () => (
  <section className="mx-auto max-w-sm rounded-2xl border border-purple-100 bg-purple-50 p-6 text-center">
    <h2 className="text-lg font-semibold text-purple-900">
      旧版客户端流程已停用
    </h2>
    <p className="mt-3 text-sm leading-6 text-slate-600">
      当前流程为先审核再购票
      <br />
      支付与出票结果必须由服务端确认
      <br />
      此入口不会生成订单或核销码
    </p>
    <a
      href="https://codesign.qq.com/app/design/730659968887344/board"
      target="_blank"
      rel="noreferrer"
      className="mt-5 inline-flex min-h-11 items-center rounded-full bg-purple-600 px-5 text-sm font-semibold text-white"
    >
      查看当前漫圈设计
    </a>
  </section>
);
