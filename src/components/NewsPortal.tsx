import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Calendar, MapPin, TrendingUp, Filter, Clock, ChevronRight, X } from 'lucide-react';

interface NewsItem {
  id: number;
  judul: string;
  media: string;
  destinasi: string;
  sentimen: string;
  tanggal: string;
  url: string;
  urlFoto: string;
  isiBerita: string;
}

interface NewsPortalProps {
  newsData: NewsItem[];
  onSelectNews: (news: NewsItem) => void;
}

export default function NewsPortal({ newsData, onSelectNews }: NewsPortalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('Semua');
  const [visibleCount, setVisibleCount] = useState(14); // 2 top + 12 grid

  // Reset visible count when filters change
  React.useEffect(() => {
    setVisibleCount(14);
  }, [searchQuery, sentimentFilter]);

  // Filter news based on search and sentiment
  const filteredNews = useMemo(() => {
    let filtered = newsData;

    if (sentimentFilter !== 'Semua') {
      filtered = filtered.filter(n => n.sentimen === sentimentFilter);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.judul.toLowerCase().includes(query) || 
        n.media.toLowerCase().includes(query) ||
        n.destinasi.toLowerCase().includes(query) ||
        n.isiBerita.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [newsData, searchQuery, sentimentFilter]);

  // Separate top news (hero section) and the rest
  const topNews = filteredNews.slice(0, 3);
  const gridNews = filteredNews.slice(3, visibleCount);
  const hasMore = visibleCount < filteredNews.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positif': return 'bg-green-100 text-green-700 border-green-200';
      case 'Negatif': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'Positif': return 'bg-green-500';
      case 'Negatif': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* Header & Filters */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-[72px] z-40 transition-all">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4" /> Filter:
            </span>
            {['Semua', 'Positif', 'Netral', 'Negatif'].map(filter => (
              <button
                key={filter}
                onClick={() => setSentimentFilter(filter)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all shrink-0 ${
                  sentimentFilter === filter 
                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          
          <div className="w-full md:w-96 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Cari topik, tokoh, atau wilayah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-full leading-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent sm:text-sm transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredNews.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Tidak ada berita ditemukan</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Coba gunakan kata kunci lain atau ubah filter sentimen.</p>
        </div>
      ) : (
        <>
          {/* Hero Section (Top News) */}
          {topNews.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Hero (Spans 8 cols on large screens) */}
              <div 
                onClick={() => onSelectNews(topNews[0])}
                className="lg:col-span-8 group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer flex flex-col h-[400px] md:h-[500px]"
              >
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-800/90 ${getSentimentColor(topNews[0].sentimen)} border`}>
                    {topNews[0].sentimen}
                  </span>
                  <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {topNews[0].destinasi.split(',')[0]}
                  </span>
                </div>
                
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700">
                  {topNews[0].urlFoto ? (
                    <img 
                      src={topNews[0].urlFoto} 
                      alt={topNews[0].judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${topNews[0].id}/1200/600`;
                      }}
                    />
                  ) : (
                    <img 
                      src={`https://picsum.photos/seed/${topNews[0].id}/1200/600`} 
                      alt="Placeholder"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent"></div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col justify-end z-10">
                  <div className="flex items-center gap-2 text-xs text-gray-300 mb-3">
                    <span className="font-bold text-blue-400 uppercase tracking-wider">{topNews[0].media}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {topNews[0].tanggal}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight group-hover:text-blue-300 transition-colors line-clamp-2 md:line-clamp-3 mb-3 text-shadow-md">
                    {topNews[0].judul}
                  </h2>
                  <p className="text-sm md:text-base text-gray-300 line-clamp-2 leading-relaxed hidden md:block max-w-3xl text-shadow-sm">
                    {topNews[0].isiBerita || "Klik untuk membaca selengkapnya..."}
                  </p>
                </div>
              </div>

              {/* Sub Hero (Spans 4 cols, stacks vertically) */}
              {topNews.length > 1 && (
                <div className="lg:col-span-4 flex flex-col gap-6 h-[400px] md:h-[500px]">
                  {topNews.slice(1, 3).map((news, idx) => (
                    <div 
                      key={`subhero-${news.id}-${idx}`}
                      onClick={() => onSelectNews(news)}
                      className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer flex-1"
                    >
                      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700">
                        {news.urlFoto ? (
                          <img 
                            src={news.urlFoto} 
                            alt={news.judul}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://picsum.photos/seed/${news.id}/600/400`;
                            }}
                          />
                        ) : (
                          <img 
                            src={`https://picsum.photos/seed/${news.id}/600/400`} 
                            alt="Placeholder"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      </div>
                      
                      <div className="absolute top-3 left-3 z-10">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-800/90 ${getSentimentColor(news.sentimen)} border`}>
                          {news.sentimen}
                        </span>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 flex flex-col justify-end z-10">
                        <div className="flex items-center gap-2 text-[10px] text-gray-300 mb-2">
                          <span className="font-bold text-blue-400 uppercase tracking-wider">{news.media}</span>
                          <span>•</span>
                          <span>{news.tanggal}</span>
                        </div>
                        <h2 className="text-sm md:text-base font-bold text-white leading-tight group-hover:text-blue-300 transition-colors line-clamp-3">
                          {news.judul}
                        </h2>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grid Section (Other News) */}
          {gridNews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {gridNews.map((news, idx) => (
                <div 
                  key={`grid-${news.id}-${idx}`}
                  onClick={() => onSelectNews(news)}
                  className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer flex flex-col h-full"
                >
                  <div className="h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
                    <div className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full ${getSentimentBadge(news.sentimen)} opacity-20 group-hover:scale-150 transition-transform duration-500`}></div>
                    {news.urlFoto ? (
                      <img 
                        src={news.urlFoto} 
                        alt={news.judul}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/seed/${news.id}/400/300`;
                        }}
                      />
                    ) : (
                      <img 
                        src={`https://picsum.photos/seed/${news.id}/400/300`} 
                        alt="Placeholder"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-md shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-800/90 ${getSentimentColor(news.sentimen)} border`}>
                        {news.sentimen}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow transition-colors duration-300">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span className="font-bold text-blue-600 dark:text-blue-400 truncate max-w-[120px]">{news.media}</span>
                      <span className="flex items-center gap-1 truncate"><Calendar className="w-3 h-3" /> {news.tanggal.split(',')[0]}</span>
                    </div>
                    
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-3 mb-3">
                      {news.judul}
                    </h3>
                    
                    <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin className="w-3 h-3 shrink-0" /> {news.destinasi.split(',')[0]}
                      </span>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center group-hover:translate-x-1 transition-transform">
                        Baca <ChevronRight className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                className="px-6 py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium rounded-full shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Muat Lebih Banyak
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
