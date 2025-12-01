import React from 'react';

interface Point {
    x: number;
    y: number;
    type: '1B' | '2B' | '3B' | 'HR' | 'FO';
}

interface FieldChartProps {
    data?: Point[];
}

const FieldChart: React.FC<FieldChartProps> = ({ data }) => {
    // Baseball field coordinates (simplified)
    const size = 300;
    const center = size / 2;

    if (!data) return <div className="h-64 flex items-center justify-center bg-gray-100 text-gray-500">無落點資料</div>;

    return (
        <div className="w-full flex flex-col items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
             <div className="mb-2 flex gap-2 text-xs flex-wrap justify-center">
                 <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>一安</span>
                 <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-600 mr-1"></span>二安</span>
                 <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>三安</span>
                 <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-600 mr-1"></span>全壘打</span>
             </div>

            <svg viewBox="0 0 400 350" className="w-full max-w-sm overflow-visible">
                {/* Outfield Grass */}
                <path d="M 200 320 L 50 170 Q 200 20 350 170 Z" fill="#8bc34a" />
                
                {/* Infield Dirt */}
                <path d="M 200 320 L 140 260 Q 200 200 260 260 Z" fill="#a1887f" />
                
                {/* Base Lines */}
                <path d="M 200 320 L 50 170" stroke="white" strokeWidth="2" />
                <path d="M 200 320 L 350 170" stroke="white" strokeWidth="2" />
                
                {/* Diamond */}
                <path d="M 200 310 L 170 280 L 200 250 L 230 280 Z" fill="none" stroke="white" strokeWidth="2" />

                {/* Foul Zones (Gray Areas) */}
                <rect x="0" y="0" width="50" height="170" fill="#e0e0e0" opacity="0.5" />
                <rect x="350" y="0" width="50" height="170" fill="#e0e0e0" opacity="0.5" />

                {/* Labels */}
                <text x="70" y="100" className="text-xl font-bold fill-black font-mono">HR</text>
                <text x="310" y="100" className="text-xl font-bold fill-black font-mono">HR</text>
                <text x="50" y="340" className="text-xl font-bold fill-black font-mono">FOUL</text>
                <text x="310" y="340" className="text-xl font-bold fill-black font-mono">FOUL</text>

                {/* Data Points */}
                {data.map((p, i) => {
                    let color = 'red';
                    if (p.type === '2B') color = 'blue';
                    if (p.type === '3B') color = 'orange';
                    if (p.type === 'HR') color = 'purple';
                    
                    // Normalize data points to fit the SVG coordinate system
                    // p.x: -100 (Left) to 100 (Right)
                    // p.y: 0 (Home) to 100+ (Outfield)
                    
                    const scale = 1.0; // Adjusted scale for better visibility
                    const tx = 200 + (p.x * scale);
                    // CRITICAL FIX: Subtract from 310 because SVG Y coordinates go DOWN, 
                    // but baseball distance goes UP away from home plate.
                    const ty = 310 - (p.y * scale); 

                    return (
                        <circle key={i} cx={tx} cy={ty} r="4" fill={color} stroke="black" strokeWidth="0.5" />
                    );
                })}
            </svg>
        </div>
    );
};

export default FieldChart;