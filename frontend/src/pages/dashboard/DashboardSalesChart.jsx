import React from 'react';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatCompactPriceWithCurrency, formatPriceWithCurrency } from '../../utils/currency';

/**
 * Lazy-loaded so the dashboard route chunk does not pull in Recharts until needed.
 */
export default function DashboardSalesChart({ data, isRTL }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
          tickFormatter={(v) => formatCompactPriceWithCurrency(v, { isRTL })}
        />
        <Tooltip
          formatter={(value, name) =>
            name === 'total_sales'
              ? [formatPriceWithCurrency(value, { isRTL }), isRTL ? 'المبيعات' : 'Sales']
              : [value, isRTL ? 'الطلبات' : 'Orders']
          }
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="total_sales" fill="#1FAE77" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
