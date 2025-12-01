import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DistributionData {
    type: string;
    mean: number;
    data: { speed: number; count: number }[];
}

interface DistributionChartProps {
    distributions?: DistributionData[];
}

const DistributionChart: React.FC<DistributionChartProps> = ({ distributions }) => {
    if (!distributions) return <div className="h-64 flex items-center justify-center bg-gray-100 text-gray-500">無球速資料</div>;

    // Colors for different pitches
    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#eab308'];

    return (
        <div className="w-full bg-white p-4 rounded-lg shadow-sm border border-gray-200">
             <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-gray-700">球速分佈圖</h3>
            </div>
            
            {/* Added min-w-0 to prevent Recharts warning about width being -1 in some flex contexts */}
            <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis 
                            dataKey="speed" 
                            type="number" 
                            domain={['dataMin', 'dataMax']} 
                            tickCount={8} 
                            unit=" KPH"
                            tick={{fontSize: 12}}
                        />
                        <YAxis hide />
                        <Tooltip 
                            labelFormatter={(val) => `${val} KPH`}
                        />
                        {distributions.map((dist, index) => (
                             <Area 
                                key={dist.type}
                                data={dist.data}
                                type="monotone" 
                                dataKey="count" 
                                stroke={colors[index % colors.length]} 
                                fill={colors[index % colors.length]} 
                                fillOpacity={0.6}
                                name={dist.type}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-4 justify-center">
                {distributions.map((dist, index) => (
                    <div key={dist.type} className="flex flex-col items-center">
                        <span className="text-xl font-bold text-gray-700">{dist.mean}</span>
                        <span className="text-sm flex items-center" style={{ color: colors[index % colors.length] }}>
                            {dist.type}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DistributionChart;