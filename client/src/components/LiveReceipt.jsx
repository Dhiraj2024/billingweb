import React from 'react';
import { useBilling } from '../context/BillingContext';
import { buildReceiptText } from '../utils/thermalPrint';

const LiveReceipt = ({ billNo = '---' }) => {
  const { user, cart, cartTotal } = useBilling();

  const shop = {
    shopName: user?.shopName || 'My Shop',
    address: user?.address || '',
    mobNo: user?.mobNo || '',
    endMsg: user?.endMsg || 'Thank You! Visit Again',
  };

  const { text } = buildReceiptText(shop, cart, billNo);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 w-full max-w-[280px] mx-auto sticky top-4">
      <h3 className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
        Live 58mm Preview
      </h3>
      <div className="bg-white border border-dashed border-slate-300 p-3 rounded-lg">
        <pre className="receipt-font text-[11px] leading-[14px] whitespace-pre-wrap text-slate-900">
          {text}
        </pre>
      </div>
      <div className="mt-3 text-center">
        <p className="text-slate-500 text-xs">Grand Total</p>
        <p className="text-2xl font-bold text-emerald-600">₹{cartTotal.toFixed(2)}</p>
      </div>
    </div>
  );
};

export default LiveReceipt;
