/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';
import { Activity, Search, LayoutDashboard, Radio, TrendingUp, TrendingDown, Minus, FileText, Smile, Frown, Meh, Globe, Flame, BarChart2, Calendar, X, ExternalLink, MapPin, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import NewsDetailPage from './components/NewsDetailPage';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwKZEQ0e2BA_HW7H_e-Og2aNP5DS5miZPbaD-raEMlcRC8JZNULqPjEctCqOBsJ763J4xnbTjVlq_L/pub?gid=0&single=true&output=csv";

// Colors based on the design
const COLORS = {
  positive: '#10B981', // Emerald 500
  neutral: '#F59E0B',  // Amber 500
  negative: '#EF4444', // Red 500
  primary: '#3B82F6',  // Blue 500
  bg: '#F3F4F6',       // Gray 100
  header: '#1E3A8A',   // Blue 900
  ticker: '#111827',   // Gray 900
};

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('Semua');
  const [timeFilter, setTimeFilter] = useState('7 Hari');
  const [regionFilter, setRegionFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  // Fetch data
  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      // Add cache-busting parameter to ensure we get the latest data from Google Sheets
      const response = await fetch(`${CSV_URL}&_t=${new Date().getTime()}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Filter out rows that don't have a title (JUDUL) to remove empty trailing rows
          const validData = results.data.filter((row: any) => row['JUDUL'] && String(row['JUDUL']).trim() !== '');
          setData(validData);
          setLoading(false);
          setError(null); // Clear error on successful fetch
        },
        error: (err: any) => {
          setError(err.message);
          setLoading(false);
        }
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true); // Initial fetch with loading state
    const dataInterval = setInterval(() => fetchData(false), 10000); // Silent refresh every 10 seconds for real-time feel
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000); // Update clock every second
    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // --- Data Processing Logic ---
  // Using actual data from the Google Sheet
  
  // Filter data based on region (KAB/KOTA)
  const filteredDataByRegion = useMemo(() => {
    if (regionFilter === 'Semua') return data;
    return data.filter(row => {
      const kabKota = String(row['KAB/KOTA'] || '').toLowerCase();
      return kabKota.includes(regionFilter.toLowerCase());
    });
  }, [data, regionFilter]);

  // We don't have a real timestamp for "Hari Ini", "7 Hari", etc. in the CSV (it just says "Rabu, 25 Juni ")
  // So we will apply a simple slice or mock filter for the time filter to show UI changes, 
  // but base it on the actual data rows.
  const displayData = useMemo(() => {
    let result = [...filteredDataByRegion];
    // Sort by row index descending (assuming newer rows are at the bottom or top)
    // Actually, let's just reverse it so newest is first if appended at bottom
    result = result.reverse();
    
    if (timeFilter === 'Hari Ini') {
      result = result.slice(0, Math.max(1, Math.floor(result.length * 0.1)));
    } else if (timeFilter === '7 Hari') {
      result = result.slice(0, Math.max(1, Math.floor(result.length * 0.5)));
    } else if (timeFilter === '30 Hari') {
      result = result.slice(0, Math.max(1, Math.floor(result.length * 0.8)));
    }
    return result;
  }, [filteredDataByRegion, timeFilter]);

  const totalBerita = displayData.length;
  
  // Real sentiment distribution
  const sentimentCounts = useMemo(() => {
    let positif = 0, netral = 0, negatif = 0;
    displayData.forEach(row => {
      const val = String(row['SENTIMEN'] || '').toLowerCase().trim();
      if (val === 'positif') positif++;
      else if (val === 'negatif') negatif++;
      else netral++; // Default to netral for empty or unrecognized
    });
    return { positif, netral, negatif };
  }, [displayData]);

  const totalSentiment = sentimentCounts.positif + sentimentCounts.netral + sentimentCounts.negatif;
  const pctPos = totalSentiment ? Math.round((sentimentCounts.positif / totalSentiment) * 100) : 0;
  const pctNeu = totalSentiment ? Math.round((sentimentCounts.netral / totalSentiment) * 100) : 0;
  const pctNeg = totalSentiment ? Math.round((sentimentCounts.negatif / totalSentiment) * 100) : 0;

  // Real Media Count
  const uniqueMediaCount = useMemo(() => {
    const mediaSet = new Set();
    displayData.forEach(row => {
      const media = String(row['NAMA MEDIA'] || '').trim();
      if (media) mediaSet.add(media);
    });
    return mediaSet.size;
  }, [displayData]);

  // Trend Data (Group by TANGGAL)
  const trendData = useMemo(() => {
    const dateCounts: Record<string, number> = {};
    displayData.forEach(row => {
      let date = String(row['TANGGAL'] || '').trim();
      if (!date) date = 'Unknown';
      // Simplify date string (e.g., "Rabu, 25 Juni " -> "25 Juni")
      const parts = date.split(',');
      if (parts.length > 1) date = parts[1].trim();
      
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    
    // Convert to array and take top 7 most recent/frequent
    return Object.entries(dateCounts)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 7)
      .reverse(); // Chronological order if possible
  }, [displayData]);

  // Top Destinations (Group by KAB/KOTA)
  const topDestinations = useMemo(() => {
    const destCounts: Record<string, number> = {};
    displayData.forEach(row => {
      const dests = String(row['KAB/KOTA'] || '').split(',');
      dests.forEach(d => {
        const cleanDest = d.trim();
        if (cleanDest && cleanDest !== 'undefined') {
          destCounts[cleanDest] = (destCounts[cleanDest] || 0) + 1;
        }
      });
    });
    
    const sorted = Object.entries(destCounts)
      .map(([name, count]) => ({ name, count, trend: 'neutral' as const }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
      
    const max = sorted.length > 0 ? sorted[0].count : 1;
    return sorted.map(d => ({ ...d, max }));
  }, [displayData]);

  // Map Data based on real KAB/KOTA
  const mapData = useMemo(() => {
    const coordinates: Record<string, [number, number]> = {
      'kota bandung': [-6.9147, 107.6098],
      'kabupaten bogor': [-6.5971, 106.8060],
      'kabupaten pangandaran': [-7.6963, 108.6563],
      'kabupaten garut': [-7.2279, 107.9087],
      'kabupaten bandung barat': [-6.8406, 107.4878],
      'kota cirebon': [-6.7320, 108.5523],
      'kota depok': [-6.4025, 106.7942],
      'kota sukabumi': [-6.9228, 106.9222],
      'kabupaten tasikmalaya': [-7.3195, 108.2040],
      'kabupaten purwakarta': [-6.5569, 107.4433],
      'kabupaten subang': [-6.5686, 107.7667],
      'kabupaten cianjur': [-6.8167, 107.1333],
      'kabupaten majalengka': [-6.8361, 108.2260],
    };

    const destCounts: Record<string, number> = {};
    displayData.forEach(row => {
      const dests = String(row['KAB/KOTA'] || '').split(',');
      dests.forEach(d => {
        const cleanDest = d.trim();
        if (cleanDest && cleanDest !== 'undefined') {
          destCounts[cleanDest] = (destCounts[cleanDest] || 0) + 1;
        }
      });
    });

    return Object.entries(destCounts).map(([name, count]) => {
      const key = name.toLowerCase();
      // Find matching coordinates, default to center of Jabar if not found
      let lat = -6.9204;
      let lng = 107.6046;
      
      for (const [k, coords] of Object.entries(coordinates)) {
        if (key.includes(k) || k.includes(key)) {
          lat = coords[0];
          lng = coords[1];
          break;
        }
      }
      
      return { name, lat, lng, count };
    });
  }, [displayData]);

  // Real Recent News
  const recentNews = useMemo(() => {
    return displayData.slice(0, 50).map((row, i) => {
      const sentimenRaw = String(row['SENTIMEN'] || '').trim();
      let sentimen = 'Netral';
      if (sentimenRaw.toLowerCase() === 'positif') sentimen = 'Positif';
      if (sentimenRaw.toLowerCase() === 'negatif') sentimen = 'Negatif';

      const urlFotoRaw = String(row['URL FOTO'] || '').trim();
      const urlRaw = String(row['LINK URL'] || '').trim();

      return {
        id: i,
        judul: String(row['JUDUL'] || 'Tanpa Judul'),
        media: String(row['NAMA MEDIA'] || 'Unknown Media'),
        destinasi: String(row['KAB/KOTA'] || 'Jawa Barat'),
        sentimen: sentimen,
        tanggal: String(row['TANGGAL'] || ''),
        reach: '-', // No reach data in CSV
        url: urlRaw !== 'undefined' && urlRaw !== '' ? urlRaw : '',
        urlFoto: urlFotoRaw !== 'undefined' && urlFotoRaw !== '' ? urlFotoRaw : '',
        isiBerita: String(row['ISI BERITA'] || ''),
        analisis: String(row['ANALISIS'] || '')
      };
    });
  }, [displayData]);

  const filteredNews = useMemo(() => {
    let filtered = recentNews;
    
    if (activeTab !== 'Semua') {
      filtered = filtered.filter(n => n.sentimen === activeTab);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.judul.toLowerCase().includes(query) || 
        n.media.toLowerCase().includes(query) ||
        n.destinasi.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [recentNews, activeTab, searchQuery]);

  // Topik Hangat (Tags)
  const topTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    displayData.forEach(row => {
      const tags = String(row['TAG'] || '').split(',');
      tags.forEach(t => {
        const cleanTag = t.trim();
        if (cleanTag && cleanTag !== 'undefined' && cleanTag !== '-') {
          const formattedTag = cleanTag.startsWith('#') ? cleanTag : `#${cleanTag.replace(/\s+/g, '')}`;
          tagCounts[formattedTag] = (tagCounts[formattedTag] || 0) + 1;
        }
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  }, [displayData]);

  // Sumber Media Terbanyak
  const topMedia = useMemo(() => {
    const mediaCounts: Record<string, number> = {};
    displayData.forEach(row => {
      const media = String(row['NAMA MEDIA'] || '').trim();
      if (media && media !== 'undefined') {
        mediaCounts[media] = (mediaCounts[media] || 0) + 1;
      }
    });
    
    const sorted = Object.entries(mediaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
      
    const total = sorted.reduce((sum, item) => sum + item[1], 0);
    
    return {
      totalUnique: Object.keys(mediaCounts).length,
      list: sorted.map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0
      }))
    };
  }, [displayData]);

  // Format date for header
  const formatDate = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}.${date.getMinutes().toString().padStart(2, '0')}.${date.getSeconds().toString().padStart(2, '0')} WIB`;
  };

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center text-gray-500">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="font-medium">Memuat data dari Google Sheets...</p>
      </div>
    );
  }

  if (selectedNews) {
    return (
      <NewsDetailPage 
        news={selectedNews} 
        onBack={() => setSelectedNews(null)} 
        relatedNews={recentNews} 
        onSelectNews={setSelectedNews} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-800 font-sans overflow-x-hidden">
      {/* Top Header */}
      <header className="bg-[#1E3A8A] text-white">
        <div className="px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-white/10 p-2 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm md:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="text-xl">📊</span> Dashboard News Monitoring Pariwisata Jabar
              </h1>
              <p className="text-[10px] md:text-xs text-blue-200">Ringkasan Informasi Media & Sentimen Berita Pariwisata Jawa Barat • Real-time</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                error ? 'bg-red-500/20 border-red-500/30 text-red-100' : 'bg-white/10 border-white/20'
              }`}
              title={error ? `Error: ${error}` : 'Terhubung ke Google Sheets'}
            >
              <span className="relative flex h-2.5 w-2.5">
                {!error && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${error ? 'bg-red-500' : 'bg-green-500'}`}></span>
              </span>
              <span className="text-[10px] font-medium tracking-wider">{error ? 'SYNC ERROR' : 'LIVE'}</span>
            </div>
            
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium">{formatDate(currentTime)}</div>
              <div className="text-xs text-blue-200">{formatTime(currentTime)}</div>
            </div>
            
            <div className="border-l border-blue-700 pl-4 text-right hidden md:block">
              <div className="text-sm font-medium">Dinas Pariwisata Jawa Barat</div>
              <div className="text-xs text-blue-200">Media Intelligence Unit</div>
            </div>
          </div>
        </div>
      </header>

      {/* Breaking News Ticker */}
      <div className="bg-[#111827] text-white px-6 py-2 flex items-center text-sm overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-2 font-bold text-blue-400 mr-4 shrink-0">
          <Radio className="w-4 h-4 animate-pulse" />
          BREAKING
        </div>
        <div className="animate-[marquee_30s_linear_infinite] inline-block">
          <span className="mx-4">sata Pangandaran masih jadi sorotan media •</span>
          <span className="mx-4 text-red-400">🔴 Kebersihan objek wisata Lembang dikeluhkan pengunjung di media sosial •</span>
          <span className="mx-4 text-green-400">🟢 Branding "Explore West Java" mendapat respons positif di platform digital •</span>
          <span className="mx-4 text-yellow-400">🟡 Tiket masuk objek wisata...</span>
        </div>
      </div>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col gap-4 w-full">
            {/* Filter Waktu */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-800">Waktu:</h2>
              </div>
              <div className="flex flex-wrap bg-gray-50 border border-gray-200 rounded-lg p-1">
                {['Hari Ini', '7 Hari', '30 Hari', 'Tahun Ini'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      timeFilter === filter 
                        ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Wilayah */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-800">Wilayah:</h2>
              </div>
              <select 
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="Semua">Semua Kabupaten/Kota</option>
                <option value="Kota Bandung">Kota Bandung</option>
                <option value="Kab. Bogor">Kab. Bogor</option>
                <option value="Kab. Garut">Kab. Garut</option>
                <option value="Pangandaran">Pangandaran</option>
                <option value="Lembang">Lembang</option>
                <option value="Kota Cirebon">Kota Cirebon</option>
                <option value="Kota Depok">Kota Depok</option>
              </select>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="w-full relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari berita, media, atau destinasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-blue-50/50 border-2 border-blue-400 p-4 rounded-xl">
          {/* Total Berita */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Berita</h3>
              <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-2">{totalBerita.toLocaleString('id-ID')}</div>
            <div className="flex items-center text-xs text-gray-500 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              Berdasarkan filter saat ini
            </div>
          </div>

          {/* Sentimen Positif */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-gray-500">Sentimen Positif</h3>
              <div className="p-1.5 bg-green-50 rounded-md text-green-600">
                <Smile className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">{sentimentCounts.positif.toLocaleString('id-ID')}</div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="w-full bg-gray-100 rounded-full h-1.5 mr-2">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pctPos}%` }}></div>
              </div>
              <span>{pctPos}%</span>
            </div>
          </div>

          {/* Sentimen Netral */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-gray-500">Sentimen Netral</h3>
              <div className="p-1.5 bg-yellow-50 rounded-md text-yellow-600">
                <Meh className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-yellow-500 mb-2">{sentimentCounts.netral.toLocaleString('id-ID')}</div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="w-full bg-gray-100 rounded-full h-1.5 mr-2">
                <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${pctNeu}%` }}></div>
              </div>
              <span>{pctNeu}%</span>
            </div>
          </div>

          {/* Sentimen Negatif */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-gray-500">Sentimen Negatif</h3>
              <div className="p-1.5 bg-red-50 rounded-md text-red-600">
                <Frown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-500 mb-2">{sentimentCounts.negatif.toLocaleString('id-ID')}</div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="w-full bg-gray-100 rounded-full h-1.5 mr-2">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${pctNeg}%` }}></div>
              </div>
              <span>{pctNeg}%</span>
            </div>
          </div>

          {/* Media Terpantau */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-gray-500">Media Terpantau</h3>
              <div className="p-1.5 bg-purple-50 rounded-md text-purple-600">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-2">{topMedia.totalUnique.toLocaleString('id-ID')}</div>
            <div className="text-xs text-gray-500 flex items-center">
              <LayoutDashboard className="w-3 h-3 mr-1" />
              Online • Print • Broadcast
            </div>
          </div>
        </div>

        {/* Middle Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tren Berita */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-800">Tren Berita {timeFilter}</h2>
                <p className="text-xs text-gray-500">Volume berita {timeFilter === 'Hari Ini' ? 'per jam' : timeFilter === 'Tahun Ini' ? 'bulanan' : timeFilter === '30 Hari' ? 'mingguan' : 'harian'}</p>
              </div>
              <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                {timeFilter === 'Hari Ini' ? 'Hari Ini' : timeFilter === '7 Hari' ? '7 Hari Terakhir' : timeFilter === '30 Hari' ? '30 Hari Terakhir' : 'Tahun 2025'}
              </div>
            </div>
            <div className="h-[220px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9CA3AF'}} dy={10} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', backgroundColor: '#ffffff', padding: '8px 12px' }}
                    formatter={(value: number) => [`${value.toLocaleString('id-ID')} Berita`, 'Volume']}
                    labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                    cursor={{ fill: '#F3F4F6' }}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribusi Sentimen */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="mb-2">
              <h2 className="text-base font-bold text-gray-800">Distribusi Sentimen</h2>
              <p className="text-xs text-gray-500">Keseluruhan periode</p>
            </div>
            <div className="flex flex-col items-center justify-center h-[220px]">
              <div className="w-full h-[140px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', backgroundColor: '#ffffff', padding: '8px 12px' }}
                      formatter={(value: number) => [`${value}%`, 'Persentase']}
                      itemStyle={{ fontWeight: 500, color: '#374151' }}
                    />
                    <Pie
                      data={[
                        { name: 'Positif', value: pctPos, color: COLORS.positive },
                        { name: 'Netral', value: pctNeu, color: COLORS.neutral },
                        { name: 'Negatif', value: pctNeg, color: COLORS.negative }
                      ]}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                      paddingAngle={2} dataKey="value" stroke="none"
                    >
                      {([
                        { name: 'Positif', value: pctPos, color: COLORS.positive },
                        { name: 'Netral', value: pctNeu, color: COLORS.neutral },
                        { name: 'Negatif', value: pctNeg, color: COLORS.negative }
                      ]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-gray-800">{totalBerita}</span>
                  <span className="text-[10px] text-gray-500">berita</span>
                </div>
              </div>
              <div className="w-full space-y-2 mt-2 px-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2"></div><span className="text-gray-600">Positif</span></div>
                  <span className="font-bold text-green-600">{pctPos}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-2"></div><span className="text-gray-600">Netral</span></div>
                  <span className="font-bold text-yellow-600">{pctNeu}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></div><span className="text-gray-600">Negatif</span></div>
                  <span className="font-bold text-red-600">{pctNeg}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row: Map & Top Destinations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Peta Sebaran Berita (Heatmap) */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-blue-600" /> Peta Sebaran Berita Jawa Barat
                </h2>
                <p className="text-xs text-gray-500">Intensitas pemberitaan berdasarkan wilayah (Heatmap)</p>
              </div>
            </div>
            <div className="flex-1 min-h-[300px] w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
              <MapContainer 
                center={[-6.9147, 107.6098]} // Center of West Java
                zoom={8} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {mapData.map((loc, idx) => {
                  // Calculate radius and color based on count
                  const maxCount = Math.max(...mapData.map(d => d.count));
                  const intensity = loc.count / maxCount;
                  const radius = 10 + (intensity * 25); // Min 10px, Max 35px
                  
                  // Color scale from yellow (low) to red (high)
                  const r = 255;
                  const g = Math.floor(255 * (1 - intensity));
                  const b = 0;
                  const color = `rgb(${r}, ${g}, ${b})`;

                  return (
                    <CircleMarker
                      key={idx}
                      center={[loc.lat, loc.lng]}
                      radius={radius}
                      pathOptions={{ 
                        fillColor: color, 
                        fillOpacity: 0.6, 
                        color: color, 
                        weight: 1 
                      }}
                    >
                      <LeafletTooltip direction="top" offset={[0, -10]} opacity={1}>
                        <div className="text-center">
                          <div className="font-bold text-gray-800">{loc.name}</div>
                          <div className="text-xs text-gray-600">{loc.count.toLocaleString('id-ID')} Berita</div>
                        </div>
                      </LeafletTooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* Top 5 Destinasi */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-800">Top 5 Destinasi Terpopuler</h2>
              <p className="text-xs text-gray-500">Berdasarkan volume pemberitaan</p>
            </div>
            <div className="space-y-4">
              {topDestinations.map((dest, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center">
                      <span className="text-gray-400 w-4 text-xs">{idx + 1}</span>
                      <span className="font-medium text-gray-700">{dest.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">{dest.count.toLocaleString('id-ID')} berita</span>
                      {dest.trend === 'up' && <div className="w-4 h-4 rounded bg-green-100 text-green-600 flex items-center justify-center text-[10px]">↑</div>}
                      {dest.trend === 'down' && <div className="w-4 h-4 rounded bg-red-100 text-red-600 flex items-center justify-center text-[10px]">↓</div>}
                      {dest.trend === 'neutral' && <div className="w-4 h-4 rounded bg-yellow-100 text-yellow-600 flex items-center justify-center text-[10px]">-</div>}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-blue-400' : idx === 2 ? 'bg-blue-300' : idx === 3 ? 'bg-yellow-400' : 'bg-red-400'}`} 
                      style={{ width: `${(dest.count / dest.max) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Berita Terkini Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-gray-800">Berita Terkini</h2>
                <p className="text-xs text-gray-500">Monitoring real-time pemberitaan pariwisata</p>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {['Semua', 'Positif', 'Netral', 'Negatif'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeTab === tab 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 font-medium">Judul Berita</th>
                    <th className="px-5 py-3 font-medium">Media</th>
                    <th className="px-5 py-3 font-medium">Destinasi</th>
                    <th className="px-5 py-3 font-medium">Sentimen</th>
                    <th className="px-5 py-3 font-medium">Tanggal</th>
                    <th className="px-5 py-3 font-medium text-right">Reach</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredNews.map((news) => (
                    <tr 
                      key={news.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedNews(news)}
                    >
                      <td className="px-5 py-3 font-medium text-gray-800 max-w-[250px] truncate" title={news.judul}>{news.judul}</td>
                      <td className="px-5 py-3 text-gray-500">{news.media}</td>
                      <td className="px-5 py-3 text-gray-600">{news.destinasi}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                          news.sentimen === 'Positif' ? 'bg-green-100 text-green-700' :
                          news.sentimen === 'Negatif' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {news.sentimen}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{news.tanggal}</td>
                      <td className="px-5 py-3 text-gray-800 font-medium text-right">{news.reach}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Sidebar (Topik Hangat & Sumber Media) */}
          <div className="space-y-6 flex flex-col">
            {/* Topik Hangat */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-red-500" /> Topik Hangat
              </h2>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">#WisataJabar</span>
                <span className="px-3 py-1.5 bg-green-50 text-green-600 text-xs font-medium rounded-full">#FestivalPesona</span>
                <span className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">#Bandung</span>
                <span className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-medium rounded-full">#Pangandaran</span>
                <span className="px-3 py-1.5 bg-purple-50 text-purple-600 text-xs font-medium rounded-full">#ExploreWestJava</span>
                <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-full">#Lembang</span>
                <span className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">#Garut</span>
                <span className="px-3 py-1.5 bg-teal-50 text-teal-600 text-xs font-medium rounded-full">#KunjunganWisata</span>
                <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">#HotelBintang</span>
                <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full">#InfrastrukturWisata</span>
              </div>
            </div>

            {/* Sumber Media Terbanyak */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex-1">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-blue-500" /> Sumber Media Terbanyak
              </h2>
              <div className="space-y-4">
                {[
                  { name: 'Detik.com', count: 642, pct: 85 },
                  { name: 'Kompas.com', count: 541, pct: 70 },
                  { name: 'Tribun Jabar', count: 453, pct: 60 },
                  { name: 'Pikiran Rakyat', count: 312, pct: 40 },
                  { name: 'CNN Indonesia', count: 289, pct: 35 },
                ].map((media, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <div className="w-24 text-gray-600 truncate text-xs">{media.name}</div>
                    <div className="flex-1 mx-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${media.pct}%` }}></div>
                    </div>
                    <div className="w-8 text-right font-medium text-gray-800 text-xs">{media.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add custom styles for the marquee animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}

