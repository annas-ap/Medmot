import React, { useEffect } from 'react';
import { ArrowLeft, Calendar, Globe, MapPin, TrendingUp, ExternalLink } from 'lucide-react';

interface NewsDetailPageProps {
  news: any;
  onBack: () => void;
  relatedNews: any[];
  onSelectNews: (news: any) => void;
}

export default function NewsDetailPage({ news, onBack, relatedNews, onSelectNews }: NewsDetailPageProps) {
  // Scroll to top when news changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [news]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-950 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="bg-[#1E3A8A] dark:bg-gray-900 text-white px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-md transition-colors duration-300">
        <button onClick={onBack} className="p-2 hover:bg-white/10 dark:hover:bg-gray-700 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Detail Berita</h1>
      </header>
      
      <main className="p-4 sm:p-6 max-w-[1000px] mx-auto space-y-8">
        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
              news.sentimen === 'Positif' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
              news.sentimen === 'Negatif' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            }`}>
              {news.sentimen}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {news.tanggal}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-gray-100 mb-8 leading-tight tracking-tighter">{news.judul}</h1>
          
          <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden mb-8 relative shadow-inner">
            <img 
              src={news.urlFoto || `https://picsum.photos/seed/${news.id + news.destinasi.replace(/\s+/g, '')}/1200/600`} 
              alt={news.judul}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${news.id + news.destinasi.replace(/\s+/g, '')}/1200/600`;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
              <span className="text-white text-xs font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                {news.urlFoto ? 'Foto Berita' : 'Ilustrasi Berita'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-10 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400"><Globe className="w-6 h-6" /></div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Sumber Media</div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{news.media}</div>
              </div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-gray-200 dark:bg-gray-600"></div>
            <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400"><MapPin className="w-6 h-6" /></div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Destinasi</div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{news.destinasi}</div>
              </div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-gray-200 dark:bg-gray-600"></div>
            <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400"><TrendingUp className="w-6 h-6" /></div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Sentimen</div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{news.sentimen}</div>
              </div>
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-loose space-y-6 text-lg sm:text-xl">
            {news.isiBerita ? (
              <div className="whitespace-pre-wrap">{news.isiBerita}</div>
            ) : (
              <>
                <p><strong>{news.destinasi}</strong> - Berdasarkan pantauan media intelligence, pemberitaan ini menyoroti perkembangan pariwisata di {news.destinasi}. Media <strong>{news.media}</strong> melaporkan topik terkait yang memberikan dampak sentimen <strong>{news.sentimen.toLowerCase()}</strong> terhadap citra pariwisata Jawa Barat.</p>
                <p>Sentimen publik dan interaksi di media sosial menunjukkan tren yang sejalan dengan laporan ini. Hal ini menunjukkan tingginya minat masyarakat terhadap informasi pariwisata di kawasan tersebut.</p>
              </>
            )}
            
            {news.analisis && (
              <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl transition-colors duration-300">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <span className="text-xl">💡</span> Analisis Media Intelligence
                </h3>
                <p className="text-blue-800 dark:text-blue-200 text-sm sm:text-base">{news.analisis}</p>
              </div>
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
            {news.url ? (
              <a 
                href={news.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md inline-flex"
              >
                <ExternalLink className="w-4 h-4" />
                Baca Artikel Asli di {news.media}
              </a>
            ) : (
              <button disabled className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-bold rounded-xl cursor-not-allowed">
                <ExternalLink className="w-4 h-4" />
                Link Artikel Tidak Tersedia
              </button>
            )}
          </div>
        </div>

        {/* Related News Carousel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Berita Terkait</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const container = document.getElementById('related-news-carousel');
                  if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                }}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  const container = document.getElementById('related-news-carousel');
                  if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                }}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
          
          <div 
            id="related-news-carousel"
            className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {relatedNews.filter(n => n.id !== news.id).slice(0, 8).map(related => (
              <div 
                key={related.id} 
                className="group cursor-pointer flex flex-col gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-600 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all hover:-translate-y-1 min-w-[280px] sm:min-w-[320px] snap-start shrink-0" 
                onClick={() => onSelectNews(related)}
              >
                <div className="w-full aspect-video bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden relative">
                  <img 
                    src={related.urlFoto || `https://picsum.photos/seed/${related.id + related.destinasi.replace(/\s+/g, '')}/400/225`} 
                    alt={related.judul} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    referrerPolicy="no-referrer" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${related.id + related.destinasi.replace(/\s+/g, '')}/400/225`;
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md shadow-sm ${
                      related.sentimen === 'Positif' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 
                      related.sentimen === 'Negatif' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 
                      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {related.sentimen}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3"/> {related.media}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {related.tanggal}</span>
                  </div>
                  <h4 
                    className="text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug mb-2"
                    title={related.judul}
                  >
                    {related.judul}
                  </h4>
                </div>
              </div>
            ))}
          </div>
          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>
      </main>
    </div>
  );
}
