import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';

// 註冊 Chart.js 組件
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AnalysisChart = React.forwardRef(({ chartType, chartData, options, chartWrapperStyle }, ref) => {
    const chartProps = {
        ref: ref,
        data: chartData,
        options: options
    };

    const renderChart = () => {
        switch (chartType) {
            case 'pie': return <Pie {...chartProps} />;
            case 'doughnut': return <Doughnut {...chartProps} />;
            case 'line': return <Line {...chartProps} />;
            case 'radar': return <Radar {...chartProps} />;
            case 'bar':
            default: return <Bar {...chartProps} />;
        }
    };

    return (
        <div className={chartWrapperStyle.chartWrapper} style={chartWrapperStyle.style}>
            {renderChart()}
        </div>
    );
});

export default AnalysisChart;
