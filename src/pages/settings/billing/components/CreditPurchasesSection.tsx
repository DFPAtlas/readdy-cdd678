import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { fetchCreditPurchases, type CreditPurchase } from '@/pages/projects/sandbox/sandboxBilling';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function CreditPurchasesSection() {
  const [purchases, setPurchases] = useState<CreditPurchase[] | null>(null);

  useEffect(() => {
    let active = true;
    void fetchCreditPurchases().then((rows) => {
      if (active) setPurchases(rows ?? []);
    });
    return () => { active = false; };
  }, []);

  const settled = (purchases ?? []).filter((p) => p.status === 'settled');

  return (
    <section aria-labelledby="credit-purchases-heading">
      <h2 id="credit-purchases-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
        Credit purchases
      </h2>
      <Card className="p-4 border-forge-border">
        {settled.length === 0 ? (
          <p className="text-sm text-forge-text-muted">No credit purchases yet.</p>
        ) : (
          <ul className="divide-y divide-forge-border-subtle">
            {settled.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm text-forge-text-primary">+{p.quantity.toLocaleString()} credits</p>
                  <p className="text-xs text-forge-text-muted">{formatDate(p.settled_at ?? p.created_at)}</p>
                </div>
                <span className="rounded-full bg-forge-success/10 px-2.5 py-0.5 text-xs font-medium text-forge-success whitespace-nowrap">
                  Credited
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}