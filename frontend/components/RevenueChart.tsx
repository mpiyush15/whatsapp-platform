import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
  data: { month: string; actual: number; forecast?: number }[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
        <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
        <Legend />
        <Line type="monotone" dataKey="actual" stroke="#8884d8" name="Actual" />
        <Line type="monotone" dataKey="forecast" stroke="#82ca9d" name="Forecast" strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
