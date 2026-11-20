import { ShoppingBag } from "lucide-react";

export const Cart = ({ kit }) => (
  <section className="p-5 border-t border-white/5 bg-[#0D0F1A]" data-testid="cart-breakdown-section">
    <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
      <ShoppingBag className="w-4 h-4 text-[#FFD043]" /> Cart
    </h3>
    <ul className="space-y-2.5">
      {kit.cart.map((l) => (
        <li key={l.item_id} className="flex items-start justify-between gap-3 text-sm" data-testid={`cart-item-${l.item_id}`}>
          <div className="min-w-0">
            <div className="text-white">{l.name}</div>
            <div className="font-mono-bd text-[10px] text-slate-500">{l.qty} × ${l.price_usd.toFixed(2)}</div>
          </div>
          <div className="font-mono-bd text-slate-200 shrink-0">${l.line_usd.toFixed(2)}</div>
        </li>
      ))}
    </ul>
    <div className="mt-4 pt-4 border-t border-dashed border-white/10 flex items-end justify-between">
      <span className="font-mono-bd text-[10px] uppercase tracking-widest text-slate-400">Total</span>
      <div className="text-right">
        <div className="font-display font-black text-3xl text-[#FFD043]" data-testid="total-price-usd">${kit.total_usd.toFixed(2)}</div>
        <div className="font-mono-bd text-sm text-[#FF5E9F]" data-testid="total-price-khr">{kit.total_khr.toLocaleString()} KHR</div>
      </div>
    </div>
  </section>
);
