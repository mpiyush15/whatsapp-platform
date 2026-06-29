import { Router } from 'express';
import { fetchPlatformLeads } from '../services/leadService'; // assuming existing service
import { parseISO, startOfMonth, format } from 'date-fns';

const router = Router();

/**
 * Helper: group leads by month and sum conversionValue.
 */
function groupRevenueByMonth(leads) {
  const map = {};
  leads.forEach((lead) => {
    if (!lead.conversionValue) return;
    const date = lead.demoCompleted ? parseISO(lead.demoCompleted) : new Date();
    const month = format(startOfMonth(date), 'yyyy-MM');
    map[month] = (map[month] || 0) + lead.conversionValue;
  });
  return map;
}

/**
 * Simple linear regression forecast (y = a + b*x) on monthly revenue.
 * Returns forecast for next N months.
 */
function linearForecast(dataMap, monthsAhead = 3) {
  const months = Object.keys(dataMap).sort();
  const x = months.map((_, i) => i + 1);
  const y = months.map((m) => dataMap[m]);
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumXX = x.reduce((acc, val) => acc + val * val, 0);
  const b = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const a = (sumY - b * sumX) / n;
  const lastMonth = months[months.length - 1];
  const base = parseISO(`${lastMonth}-01`);
const forecasts = [];
let monthDate = new Date(base);
for (let i = 1; i <= monthsAhead; i++) {
  monthDate.setMonth(monthDate.getMonth() + 1);
  const forecastMonth = format(startOfMonth(monthDate), 'yyyy-MM');
  const forecastValue = a + b * (n + i);
  forecasts.push({ month: forecastMonth, forecast: Math.round(forecastValue) });
}
return forecasts;
}

// Monte‑Carlo simulation based forecast – more advanced statistical approach
function monteCarloForecast(dataMap, monthsAhead = 3, simulations = 1000) {
  const months = Object.keys(dataMap).sort();
  const revenues = months.map(m => dataMap[m]);
  const n = revenues.length;
  if (n < 2) {
    // Insufficient data, fallback to simple linear forecast
    return linearForecast(dataMap, monthsAhead);
  }

  // Compute month‑to‑month changes to derive distribution
  const changes = [];
  for (let i = 1; i < n; i++) {
    changes.push(revenues[i] - revenues[i - 1]);
  }
  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
  const variance = changes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / changes.length;
  const stdDev = Math.sqrt(variance);

  const lastMonth = months[months.length - 1];
  const base = parseISO(`${lastMonth}-01`);
  const simulationsResult = [];

  for (let s = 0; s < simulations; s++) {
    let currentRevenue = revenues[revenues.length - 1];
    const simForecast = [];
    const monthDate = new Date(base);
    for (let i = 0; i < monthsAhead; i++) {
      // Box‑Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const randChange = mean + randStdNormal * stdDev;
      currentRevenue += randChange;
      monthDate.setMonth(monthDate.getMonth() + 1);
      const forecastMonth = format(startOfMonth(monthDate), 'yyyy-MM');
      simForecast.push({ month: forecastMonth, revenue: currentRevenue });
    }
    simulationsResult.push(simForecast);
  }

  // Aggregate simulations: average revenue per month
  const aggregated = [];
  for (let i = 0; i < monthsAhead; i++) {
    const month = aggregated.length;
    const avgRevenue = simulationsResult.reduce((sum, sim) => sum + sim[i].revenue, 0) / simulations;
    const monthDate = new Date(base);
    monthDate.setMonth(monthDate.getMonth() + i + 1);
    const forecastMonth = format(startOfMonth(monthDate), 'yyyy-MM');
    aggregated.push({ month: forecastMonth, forecast: Math.round(avgRevenue) });
  }
  return aggregated;
}


router.get('/revenue-projection', superadminOnly, async (req, res) => {
  try {
    // Query params: preset (monthly|quarterly|annual), custom start/end ISO dates, monthsAhead
    const { preset, start, end, monthsAhead } = req.query;
    // Determine date range based on preset if provided
    let rangeStart = start ? parseISO(start) : undefined;
    let rangeEnd = end ? parseISO(end) : undefined;
    const now = new Date();
    if (preset) {
      switch (preset) {
        case 'monthly':
          rangeStart = startOfMonth(now);
          rangeEnd = new Date();
          break;
        case 'quarterly': {
          const month = now.getMonth();
          const quarterStartMonth = month - (month % 3);
          rangeStart = startOfMonth(new Date(now.getFullYear(), quarterStartMonth, 1));
          rangeEnd = now;
          break;
        }
        case 'annual':
          rangeStart = new Date(now.getFullYear(), 0, 1);
          rangeEnd = now;
          break;
        default:
          // ignore unknown preset
          break;
      }
    }
    // Fetch leads within the calculated range (service should accept filter options)
    const result = await fetchPlatformLeads({
      startDate: rangeStart ? rangeStart.toISOString() : undefined,
      endDate: rangeEnd ? rangeEnd.toISOString() : undefined,
    });
    const leads = result.leads || [];
    const revenueMap = groupRevenueByMonth(leads);
    const actual = Object.entries(revenueMap).map(([month, value]) => ({ month, actual: value }));
    // Placeholder for advanced forecasting (e.g., Monte Carlo, ARIMA). Currently using linearForecast.
    const forecast = monteCarloForecast(revenueMap, Number(monthsAhead) || 3);
    res.json({ actual, forecast });
  } catch (err) {
    console.error('Revenue projection error', err);
    res.status(500).json({ error: 'Failed to calculate revenue projection' });
  }
});

export default router;
