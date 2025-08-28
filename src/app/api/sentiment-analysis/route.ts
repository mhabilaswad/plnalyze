import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/sentiment-analysis`);
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sentiment analysis:', error);
    
    // Return mock data as fallback
    return NextResponse.json({
      total_reviews: 325641,
      sentiment_distribution: {
        positive: 200000,
        negative: 125641
      },
      yearly_trends: [
        { year: 2023, positive: 50000, negative: 25000 },
        { year: 2024, positive: 80000, negative: 50000 },
        { year: 2025, positive: 70000, negative: 50641 }
      ],
      categories: [
        { name: 'Aplikasi', count: 130000, percentage: 40, positive_count: 78000, negative_count: 52000, positive_percentage: 60.0, negative_percentage: 40.0 },
        { name: 'Pelayanan', count: 97641, percentage: 30, positive_count: 48820, negative_count: 48821, positive_percentage: 50.0, negative_percentage: 50.0 },
        { name: 'Tagihan', count: 65000, percentage: 20, positive_count: 26000, negative_count: 39000, positive_percentage: 40.0, negative_percentage: 60.0 },
        { name: 'Jaringan', count: 33000, percentage: 10, positive_count: 13200, negative_count: 19800, positive_percentage: 40.0, negative_percentage: 60.0 }
      ],
      samples: {
        positive: ['Aplikasi sangat membantu', 'Pelayanan memuaskan'],
        negative: ['Aplikasi sering error', 'Pelayanan lambat']
      },
      category_samples: {
        'Aplikasi': [
          { text: 'Aplikasi PLN Mobile sangat memudahkan', sentiment_label: 'positive' },
          { text: 'Sering crash saat bayar token', sentiment_label: 'negative' }
        ],
        'Pelayanan': [
          { text: 'Customer service responsif', sentiment_label: 'positive' },
          { text: 'Lama banget ditanggapi', sentiment_label: 'negative' }
        ]
      }
    });
  }
}
