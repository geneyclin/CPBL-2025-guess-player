import React from 'react';
import { StatItem } from '../types';

interface PRChartProps {
  stats: StatItem[];
  type: 'batter' | 'pitcher';
}

const PRChart: React.FC<PRChartProps> = ({ stats, type }) => {
  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">
        {type === 'pitcher' ? '投球 PR' : '打擊 PR'}
      </h2>
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center text-sm sm:text-base">
            {/* Label */}
            <div className="w-16 sm:w-20 text-right font-medium text-gray-600 mr-3">
              {stat.label}
            </div>
            
            {/* Bar Container */}
            <div className="flex-1 h-8 bg-gray-100 rounded-r-full relative flex items-center">
                {/* Background dashed lines for readability */}
                <div className="absolute inset-0 flex justify-between px-2">
                    {[20, 40, 60, 80].map(tick => (
                        <div key={tick} className="h-full w-px bg-white/50" style={{ left: `${tick}%` }}></div>
                    ))}
                </div>

                {/* The Gold Bar */}
                <div 
                    className="h-full bg-rebas-gold rounded-r-full flex items-center justify-end pr-1 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.max(stat.pr, 5)}%` }} // Min width for visibility
                >
                    {/* PR Circle */}
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/30 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm mr-1 shadow-sm">
                        {stat.pr}
                    </div>
                </div>
            </div>

            {/* Raw Value */}
            <div className="w-16 sm:w-20 text-left pl-3 text-gray-500 text-sm">
                {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PRChart;