/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Activity, Search, LayoutDashboard, Radio, TrendingUp, TrendingDown, Minus, FileText, Smile, Frown, Meh, Globe, Flame, BarChart2, Calendar, X, ExternalLink, MapPin, Map as MapIcon, FileDown, Moon, Sun, ArrowUp, ArrowDown, ArrowUpDown, Sparkles, Settings, Menu } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import NewsDetailPage from './components/NewsDetailPage';
import ReportStudio from './components/ReportStudio';
import NewsPortal from './components/NewsPortal';
import Sidebar, { ViewType } from './components/Sidebar';
import { useFilters } from './contexts/FilterContext';

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Filter Bar Skeleton */}
    <div className="h-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"></div>
    
    {/* Metric Cards Skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"></div>
      ))}
    </div>

    {/* Charts Row Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-[300px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"></div>
      <div className="h-[300px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"></div>
    </div>

    {/* Map & Table Row Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-[400px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"></div>
      <div className="h-[400px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"></div>
    </div>
  </div>
);

const NewsPortalSkeleton = () => (
  <div className="max-w-[1600px] mx-auto space-y-8 animate-pulse">
    {/* Filters Skeleton */}
    <div className="h-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>

    {/* Hero Section Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 h-[400px] md:h-[500px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="flex-1 h-[190px] md:h-[240px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
        <div className="flex-1 h-[190px] md:h-[240px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
      </div>
    </div>

    {/* Grid Section Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-[380px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
      ))}
    </div>
  </div>
);

function MapZoomer({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

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

const parseIndonesianDate = (dateStr: string) => {
  const months: Record<string, number> = {
    'januari': 0, 'jan': 0,
    'februari': 1, 'feb': 1,
    'maret': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'mei': 4,
    'juni': 5, 'jun': 5,
    'juli': 6, 'jul': 6,
    'agustus': 7, 'ags': 7, 'aug': 7,
    'september': 8, 'sep': 8,
    'oktober': 9, 'okt': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'desember': 11, 'des': 11, 'dec': 11
  };
  const parts = dateStr.toLowerCase().split(' ');
  let day = 1;
  let month = 0;
  let year = new Date().getFullYear();
  for (const part of parts) {
    const cleanPart = part.replace(',', '');
    if (!isNaN(parseInt(cleanPart))) {
      if (cleanPart.length === 4) {
        year = parseInt(cleanPart);
      } else {
        day = parseInt(cleanPart);
      }
    } else if (months[cleanPart] !== undefined) {
      month = months[cleanPart];
    }
  }
  return new Date(year, month, day);
};

const KAB_KOTA_JABAR = [
  "Kabupaten Bogor", "Kabupaten Sukabumi", "Kabupaten Cianjur", "Kabupaten Bandung",
  "Kabupaten Garut", "Kabupaten Tasikmalaya", "Kabupaten Ciamis", "Kabupaten Kuningan",
  "Kabupaten Cirebon", "Kabupaten Majalengka", "Kabupaten Sumedang", "Kabupaten Indramayu",
  "Kabupaten Subang", "Kabupaten Purwakarta", "Kabupaten Karawang", "Kabupaten Bekasi",
  "Kabupaten Bandung Barat", "Kabupaten Pangandaran", "Kota Bogor", "Kota Sukabumi",
  "Kota Bandung", "Kota Cirebon", "Kota Bekasi", "Kota Depok", "Kota Cimahi",
  "Kota Tasikmalaya", "Kota Banjar"
];

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { 
    timeFilter, setTimeFilter, 
    regionFilter, setRegionFilter, 
    sentimentFilter, setSentimentFilter, 
    searchQuery, setSearchQuery,
    resetFilters 
  } = useFilters();

  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.9147, 107.6098]);
  const [mapZoom, setMapZoom] = useState(8);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('view') as ViewType) || 'dashboard';
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 300); 
    return () => clearTimeout(timer);
  }, [localSearchQuery, setSearchQuery]);

  // Sync local search with global search (e.g. if reset)
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Sync view to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeView !== 'dashboard') params.set('view', activeView);
    else params.delete('view');
    
    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [activeView]);

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) { // lg
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const lastCsvTextRef = useRef<string>('');

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fetch data
  const fetchData = async (isInitial = false) => {
    try {
      setLoading(true);
      // Add cache-busting parameter to ensure we get the latest data from Google Sheets
      const response = await fetch(`${CSV_URL}&_t=${new Date().getTime()}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const csvText = await response.text();
      
      // Smart Diffing: Skip parsing and re-rendering if the data hasn't changed
      if (!isInitial && csvText === lastCsvTextRef.current) {
        return;
      }
      lastCsvTextRef.current = csvText;
      
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        worker: true, // Use Web Worker to prevent UI freezing during parse
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
    // Google Sheets "Publish to Web" caches data for ~5 minutes. 
    // Polling every 60 seconds is much more efficient than 10 seconds.
    const dataInterval = setInterval(() => fetchData(false), 60000); 
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
    
    // Apply Sentiment Filter
    if (sentimentFilter !== 'Semua') {
      result = result.filter(row => {
        const val = String(row['SENTIMEN'] || '').toLowerCase().trim();
        return val === sentimentFilter.toLowerCase();
      });
    }

    // Apply Search Query Filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(row => {
        const judul = String(row['JUDUL'] || '').toLowerCase();
        const media = String(row['NAMA MEDIA'] || '').toLowerCase();
        const kabKota = String(row['KAB/KOTA'] || '').toLowerCase();
        const isiBerita = String(row['ISI BERITA'] || '').toLowerCase();
        return judul.includes(query) || media.includes(query) || kabKota.includes(query) || isiBerita.includes(query);
      });
    }

    // Sort by date descending
    result.sort((a, b) => {
      const dateA = parseIndonesianDate(a['TANGGAL'] || '');
      const dateB = parseIndonesianDate(b['TANGGAL'] || '');
      return dateB.getTime() - dateA.getTime();
    });
    
    const now = currentTime;
    
    if (timeFilter === 'Hari Ini') {
      result = result.filter(row => {
        const date = parseIndonesianDate(row['TANGGAL'] || '');
        return date.toDateString() === now.toDateString();
      });
    } else if (timeFilter === '7 Hari') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      result = result.filter(row => {
        const date = parseIndonesianDate(row['TANGGAL'] || '');
        return date >= sevenDaysAgo && date <= now;
      });
    } else if (timeFilter === '30 Hari') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      result = result.filter(row => {
        const date = parseIndonesianDate(row['TANGGAL'] || '');
        return date >= thirtyDaysAgo && date <= now;
      });
    } else if (timeFilter === 'Tahun Ini') {
      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setMonth(now.getMonth() - 12);
      result = result.filter(row => {
        const date = parseIndonesianDate(row['TANGGAL'] || '');
        return date >= twelveMonthsAgo && date <= now;
      });
    }
    return result;
  }, [filteredDataByRegion, timeFilter, currentTime]);

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

  // Trend Data (Group by TANGGAL based on timeFilter)
  const trendData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    displayData.forEach(row => {
      const dateStr = String(row['TANGGAL'] || '').trim();
      if (!dateStr) return;
      
      const parsedDate = parseIndonesianDate(dateStr);
      let key = '';

      if (timeFilter === 'Tahun Ini') {
        // Group by Month and Year
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        key = `${monthNames[parsedDate.getMonth()]} '${parsedDate.getFullYear().toString().slice(2)}`;
      } else if (timeFilter === '30 Hari') {
        // Group by Week (approximate, e.g., "Minggu 1", "Minggu 2" relative to the month, or just week of year)
        // A simpler approach for 30 days is to group by 7-day intervals from today, or just format as "W1", "W2"
        // Let's use the week of the year
        const firstDayOfYear = new Date(parsedDate.getFullYear(), 0, 1);
        const pastDaysOfYear = (parsedDate.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `Minggu ${weekNum}`;
      } else {
        // Group by Day (for 7 Hari, Hari Ini, Semua)
        const parts = dateStr.split(',');
        key = parts.length > 1 ? parts[1].trim() : dateStr;
      }
      
      counts[key] = (counts[key] || 0) + 1;
    });
    
    // Convert to array
    let result = Object.entries(counts).map(([name, value]) => ({ name, value }));
    
    // Sort chronologically if possible. Since keys might be strings like "Minggu 12" or "25 Juni", 
    // it's better to sort them based on their original order in displayData (which is already sorted descending by date).
    // Actually, displayData is sorted descending. So if we just reverse the unique keys we found, it might be chronological.
    // Let's just reverse the result array since displayData is descending.
    result = result.reverse();

    // Limit based on filter
    if (timeFilter === 'Tahun Ini') {
      return result.slice(-12); // Last 12 months
    } else if (timeFilter === '30 Hari') {
      return result.slice(-4); // Last 4 weeks
    } else if (timeFilter === '7 Hari') {
      return result.slice(-7); // Last 7 days
    } else if (timeFilter === 'Hari Ini') {
      return result; // All hours/items today
    }
    
    return result.slice(-7); // Default fallback
  }, [displayData, timeFilter]);

  // Top Destinations (Group by KAB/KOTA)
  const topDestinations = useMemo(() => {
    const destCounts: Record<string, { count: number, positif: number, negatif: number, netral: number }> = {};
    displayData.forEach(row => {
      const dests = String(row['KAB/KOTA'] || '').split(',');
      const sentimenRaw = String(row['SENTIMEN'] || '').trim().toLowerCase();
      
      dests.forEach(d => {
        const cleanDest = d.trim();
        if (cleanDest && cleanDest !== 'undefined') {
          if (!destCounts[cleanDest]) {
            destCounts[cleanDest] = { count: 0, positif: 0, negatif: 0, netral: 0 };
          }
          destCounts[cleanDest].count += 1;
          
          if (sentimenRaw === 'positif') destCounts[cleanDest].positif += 1;
          else if (sentimenRaw === 'negatif') destCounts[cleanDest].negatif += 1;
          else destCounts[cleanDest].netral += 1;
        }
      });
    });
    
    const sorted = Object.entries(destCounts)
      .map(([name, stats]) => {
        let dominantSentiment = 'Netral';
        if (stats.positif > stats.negatif && stats.positif >= stats.netral) dominantSentiment = 'Positif';
        else if (stats.negatif > stats.positif && stats.negatif >= stats.netral) dominantSentiment = 'Negatif';
        
        return { 
          name, 
          count: stats.count, 
          trend: 'neutral' as const,
          sentiment: dominantSentiment
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Changed from 5 to 8 to support the report table
      
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

    const destCounts: Record<string, { count: number, positif: number, negatif: number, netral: number }> = {};
    displayData.forEach(row => {
      const dests = String(row['KAB/KOTA'] || '').split(',');
      const sentimenRaw = String(row['SENTIMEN'] || '').trim().toLowerCase();
      
      dests.forEach(d => {
        const cleanDest = d.trim();
        if (cleanDest && cleanDest !== 'undefined') {
          if (!destCounts[cleanDest]) {
            destCounts[cleanDest] = { count: 0, positif: 0, negatif: 0, netral: 0 };
          }
          destCounts[cleanDest].count += 1;
          if (sentimenRaw === 'positif') destCounts[cleanDest].positif += 1;
          else if (sentimenRaw === 'negatif') destCounts[cleanDest].negatif += 1;
          else destCounts[cleanDest].netral += 1;
        }
      });
    });

    return Object.entries(destCounts).map(([name, stats]) => {
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
      
      let dominantSentiment = 'Netral';
      if (stats.positif > stats.negatif && stats.positif >= stats.netral) dominantSentiment = 'Positif';
      else if (stats.negatif > stats.positif && stats.negatif >= stats.netral) dominantSentiment = 'Negatif';
      
      return { 
        name, 
        lat, 
        lng, 
        count: stats.count,
        positif: stats.positif,
        negatif: stats.negatif,
        netral: stats.netral,
        dominantSentiment
      };
    });
  }, [displayData]);

  // Real Recent News
  const recentNews = useMemo(() => {
    return displayData.map((row, i) => {
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
        year: parseIndonesianDate(row['TANGGAL'] || '').getFullYear(),
        pic: String(row['PIC'] || 'Unknown'),
        by: String(row['BY'] || 'Unknown'),
        reach: '-', // No reach data in CSV
        url: urlRaw !== 'undefined' && urlRaw !== '' ? urlRaw : '',
        urlFoto: urlFotoRaw !== 'undefined' && urlFotoRaw !== '' ? urlFotoRaw : '',
        isiBerita: String(row['ISI BERITA'] || ''),
        analisis: String(row['ANALISIS'] || '')
      };
    });
  }, [displayData]);

  const filteredNews = useMemo(() => {
    return recentNews;
  }, [recentNews]);

  // Pagination and Sorting state for Berita Terkini table
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const itemsPerPage = 10;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [regionFilter, timeFilter, searchQuery, sentimentFilter]);

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Calculate sorted and paginated news
  const sortedNews = useMemo(() => {
    let sortableItems = [...filteredNews];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Special handling for dates
        if (sortConfig.key === 'tanggal') {
          aValue = parseIndonesianDate(aValue).getTime();
          bValue = parseIndonesianDate(bValue).getTime();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredNews, sortConfig]);

  const paginatedNews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedNews.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedNews, currentPage]);

  const totalPages = Math.ceil(sortedNews.length / itemsPerPage);

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

  // Top PICs
  const topPICs = useMemo(() => {
    const picCounts: Record<string, number> = {};
    displayData.forEach(row => {
      const pic = String(row['PIC'] || 'Unknown').trim();
      if (pic) {
        picCounts[pic] = (picCounts[pic] || 0) + 1;
      }
    });
    return Object.entries(picCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [displayData]);

  // Top BYs
  const topBYs = useMemo(() => {
    const byCounts: Record<string, number> = {};
    displayData.forEach(row => {
      const by = String(row['BY'] || 'Unknown').trim();
      if (by) {
        byCounts[by] = (byCounts[by] || 0) + 1;
      }
    });
    return Object.entries(byCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
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

  // Scroll to top functionality
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (selectedNews) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans overflow-x-hidden transition-colors duration-300">
        <NewsDetailPage 
          news={selectedNews} 
          onBack={() => setSelectedNews(null)} 
          relatedNews={recentNews} 
          onSelectNews={setSelectedNews} 
        />
        {/* Back to Top Button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg z-50 transition-colors"
              aria-label="Kembali ke atas"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[80px]'}`}>
        {/* Top Navigation / Header */}
        <header className="h-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg lg:hidden"
            >
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                {activeView === 'dashboard' ? 'Dashboard Utama' : 
                 activeView === 'news' ? 'Portal Berita' : 
                 activeView === 'map' ? 'Peta Sebaran' : 
                 activeView === 'insight' ? 'AI Strategic Insight' : 
                 activeView === 'report' ? 'Report Studio' : 'Pengaturan Sistem'}
              </h1>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">
                Media Monitoring News Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden lg:block mr-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDate(currentTime)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{formatTime(currentTime)}</div>
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-100 dark:border-gray-700 shadow-sm"
              title={isDarkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-3 pl-1">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900 dark:text-white leading-none mb-1">Annas Anugrah</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Administrator</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 border-2 border-white dark:border-gray-800">
                AA
              </div>
            </div>
          </div>
        </header>

        {/* Breaking News Ticker */}
        <div className="bg-[#172A68] dark:bg-gray-900 text-white px-4 lg:px-6 py-2 flex items-center text-sm overflow-hidden whitespace-nowrap shrink-0 border-b border-blue-900 dark:border-gray-800 relative z-30">
          <div className="flex items-center gap-2 font-bold text-red-400 mr-6 shrink-0 z-10 bg-[#172A68] dark:bg-gray-900 pr-4 transition-colors">
            <Radio className="w-4 h-4 animate-pulse" />
            BREAKING
          </div>
          <div className="animate-[marquee_60s_linear_infinite] inline-block">
            {recentNews.length > 0 ? (
              recentNews.slice(0, 10).map((news, idx) => (
                <span 
                  key={idx} 
                  className={`mx-4 ${
                    news.sentimen === 'Positif' ? 'text-green-400' : 
                    news.sentimen === 'Negatif' ? 'text-red-400' : 
                    'text-gray-300'
                  }`}
                >
                  {news.judul} •
                </span>
              ))
            ) : (
              <span className="mx-4 text-gray-400">Memuat berita terbaru...</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <main className="p-4 md:p-6 pb-24 md:pb-6 max-w-[1600px] mx-auto space-y-6 relative">
          {/* Top Loading Bar */}
          <AnimatePresence>
            {loading && data.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-0 left-0 right-0 h-1 z-50 overflow-hidden"
              >
                <div className="h-full bg-blue-500 animate-[loading_1.5s_infinite_linear]"></div>
              </motion.div>
            )}
          </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {loading && data.length === 0 ? (
              activeView === 'news' ? <NewsPortalSkeleton /> : <DashboardSkeleton />
            ) : error && data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400 mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Gagal Memuat Data</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md text-center mb-6">
                  Terjadi kesalahan saat mengambil data dari Google Sheets. Silakan periksa koneksi internet Anda atau coba lagi nanti.
                </p>
                <button 
                  onClick={() => fetchData(true)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md active:scale-95"
                >
                  Coba Lagi
                </button>
                <p className="mt-4 text-xs text-red-400 dark:text-red-500 font-mono">{error}</p>
              </div>
            ) : activeView === 'news' ? (
              <NewsPortal 
                newsData={recentNews} 
                onSelectNews={setSelectedNews} 
              />
            ) : activeView === 'map' ? (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Peta Sebaran Berita Jawa Barat</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Analisis intensitas pemberitaan berdasarkan wilayah geografis</p>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rendah</span>
                      <div className="w-8 h-1.5 bg-gradient-to-r from-yellow-400 to-red-600 rounded-full mx-1"></div>
                      <div className="w-3 h-3 rounded-full bg-red-600"></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tinggi</span>
                    </div>
                  </div>
                  <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative z-0">
                    <MapContainer 
                      center={mapCenter}
                      zoom={mapZoom}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <MapZoomer center={mapCenter} zoom={mapZoom} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url={isDarkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                      />
                      {mapData.map((loc, idx) => {
                        const maxCount = Math.max(...mapData.map(d => d.count));
                        const intensity = loc.count / maxCount;
                        const radius = 15 + (intensity * 35);
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
                            eventHandlers={{
                              click: () => {
                                setRegionFilter(loc.name);
                                setMapCenter([loc.lat, loc.lng]);
                                setMapZoom(11);
                              }
                            }}
                          >
                            <LeafletTooltip direction="top" offset={[0, -10]} opacity={1}>
                              <div className="text-center p-1">
                                <div className="font-bold text-gray-800">{loc.name}</div>
                                <div className="text-xs text-blue-600 font-bold">{loc.count.toLocaleString('id-ID')} Berita</div>
                              </div>
                            </LeafletTooltip>
                          </CircleMarker>
                        );
                      })}
                    </MapContainer>
                  </div>
                </div>
              </div>
            ) : activeView === 'insight' ? (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-4 mb-8 border-b border-gray-100 dark:border-gray-700 pb-6">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">AI Strategic Insight</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Analisis narasi dan rekomendasi kebijakan berbasis kecerdasan buatan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
                          <Activity className="w-5 h-5" /> Ringkasan Narasi Utama
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          Berdasarkan data {totalBerita} berita terakhir, narasi pariwisata Jawa Barat didominasi oleh sentimen positif ({pctPos}%) yang dipicu oleh akselerasi promosi destinasi unggulan seperti {topDestinations[0]?.name} dan {topDestinations[1]?.name}. Namun, perlu mitigasi terhadap {pctNeg}% sentimen negatif yang mulai muncul terkait isu infrastruktur aksesibilitas.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wider">Potensi Krisis</h4>
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-bold">Eskalasi Keluhan Infrastruktur</span>
                          </div>
                        </div>
                        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wider">Peluang Viral</h4>
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-bold">Wisata Hidden Gem {topDestinations[2]?.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">Rekomendasi Taktis</h3>
                      <ul className="space-y-4">
                        {[
                          "Akselerasi konten visual di media sosial untuk wilayah " + topDestinations[0]?.name,
                          "Mitigasi narasi negatif terkait kemacetan di jalur wisata utama",
                          "Kolaborasi dengan media " + topMedia.list[0]?.name + " untuk kampanye Jabar Smile",
                          "Optimalisasi promosi paket wisata akhir pekan"
                        ].map((rec, i) => (
                          <li key={i} className="flex gap-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 font-bold">{i+1}</div>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeView === 'report' ? (
              <ReportStudio 
                data={displayData} 
                trendData={trendData} 
                sentimentCounts={sentimentCounts} 
                topMedia={topMedia} 
                recentNews={recentNews}
                topDestinations={topDestinations}
                mapData={mapData}
                timeFilter={timeFilter}
              />
            ) : activeView === 'settings' ? (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8 border-b border-gray-100 dark:border-gray-700 pb-6 flex items-center gap-3">
                    <Settings className="w-6 h-6 text-gray-400" /> Pengaturan Sistem
                  </h2>
                  
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Mode Tampilan</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Sesuaikan tema aplikasi dengan preferensi Anda</p>
                      </div>
                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`w-14 h-8 rounded-full transition-colors relative ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm flex items-center justify-center ${isDarkMode ? 'translate-x-6' : ''}`}>
                          {isDarkMode ? <Moon className="w-3 h-3 text-blue-600" /> : <Sun className="w-3 h-3 text-yellow-500" />}
                        </div>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Sumber Data</h3>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Google Sheets URL</span>
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">Terhubung</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate font-mono">{CSV_URL}</p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-[10px] text-gray-400 text-center uppercase tracking-[0.3em]">
                        Media Monitoring News Online v2.4.0 • 2026
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Filter Bar */}
                <div className="flex flex-col gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex flex-col md:flex-row gap-4 w-full justify-between items-start md:items-center">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              {/* Filter Waktu */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Waktu:</h2>
                </div>
                <div className="flex flex-wrap bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                  {['Hari Ini', '7 Hari', '30 Hari', 'Tahun Ini'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        timeFilter === filter 
                          ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Wilayah:</h2>
                </div>
                <select 
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-48 p-2 transition-colors"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                >
                  <option value="Semua">Semua Wilayah</option>
                  {KAB_KOTA_JABAR.map(kab => (
                    <option key={kab} value={kab}>{kab}</option>
                  ))}
                </select>
              </div>
              
              {/* Reset Filter Button */}
              {(timeFilter !== '7 Hari' || regionFilter !== 'Semua' || searchQuery !== '' || sentimentFilter !== 'Semua') && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-red-100 dark:border-red-900/30"
                >
                  <X className="w-3.5 h-3.5" /> Reset Filter
                </button>
              )}
            </div>
            
            <button
              onClick={() => setActiveView('report')}
              className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full md:w-auto justify-center"
            >
              <FileDown className="w-4 h-4" />
              Generate Laporan
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="flex overflow-x-auto md:grid md:grid-cols-5 gap-4 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-xl transition-colors duration-300 snap-x snap-mandatory hide-scrollbar">
          {/* Total Berita */}
          <div className="min-w-[260px] md:min-w-0 shrink-0 snap-center bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Berita</h3>
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{totalBerita.toLocaleString('id-ID')}</div>
              <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-md flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
              </span>
            </div>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
              Berdasarkan filter saat ini
            </div>
          </div>

          {/* Sentimen Positif */}
          <div className="min-w-[260px] md:min-w-0 shrink-0 snap-center bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sentimen Positif</h3>
              <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Smile className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{sentimentCounts.positif.toLocaleString('id-ID')}</div>
              <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-md flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +5%
              </span>
            </div>
            <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
              <span className="font-medium text-green-600 dark:text-green-400">{pctPos}%</span>
              <span className="ml-1">dari total</span>
            </div>
          </div>

          {/* Sentimen Netral */}
          <div className="min-w-[260px] md:min-w-0 shrink-0 snap-center bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sentimen Netral</h3>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                <Meh className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-3xl font-bold text-yellow-500 dark:text-yellow-400">{sentimentCounts.netral.toLocaleString('id-ID')}</div>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 rounded-md flex items-center">
                <Minus className="w-3 h-3 mr-0.5" /> 0%
              </span>
            </div>
            <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
              <span className="font-medium text-yellow-500 dark:text-yellow-400">{pctNeu}%</span>
              <span className="ml-1">dari total</span>
            </div>
          </div>

          {/* Sentimen Negatif */}
          <div className="min-w-[260px] md:min-w-0 shrink-0 snap-center bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sentimen Negatif</h3>
              <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                <Frown className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-3xl font-bold text-red-500 dark:text-red-400">{sentimentCounts.negatif.toLocaleString('id-ID')}</div>
              <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded-md flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> -2%
              </span>
            </div>
            <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
              <span className="font-medium text-red-500 dark:text-red-400">{pctNeg}%</span>
              <span className="ml-1">dari total</span>
            </div>
          </div>

          {/* Media Terpantau */}
          <div className="min-w-[260px] md:min-w-0 shrink-0 snap-center bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Media Terpantau</h3>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <Globe className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{topMedia.totalUnique.toLocaleString('id-ID')}</div>
              <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-md flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +3
              </span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              <span className="font-medium text-gray-600 dark:text-gray-400">Sumber</span>
              <span className="ml-1">media aktif</span>
            </div>
          </div>
        </div>

        {/* Middle Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tren Berita */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  Tren Berita {timeFilter === '30 Hari' ? '4 Minggu Terakhir' : timeFilter === 'Tahun Ini' ? '12 Bulan Terakhir' : timeFilter}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Volume berita {timeFilter === 'Hari Ini' ? 'per jam' : timeFilter === 'Tahun Ini' ? 'bulanan' : timeFilter === '30 Hari' ? 'mingguan' : 'harian'}</p>
              </div>
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                {timeFilter === 'Hari Ini' ? 'Hari Ini' : timeFilter === '7 Hari' ? '7 Hari Terakhir' : timeFilter === '30 Hari' ? '30 Hari Terakhir' : 'Tahun 2025'}
              </div>
            </div>
            <div className="h-[220px] w-full mt-4 min-w-0 min-h-0">
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: isDarkMode ? '#9CA3AF' : '#9CA3AF'}} dy={10} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1F2937' : '#ffffff', padding: '8px 12px', color: isDarkMode ? '#F9FAFB' : '#374151' }}
                    formatter={(value: number) => [`${value.toLocaleString('id-ID')} Berita`, 'Volume']}
                    labelStyle={{ fontWeight: 'bold', color: isDarkMode ? '#F9FAFB' : '#374151', marginBottom: '4px' }}
                    cursor={{ stroke: isDarkMode ? '#374151' : '#E5E7EB', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribusi Sentimen */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="mb-2">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Distribusi Sentimen</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Keseluruhan periode</p>
            </div>
            <div className="flex flex-col items-center justify-center h-[220px]">
              <div className="w-full h-[140px] relative min-w-0 min-h-0">
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1F2937' : '#ffffff', padding: '8px 12px', color: isDarkMode ? '#F9FAFB' : '#374151' }}
                      formatter={(value: number) => [`${value}%`, 'Persentase']}
                      itemStyle={{ fontWeight: 500, color: isDarkMode ? '#F9FAFB' : '#374151' }}
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
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalBerita}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">berita</span>
                </div>
              </div>
              <div className="w-full space-y-2 mt-2 px-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2"></div><span className="text-gray-600 dark:text-gray-300">Positif</span></div>
                  <span className="font-bold text-green-600 dark:text-green-400">{pctPos}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-2"></div><span className="text-gray-600 dark:text-gray-300">Netral</span></div>
                  <span className="font-bold text-yellow-600 dark:text-yellow-400">{pctNeu}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></div><span className="text-gray-600 dark:text-gray-300">Negatif</span></div>
                  <span className="font-bold text-red-600 dark:text-red-400">{pctNeg}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row: Map & Top Destinations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Peta Sebaran Berita (Heatmap) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2 flex flex-col transition-colors duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Peta Sebaran Berita Jawa Barat
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Intensitas pemberitaan berdasarkan wilayah (Heatmap)</p>
              </div>
            </div>
            <div className="flex-1 min-h-[300px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative z-0">
              <MapContainer 
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <MapZoomer center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url={isDarkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
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
                      eventHandlers={{
                        click: () => {
                          setRegionFilter(loc.name);
                          setMapCenter([loc.lat, loc.lng]);
                          setMapZoom(11);
                        }
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Top 5 Destinasi Terpopuler</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Berdasarkan volume pemberitaan</p>
            </div>
            <div className="space-y-4">
              {topDestinations.map((dest, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center">
                      <span className="text-gray-400 dark:text-gray-500 w-4 text-xs">{idx + 1}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{dest.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{dest.count.toLocaleString('id-ID')} berita</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${idx === 0 ? 'bg-blue-600 dark:bg-blue-500' : idx === 1 ? 'bg-blue-400 dark:bg-blue-400' : idx === 2 ? 'bg-blue-300 dark:bg-blue-300' : idx === 3 ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-red-400 dark:bg-red-500'}`} 
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2 flex flex-col transition-colors duration-300">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Berita Terkini</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monitoring real-time pemberitaan pariwisata</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                  {['Semua', 'Positif', 'Netral', 'Negatif'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setSentimentFilter(tab)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        sentimentFilter === tab 
                          ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari judul, media, atau destinasi..."
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-gray-200"
                  />
                  {localSearchQuery && (
                    <button 
                      onClick={() => setLocalSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Menampilkan <span className="text-blue-600 dark:text-blue-400">{filteredNews.length}</span> dari <span className="text-gray-900 dark:text-gray-100">{recentNews.length}</span> berita
                </div>
              </div>
            </div>
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {[
                      { key: 'judul', label: 'Judul Berita' },
                      { key: 'media', label: 'Media' },
                      { key: 'destinasi', label: 'Destinasi' },
                      { key: 'sentimen', label: 'Sentimen' },
                      { key: 'tanggal', label: 'Tanggal (Tahun)' },
                      { key: 'reach', label: 'Reach', align: 'right' }
                    ].map((col) => (
                      <th 
                        key={col.key} 
                        className={`px-5 py-3 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
                      >
                        <div className="resize-x overflow-hidden min-w-[80px] max-w-[500px] pr-2">
                          <div 
                            className={`flex items-center gap-1 cursor-pointer ${col.align === 'right' ? 'justify-end' : ''}`}
                            onClick={() => handleSort(col.key)}
                          >
                            {col.label}
                            {sortConfig?.key === col.key ? (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {paginatedNews.length > 0 ? (
                    paginatedNews.map((news) => (
                      <tr 
                        key={news.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedNews(news)}
                      >
                        <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200 max-w-[250px] truncate" title={news.judul}>{news.judul}</td>
                        <td className="px-5 py-3 text-gray-500 dark:text-gray-400 max-w-[150px] truncate" title={news.media}>{news.media}</td>
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300 max-w-[150px] truncate" title={news.destinasi}>{news.destinasi}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              news.sentimen === 'Positif' ? 'bg-green-500' :
                              news.sentimen === 'Negatif' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`}></span>
                            <span className={`text-xs font-medium ${
                              news.sentimen === 'Positif' ? 'text-green-600 dark:text-green-400' :
                              news.sentimen === 'Negatif' ? 'text-red-600 dark:text-red-400' :
                              'text-yellow-600 dark:text-yellow-400'
                            }`}>
                              {news.sentimen}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-400 dark:text-gray-500 text-xs">{news.tanggal} {news.year}</td>
                        <td className="px-5 py-3 text-gray-800 dark:text-gray-200 font-medium text-right">{news.reach}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                          <p>Tidak ada berita yang sesuai dengan filter.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View for Berita Terkini */}
            <div className="md:hidden flex flex-col gap-3 p-4">
              {paginatedNews.length > 0 ? (
                paginatedNews.map((news) => (
                  <div 
                    key={news.id} 
                    className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => setSelectedNews(news)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{news.media}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{news.tanggal}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-3 line-clamp-2">{news.judul}</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate max-w-[120px]">
                        <MapPin className="w-3 h-3 shrink-0" /> {news.destinasi.split(',')[0]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          news.sentimen === 'Positif' ? 'bg-green-500' :
                          news.sentimen === 'Negatif' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`}></span>
                        <span className={`text-[10px] font-medium ${
                          news.sentimen === 'Positif' ? 'text-green-600 dark:text-green-400' :
                          news.sentimen === 'Negatif' ? 'text-red-600 dark:text-red-400' :
                          'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {news.sentimen}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                  <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm">Tidak ada berita yang sesuai.</p>
                </div>
              )}
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Menampilkan <span className="font-medium text-gray-900 dark:text-gray-100">{((currentPage - 1) * itemsPerPage) + 1}</span> hingga <span className="font-medium text-gray-900 dark:text-gray-100">{Math.min(currentPage * itemsPerPage, filteredNews.length)}</span> dari <span className="font-medium text-gray-900 dark:text-gray-100">{filteredNews.length}</span> berita
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar (Topik Hangat & Sumber Media) */}
          <div className="space-y-6 flex flex-col">
            {/* Topik Hangat */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-red-500 dark:text-red-400" /> Topik Hangat
              </h2>
              <div className="flex flex-wrap gap-2">
                {topTags.length > 0 ? (
                  topTags.map((tag, idx) => {
                    const colors = [
                      'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                      'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                      'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
                      'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                      'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                      'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
                      'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    ];
                    const colorClass = colors[idx % colors.length];
                    return (
                      <button 
                        key={idx}
                        onClick={() => setSearchQuery(tag.replace('#', ''))}
                        className={`px-3 py-1.5 ${colorClass} text-xs font-medium rounded-full hover:opacity-80 transition-opacity cursor-pointer`}
                      >
                        {tag}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-gray-500">Tidak ada topik hangat</span>
                )}
              </div>
            </div>

            {/* Sumber Media Terbanyak */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-3 transition-colors duration-300">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Sumber Media Terbanyak
              </h2>
              <div className="space-y-3">
                {topMedia.list.map((media, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-32 text-gray-700 dark:text-gray-300 truncate text-xs font-medium">{media.name}</div>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full" style={{ width: `${media.pct}%` }}></div>
                    </div>
                    <div className="w-16 text-right font-bold text-blue-600 dark:text-blue-400 text-xs">{media.count.toLocaleString('id-ID')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PIC & BY Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Top 5 PIC</h2>
                <div className="space-y-3">
                  {topPICs.map((pic, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{pic.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">{pic.count} berita</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Top 5 BY</h2>
                <div className="space-y-3">
                  {topBYs.map((by, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{by.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">{by.count} berita</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      {/* Add custom styles for the marquee animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />

      {/* Back to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-24 md:bottom-6 right-6 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg z-50 transition-colors"
            aria-label="Kembali ke atas"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}

