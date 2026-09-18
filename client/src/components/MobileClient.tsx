import React, { useState } from 'react';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, Camera, QrCode, 
  Upload, Sparkles, AlertCircle, RefreshCw, ChevronRight, UserCheck
} from 'lucide-react';
import { CoserSubmission } from '../mockData';

interface MobileClientProps {
  onNewSubmission: (sub: CoserSubmission) => void;
}

export const MobileClient: React.FC<MobileClientProps> = ({ onNewSubmission }) => {
  // Mobile step: 'ticket' | 'kyc-notice' | 'kyc-camera' | 'kyc-face' | 'kyc-verify' | 'coser-form' | 'payment' | 'pay-success' | 'ticket-qr'
  const [step, setStep] = useState<string>('ticket');
  const [ticketType, setTicketType] = useState<'Coser票' | '普通票'>('Coser票');
  
  // KYC Mock Info
  const [realName, setRealName] = useState('张三');
  const [idCardMasked] = useState('310101******1234');
  
  // Coser Info Form
  const [charName, setCharName] = useState('甘雨');
  const [costumeDesc, setCostumeDesc] = useState('白色长袍+蓝发+羊角发箍+紫色铃铛挂饰 (无金属尖锐物)');
  const [previewImg, setPreviewImg] = useState('https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80');
  
  // Payment
  const [payMethod, setPayMethod] = useState<'wx' | 'ali'>('wx');
  const [orderNo, setOrderNo] = useState('ORD1789301148305');

  // Submit and transition
  const handleFinalPay = () => {
    const newOrd = 'ORD' + Math.floor(1000000000000 + Math.random() * 9000000000000);
    setOrderNo(newOrd);
    
    // push to parent mock submissions
    if (ticketType === 'Coser票') {
      const newSub: CoserSubmission = {
        id: 'SUB-' + Math.floor(10000000 + Math.random() * 90000000),
        orderNo: newOrd,
        eventName: '2026 魔都动漫嘉年华 · 乌鲁木齐特别巡回展',
        ticketType: 'Coser票',
        price: 68,
        realName: realName || '测试提报人',
        idCardMasked: idCardMasked,
        phoneMasked: '138****9988',
        characterName: charName || '自由创作者',
        costumeDesc: costumeDesc || '常规二次元汉服动漫服饰',
        referenceImage: previewImg,
        submittedAt: '刚刚 (实时代入)',
        auditStatus: 'pending',
        riskLevel: 'low',
        tags: ['新提报待初核', '漫圈前端提交']
      };
      onNewSubmission(newSub);
    }
    setStep('pay-success');
  };

  return (
    <div className="relative mx-auto w-[360px] h-[740px] bg-black rounded-[48px] p-3 shadow-2xl ring-1 ring-black/10 flex flex-col select-none">
      {/* Dynamic Island / iPhone Notch Area */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e] ring-1 ring-white/10" />
        <div className="w-2 h-2 rounded-full bg-blue-900/40" />
      </div>

      {/* Screen Container */}
      <div className="relative w-full h-full bg-[#fafafa] rounded-[38px] overflow-hidden flex flex-col font-sans">
        
        {/* iOS Status Bar */}
        <div className="h-10 pt-2 px-6 flex justify-between items-center text-xs font-semibold text-gray-800 tracking-tight z-40 bg-white/70 backdrop-blur-md">
          <span>16:00</span>
          <div className="flex items-center space-x-1.5 text-xs text-gray-600">
            <span>5G</span>
            <div className="w-4 h-2 border border-gray-600 rounded-sm p-0.5 flex items-center">
              <div className="w-full h-full bg-gray-700 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Top App Header */}
        <div className="h-11 px-4 border-b border-gray-100 flex items-center justify-between bg-white text-gray-900 text-sm font-medium z-30">
          {step !== 'ticket' && (
            <button 
              onClick={() => {
                if (step === 'kyc-notice') setStep('ticket');
                else if (step === 'kyc-camera') setStep('kyc-notice');
                else if (step === 'kyc-face') setStep('kyc-camera');
                else if (step === 'kyc-verify') setStep('kyc-face');
                else if (step === 'coser-form') setStep('ticket');
                else if (step === 'payment') setStep(ticketType === 'Coser票' ? 'coser-form' : 'ticket');
                else if (step === 'pay-success') setStep('payment');
                else if (step === 'ticket-qr') setStep('pay-success');
              }}
              className="flex items-center text-xs text-purple-700 font-normal hover:opacity-75 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4 mr-0.5" />
              <span>返回</span>
            </button>
          )}
          <span className="font-semibold text-xs tracking-wide text-gray-800 truncate max-w-[170px]">
            {step === 'ticket' && '漫圈 · 选票与资格'}
            {step === 'kyc-notice' && '实名购票认证'}
            {step === 'kyc-camera' && '身份证信息采验'}
            {step === 'kyc-face' && '人脸活体核验'}
            {step === 'kyc-verify' && '数据实时核验中'}
            {step === 'coser-form' && '服装道具信息提报'}
            {step === 'payment' && '订单支付'}
            {step === 'pay-success' && '支付成功'}
            {step === 'ticket-qr' && '入场电子凭证'}
          </span>
          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono font-medium">
            漫圈端
          </span>
        </div>

        {/* Screen Body with dynamic flows */}
        <div className="flex-1 overflow-y-auto px-4 py-3 text-gray-800 text-xs leading-relaxed space-y-3">
          
          {/* STEP 1: TICKET SELECTION */}
          {step === 'ticket' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="text-[10px] text-purple-700 font-semibold tracking-wider mb-1">乌鲁木齐试点活动</div>
                <h3 className="font-bold text-sm text-gray-900 leading-snug">2026 魔都动漫嘉年华</h3>
                <div className="text-[11px] text-gray-500 mt-1 flex items-center space-x-1">
                  <span>📅 2026-06-28</span>
                  <span>·</span>
                  <span>📍 新疆国际会展中心</span>
                </div>
              </div>

              {/* Coser Ticket Card */}
              <div 
                onClick={() => setTicketType('Coser票')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  ticketType === 'Coser票' 
                    ? 'border-purple-600 bg-purple-50/40 shadow-xs ring-1 ring-purple-500/20' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">Coser 专属票</span>
                  <span className="font-bold text-purple-700 text-base">¥68</span>
                </div>
                <div className="mt-2 text-[11px] bg-amber-50 text-amber-800 border border-amber-200/60 p-2 rounded-xl flex items-start space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    需先填报角色服装与随身道具描述及参考图。线下检票将与提报核对一致入场。
                  </span>
                </div>
              </div>

              {/* Normal Ticket Card */}
              <div 
                onClick={() => setTicketType('普通票')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  ticketType === '普通票' 
                    ? 'border-purple-600 bg-purple-50/40 shadow-xs ring-1 ring-purple-500/20' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">普通观众票</span>
                  <span className="font-bold text-purple-700 text-base">¥88</span>
                </div>
                <p className="text-gray-500 text-[11px] mt-1">适合普通观众，仅需实名，无需填报角色信息。</p>
              </div>

              {/* Security info box */}
              <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-gray-500 space-y-1">
                <div className="flex items-center space-x-1 font-medium text-gray-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                  <span>文旅合规安全准则</span>
                </div>
                <p>根据文旅及大型活动安全指引，严禁携带锐利金属刃具与高仿真违规道具。</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setStep('kyc-notice')}
                  className="w-full py-3 bg-[#795290] hover:bg-[#6c4882] text-white rounded-xl font-medium text-xs shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-1"
                >
                  <span>下一步：实名认证</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: KYC NOTICE */}
          {step === 'kyc-notice' && (
            <div className="space-y-4 pt-2 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-700">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">为什么需要实名认证？</h3>
                <p className="text-gray-500 text-[11px] mt-1.5 px-3 leading-relaxed">
                  根据《营业性演出管理条例》及文旅监管要求，大型文化活动需实名购票，线下核验身份证入场。您的信息将被加密脱敏存储。
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-3 text-left text-[11px] text-amber-900 space-y-1">
                <div className="font-bold text-amber-800">隐私保护承诺：</div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  <li>身份证原始图片不留存</li>
                  <li>人脸数据实时比对后即刻销毁</li>
                  <li>仅保留合规脱敏后的认证标识</li>
                </ul>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setStep('kyc-camera')}
                  className="w-full py-3 bg-[#795290] hover:bg-[#6c4882] text-white rounded-xl font-medium text-xs shadow-md"
                >
                  开始实名拍照认证
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: KYC CAMERA */}
          {step === 'kyc-camera' && (
            <div className="space-y-4 pt-2 text-center animate-in fade-in duration-200">
              <div className="relative w-full h-44 bg-gray-100 border-2 border-dashed border-purple-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 p-4">
                <Camera className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-xs text-gray-600 font-medium">请将二代身份证正面置于框内</span>
                <span className="text-[10px] text-gray-400 mt-1">自动识别姓名与公民身份证号</span>
              </div>
              <p className="text-gray-500 text-[11px]">模拟检测完毕：已识别居民身份证信息</p>
              <div className="bg-white p-3 rounded-xl border border-gray-100 text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">姓名</span>
                  <span className="font-semibold">{realName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">证件号</span>
                  <span className="font-mono text-gray-700">{idCardMasked}</span>
                </div>
              </div>
              <button
                onClick={() => setStep('kyc-face')}
                className="w-full py-3 bg-[#795290] hover:bg-[#6c4882] text-white rounded-xl font-medium text-xs shadow-md"
              >
                下一步：人脸活体比对
              </button>
            </div>
          )}

          {/* STEP 4: KYC FACE */}
          {step === 'kyc-face' && (
            <div className="space-y-4 pt-4 text-center animate-in fade-in duration-200">
              <div className="w-36 h-36 border-4 border-dashed border-purple-400 rounded-full mx-auto flex items-center justify-center bg-purple-50/50">
                <UserCheck className="w-14 h-14 text-purple-600 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">请完成人脸识别</h4>
                <p className="text-gray-500 text-[11px] mt-1">请将面部放入框内，保持光线充足，眨眨眼</p>
              </div>
              <button
                onClick={() => {
                  setStep('kyc-verify');
                  setTimeout(() => {
                    if (ticketType === 'Coser票') {
                      setStep('coser-form');
                    } else {
                      setStep('payment');
                    }
                  }, 1200);
                }}
                className="w-full py-3 bg-[#795290] hover:bg-[#6c4882] text-white rounded-xl font-medium text-xs shadow-md"
              >
                模拟通过活体核验
              </button>
            </div>
          )}

          {/* STEP 5: VERIFYING */}
          {step === 'kyc-verify' && (
            <div className="space-y-4 pt-16 text-center animate-in fade-in duration-200">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-600 font-medium text-xs">正在向文旅及身份核验信道比对...</p>
              <p className="text-[10px] text-gray-400">核验结果即时脱敏，合规入库</p>
            </div>
          )}

          {/* STEP 6: COSER FORM (截图对应核心功能) */}
          {step === 'coser-form' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-[11px] text-amber-900 leading-snug flex items-start space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>信息采集中：</strong>提交后即可进入支付。线下核验时需核对实际穿着与提报信息一致。
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-800 mb-1">
                  角色名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="例如：甘雨 / 雷电将军 / 日向翔阳"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-800 mb-1">
                  服装及随身道具描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={costumeDesc}
                  onChange={(e) => setCostumeDesc(e.target.value)}
                  placeholder="请描述服装颜色、款式、材质、特征，以及道具尺寸与材质..."
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
                />
                <div className="text-[10px] text-gray-400 text-right">{costumeDesc.length}/200</div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-800 mb-1">
                  参考图片 <span className="text-red-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-3 text-center bg-white flex flex-col items-center">
                  <img 
                    src={previewImg} 
                    alt="参考图" 
                    className="w-24 h-24 object-cover rounded-xl shadow-xs border border-gray-100 mb-2"
                  />
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setPreviewImg('https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80')}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px]"
                    >
                      角色原案图
                    </button>
                    <button 
                      onClick={() => setPreviewImg('https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80')}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px]"
                    >
                      国风飞天图
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setStep('payment')}
                  className="w-full py-3 bg-[#795290] hover:bg-[#6c4882] text-white rounded-xl font-medium text-xs shadow-md"
                >
                  提交并继续支付
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: PAYMENT */}
          {step === 'payment' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="bg-amber-50 text-amber-800 p-2 rounded-xl text-[11px] text-center">
                ⏱ 请在 14:59 内完成支付，超时名额将释放
              </div>

              <div className="bg-white p-3 rounded-2xl border border-gray-100 space-y-2 text-xs">
                <div className="font-semibold text-gray-900 border-b pb-1">订单信息</div>
                <div className="flex justify-between text-gray-500">
                  <span>票种</span>
                  <span className="font-semibold text-gray-900">{ticketType}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>实名信息</span>
                  <span className="text-gray-900">{realName} | {idCardMasked}</span>
                </div>
                {ticketType === 'Coser票' && (
                  <div className="flex justify-between text-gray-500">
                    <span>申报角色</span>
                    <span className="font-medium text-purple-700">{charName}</span>
                  </div>
                )}
              </div>

              <div className="bg-white p-3 rounded-2xl border border-gray-100 space-y-2">
                <div className="font-semibold text-gray-900 text-xs">支付方式</div>
                
                <div 
                  onClick={() => setPayMethod('wx')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer ${
                    payMethod === 'wx' ? 'border-purple-600 bg-purple-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-green-500 text-white rounded flex items-center justify-center font-bold text-[10px]">
                      W
                    </div>
                    <span className="text-xs font-medium">微信支付</span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${payMethod === 'wx' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}>
                    {payMethod === 'wx' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>

                <div 
                  onClick={() => setPayMethod('ali')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer ${
                    payMethod === 'ali' ? 'border-purple-600 bg-purple-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center font-bold text-[10px]">
                      A
                    </div>
                    <span className="text-xs font-medium">支付宝</span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${payMethod === 'ali' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}>
                    {payMethod === 'ali' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center px-1 pt-1">
                <span className="text-xs text-gray-500">实付金额</span>
                <span className="text-lg font-bold text-gray-900">¥{ticketType === 'Coser票' ? '68' : '88'}</span>
              </div>

              <button
                onClick={handleFinalPay}
                className="w-full py-3 bg-[#795290] hover:bg-[#6c4882] text-white rounded-xl font-medium text-xs shadow-md"
              >
                确认支付 ¥{ticketType === 'Coser票' ? '68' : '88'}
              </button>
            </div>
          )}

          {/* STEP 8: PAYMENT SUCCESS */}
          {step === 'pay-success' && (
            <div className="space-y-4 pt-6 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">购票成功！</h3>
                <p className="text-gray-400 text-[10px] mt-1 font-mono">订单号: {orderNo}</p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-gray-100 text-left text-xs space-y-2">
                <div className="font-semibold text-gray-800 border-b pb-1">票务信息</div>
                <div className="flex justify-between text-gray-500">
                  <span>票种</span>
                  <span className="font-semibold text-gray-900">{ticketType}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>实名信息</span>
                  <span className="text-gray-900">{realName}</span>
                </div>
                {ticketType === 'Coser票' && (
                  <div className="flex justify-between text-gray-500">
                    <span>角色备案</span>
                    <span className="text-purple-700 font-medium">{charName} (已自动同步后台)</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>支付金额</span>
                  <span className="font-bold text-gray-900">¥{ticketType === 'Coser票' ? '68' : '88'}</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400">活动当天请携带身份证原件线下核验入场</p>

              <button
                onClick={() => setStep('ticket-qr')}
                className="w-full py-3 bg-[#795290] hover:bg-[#6c4882] text-white rounded-xl font-medium text-xs shadow-md"
              >
                查看我的电子核销码
              </button>
            </div>
          )}

          {/* STEP 9: QR CODE (暗黑核销凭证) */}
          {step === 'ticket-qr' && (
            <div className="bg-[#1c1c1e] text-white rounded-2xl p-4 space-y-4 text-center animate-in fade-in duration-200 -mx-1">
              <div className="text-left border-b border-white/10 pb-2">
                <div className="text-[10px] text-purple-400 font-mono">QR-CODE 入场核销码</div>
                <h4 className="font-bold text-sm text-gray-100">2026 魔都动漫嘉年华</h4>
                <div className="text-[10px] text-gray-400 mt-0.5">2026-06-28 09:00-18:00 · 新疆国际会展中心</div>
              </div>

              {/* Dynamic QR Mock */}
              <div className="bg-white p-3 rounded-2xl inline-block mx-auto shadow-lg">
                <div className="w-36 h-36 border-4 border-black rounded-lg flex flex-col items-center justify-center p-2 bg-white">
                  <QrCode className="w-28 h-28 text-black" />
                </div>
              </div>

              <div className="bg-white/10 p-2.5 rounded-xl text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">票种</span>
                  <span className="font-semibold text-purple-300">{ticketType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">实名</span>
                  <span>{realName}</span>
                </div>
                {ticketType === 'Coser票' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">核验角色</span>
                    <span className="text-amber-300 font-medium">{charName}</span>
                  </div>
                )}
              </div>

              <div className="text-left text-[10px] text-gray-400 border-t border-white/10 pt-2 space-y-0.5">
                <div className="text-amber-400 font-medium">核验须知：</div>
                <div>• 入场时请出示此动态核销码与身份证原件</div>
                <div>• Coser票需核验穿着与提报服装信息相符</div>
              </div>

              <button
                onClick={() => setStep('ticket')}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-xl text-xs"
              >
                返回漫圈首页
              </button>
            </div>
          )}

        </div>

        {/* Bottom Home Indicator */}
        <div className="h-5 flex items-center justify-center bg-white">
          <div className="w-28 h-1 bg-gray-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};
