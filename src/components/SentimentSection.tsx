// FILE: src/components/SentimentSection.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface SentimentData {
  total_reviews: number;
  sentiment_distribution: {
    positive: number;
    negative: number;
  };
  yearly_trends: Array<{
    year: number;
    positive: number;
    negative: number;
  }>;
  categories: Array<{
    name: string;
    count: number;
    percentage: number;
    positive_count?: number;
    negative_count?: number;
    positive_percentage?: number;
    negative_percentage?: number;
  }>;
  samples: {
    positive: string[];
    negative: string[];
  };
  category_samples: Record<string, Array<{
    text: string;
    sentiment_label: string;
  }>>;
}

export interface SentimentSectionProps {
  // No props needed - component manages its own state
}

const SentimentSection: React.FC<SentimentSectionProps> = () => {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative'>('all');

  useEffect(() => {
    const fetchSentimentData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sentiment-analysis');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching sentiment data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSentimentData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500">Error loading sentiment data</p>
      </div>
    );
  }

  const total = data.sentiment_distribution.positive + data.sentiment_distribution.negative;
  
  // Sentiment distribution pie chart data
  const sentimentPieData = {
    labels: ['Positif', 'Negatif'],
    datasets: [
      {
        data: [
          data.sentiment_distribution.positive,
          data.sentiment_distribution.negative,
        ],
        backgroundColor: [
          '#10b981', // green
          '#ef4444', // red
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Yearly trends line chart data
  const yearlyTrendData = {
    labels: data.yearly_trends.map(item => item.year.toString()),
    datasets: [
      {
        label: 'Positif',
        data: data.yearly_trends.map(item => item.positive),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Negatif',
        data: data.yearly_trends.map(item => item.negative),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Category distribution bar chart data
  const categoryBarData = {
    labels: data.categories.map(cat => cat.name),
    datasets: [
      {
        label: 'Jumlah Review',
        data: data.categories.map(cat => cat.count),
        backgroundColor: [
          '#3b82f6', // blue
          '#8b5cf6', // purple
          '#f59e0b', // yellow
          '#10b981', // green
          '#ef4444', // red
          '#6b7280', // gray
        ],
        borderWidth: 1,
        borderColor: '#ffffff',
      },
    ],
  };

  // Category icons and colors mapping
  const categoryConfig: Record<string, { icon: string; bgColor: string; borderColor: string; textColor: string }> = {
    'Aplikasi': { icon: '📱', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-900' },
    'Pelayanan': { icon: '🤝', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-900' },
    'Tagihan': { icon: '💰', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-900' },
    'Jaringan': { icon: '🌐', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-900' },
    'Campuran': { icon: '🔄', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-900' },
    'Informasi': { icon: 'ℹ️', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-900' },
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analisis Sentimen PLN</h2>
        <p className="text-gray-600">
          Total {data.total_reviews.toLocaleString()} review dari pelanggan PLN
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Positif</p>
              <p className="text-2xl font-bold text-green-900">
                {((data.sentiment_distribution.positive / total) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-green-500 text-2xl">😊</div>
          </div>
          <p className="text-green-700 text-sm mt-1">
            {data.sentiment_distribution.positive.toLocaleString()} review
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">Negatif</p>
              <p className="text-2xl font-bold text-red-900">
                {((data.sentiment_distribution.negative / total) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-red-500 text-2xl">😞</div>
          </div>
          <p className="text-red-700 text-sm mt-1">
            {data.sentiment_distribution.negative.toLocaleString()} review
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sentiment Distribution Pie Chart */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Sentimen</h3>
          <div className="h-64">
            <Pie data={sentimentPieData} options={chartOptions} />
          </div>
        </div>

        {/* Yearly Trends Line Chart */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Sentimen per Tahun</h3>
          <div className="h-64">
            <Line data={yearlyTrendData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Category Analysis */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Komentar</h3>
        <div className="bg-gray-50 rounded-lg p-6 mb-4">
          <div className="h-64">
            <Bar data={categoryBarData} options={chartOptions} />
          </div>
        </div>
        
        {/* Category Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.categories.map((category) => {
            const config = categoryConfig[category.name] || { icon: '📋', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', textColor: 'text-gray-900' };
            
            // Gunakan data real dari backend atau fallback ke perhitungan dari samples
            const positiveCount = category.positive_count ?? data.category_samples[category.name]?.filter(item => item.sentiment_label === 'positive').length ?? 0;
            const negativeCount = category.negative_count ?? data.category_samples[category.name]?.filter(item => item.sentiment_label === 'negative').length ?? 0;
            const totalCategorySamples = positiveCount + negativeCount;
            const positivePercentage = totalCategorySamples > 0 ? (positiveCount / totalCategorySamples * 100) : 0;
            
            return (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-105 ${
                  selectedCategory === category.name
                    ? 'bg-blue-100 border-blue-300 text-blue-900 shadow-lg'
                    : `${config.bgColor} ${config.borderColor} hover:shadow-md`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl">{config.icon}</div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedCategory === category.name ? 'bg-blue-200 text-blue-800' : 'bg-white bg-opacity-70'
                  }`}>
                    {category.percentage}%
                  </div>
                </div>
                <div className={`font-semibold text-lg mb-2 ${selectedCategory === category.name ? 'text-blue-900' : config.textColor}`}>
                  {category.name}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {category.count.toLocaleString()} review
                </div>
                
                {/* Sentiment breakdown */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-green-100 rounded-lg p-2 text-center">
                    <div className="text-xs text-green-600 font-medium">Positif</div>
                    <div className="text-sm font-bold text-green-800">{positiveCount.toLocaleString()}</div>
                    <div className="text-xs text-green-600">{category.positive_percentage ? category.positive_percentage.toFixed(1) : (positiveCount / category.count * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-red-100 rounded-lg p-2 text-center">
                    <div className="text-xs text-red-600 font-medium">Negatif</div>
                    <div className="text-sm font-bold text-red-800">{negativeCount.toLocaleString()}</div>
                    <div className="text-xs text-red-600">{category.negative_percentage ? category.negative_percentage.toFixed(1) : (negativeCount / category.count * 100).toFixed(1)}%</div>
                  </div>
                </div>
                
                {/* Progress bar showing positive vs negative ratio */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="h-full flex">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300" 
                      style={{ width: `${positivePercentage}%` }}
                    ></div>
                    <div 
                      className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-300" 
                      style={{ width: `${100 - positivePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Category Sample Texts */}
      {selectedCategory && data.category_samples[selectedCategory] && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-blue-900">
              Contoh Komentar: {selectedCategory}
            </h4>
            <button
              onClick={() => setSelectedCategory(null)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm text-gray-700 transition-colors"
            >
              ✕ Tutup
            </button>
          </div>
          
          {/* Sentiment Filter Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSentimentFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sentimentFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Semua ({data.category_samples[selectedCategory].length})
            </button>
            <button
              onClick={() => setSentimentFilter('positive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sentimentFilter === 'positive'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              😊 Positif ({data.category_samples[selectedCategory].filter(item => item.sentiment_label === 'positive').length})
            </button>
            <button
              onClick={() => setSentimentFilter('negative')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sentimentFilter === 'negative'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              😞 Negatif ({data.category_samples[selectedCategory].filter(item => item.sentiment_label === 'negative').length})
            </button>
          </div>
          
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {data.category_samples[selectedCategory]
              .filter(item => sentimentFilter === 'all' || item.sentiment_label === sentimentFilter)
              .map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-sm transition-all duration-200 hover:shadow-md ${
                  item.sentiment_label === 'positive'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1">"{item.text}"</p>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-70 flex-shrink-0">
                    {item.sentiment_label === 'positive' ? '😊' : '😞'}
                  </span>
                </div>
              </div>
            ))}
            
            {data.category_samples[selectedCategory].filter(item => sentimentFilter === 'all' || item.sentiment_label === sentimentFilter).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Tidak ada komentar {sentimentFilter === 'positive' ? 'positif' : sentimentFilter === 'negative' ? 'negatif' : ''} untuk kategori ini
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SentimentSection;