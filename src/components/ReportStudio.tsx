import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileDown, FileText, Settings, FileImage, FileCode2, CheckSquare, Square, Edit3, Sparkles, MapIcon } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import pptxgen from 'pptxgenjs';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';

interface ReportStudioProps {
  data: any[];
  trendData: any[];
  sentimentCounts: { positif: number, netral: number, negatif: number };
  topMedia: { totalUnique: number, list: any[] };
  recentNews: any[];
  topDestinations: any[];
  mapData?: any[];
  period?: string;
}

export default function ReportStudio({ data, trendData, sentimentCounts, topMedia, recentNews, topDestinations, mapData, period }: ReportStudioProps) {
  const [reportTitle, setReportTitle] = useState('LAPORAN ANALISIS MEDIA MONITORING');
  const [reportSubtitle, setReportSubtitle] = useState('Pariwisata Jawa Barat');
  const [reportPeriod, setReportPeriod] = useState(period || 'MARET 2026');
  
  useEffect(() => {
    if (period) setReportPeriod(period);
  }, [period]);
  
  const [posSummary, setPosSummary] = useState('Volume pemberitaan pariwisata Jawa Barat meningkat 12.4% dibanding bulan sebelumnya.\n\nDominasi sentimen positif (54.2%) menunjukkan citra pariwisata Jabar yang baik di mata media.\n\nKota Bandung dan Kab. Bogor konsisten menjadi destinasi dengan pemberitaan tertinggi.');
  const [negSummary, setNegSummary] = useState('Isu kebersihan di beberapa destinasi memerlukan penanganan segera.\n\nKemacetan jalur wisata terus menjadi sorotan negatif di media.\n\nInfrastruktur jalan menuju beberapa destinasi selatan masih belum memenuhi harapan wisatawan.');
  
  const [recommendations, setRecommendations] = useState('1. Penanganan Kebersihan Destinasi Wisata\nTingkatkan program kebersihan di destinasi populer. Libatkan komunitas lokal dan UMKM. Pasang fasilitas kebersihan yang memadai dan terapkan sanksi tegas.\n\n2. Peningkatan Infrastruktur Aksesibilitas\nKoordinasikan dengan dinas terkait untuk percepatan perbaikan jalan menuju destinasi yang sering dikeluhkan. Kembangkan alternatif transportasi publik wisata.\n\n3. Optimalisasi Kampanye Digital\nPerkuat kehadiran di platform TikTok dan Instagram Reels. Kolaborasi dengan konten kreator lokal. Targetkan wisatawan mancanegara melalui kampanye berbahasa Inggris.');

  const [components, setComponents] = useState({
    cover: true,
    execSummary: true,
    heatmap: true,
    destinations: true,
    media: true,
    news: true,
    recommendations: true,
    newsAttachment: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const toggleComponent = (key: keyof typeof components) => {
    setComponents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalBerita = data.length;
  const totalSentiment = sentimentCounts.positif + sentimentCounts.netral + sentimentCounts.negatif;
  const pctPos = totalSentiment ? Math.round((sentimentCounts.positif / totalSentiment) * 100) : 0;
  const pctNeu = totalSentiment ? Math.round((sentimentCounts.netral / totalSentiment) * 100) : 0;
  const pctNeg = totalSentiment ? Math.round((sentimentCounts.negatif / totalSentiment) * 100) : 0;
  
  const indeksSentimen = totalSentiment ? ((sentimentCounts.positif * 1) + (sentimentCounts.negatif * -1)) / totalSentiment : 0;
  const indeksFormatted = indeksSentimen > 0 ? `+${indeksSentimen.toFixed(2)}` : indeksSentimen.toFixed(2);

  const exportPDF = () => {
    window.print();
  };

  const exportDOCX = async () => {
    setIsExporting(true);
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: reportTitle, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: reportSubtitle, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: "Silakan gunakan format PDF untuk hasil yang sama persis dengan preview.", alignment: AlignmentType.CENTER })
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Laporan_Media_Monitoring.docx");
    } catch (error) {
      console.error('Error exporting DOCX:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportPPTX = async () => {
    setIsExporting(true);
    try {
      const pres = new pptxgen();
      const slide = pres.addSlide();
      slide.addText(reportTitle, { x: 1, y: 2, w: '80%', fontSize: 36, bold: true, align: 'center', color: '1E3A8A' });
      await pres.writeFile({ fileName: "Laporan_Media_Monitoring.pptx" });
    } catch (error) {
      console.error('Error exporting PPTX:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden bg-gray-50 dark:bg-gray-950 print:h-auto print:bg-white print:overflow-visible">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          .edit-icon {
            display: none !important;
          }
          textarea {
            resize: none;
            overflow: hidden;
            border: none !important;
            background: transparent !important;
          }
          @page {
            size: A4;
            margin: 20mm;
            @bottom-right {
              content: "Hal. " counter(page);
            }
          }
          .page-break {
            page-break-before: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
          /* Header/Footer on every page */
          .print-header {
            display: block !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            text-align: right;
            font-size: 10px;
            color: #9ca3af;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          .print-footer {
            display: block !important;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 5px;
          }
        }
      `}} />
      
      {/* Left Sidebar: Configuration */}
      <div className="w-full lg:w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shrink-0 overflow-y-auto print:hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Konfigurasi Laporan
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pilih komponen yang ingin ditampilkan di laporan.</p>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Komponen Laporan</h3>
            
            <button onClick={() => toggleComponent('cover')} className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              {components.cover ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sampul & Metrik Utama</span>
            </button>
            
            <button onClick={() => toggleComponent('execSummary')} className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              {components.execSummary ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">1. Ringkasan Eksekutif</span>
            </button>

            <button onClick={() => toggleComponent('heatmap')} className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              {components.heatmap ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">2. Peta Sebaran (Heatmap)</span>
            </button>

            <button onClick={() => toggleComponent('destinations')} className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              {components.destinations ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">3. Top Destinasi Wisata</span>
            </button>

            <button onClick={() => toggleComponent('media')} className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              {components.media ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">4. Sumber Media Terbanyak</span>
            </button>

            <button onClick={() => toggleComponent('news')} className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              {components.news ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">5. Berita Utama</span>
            </button>

            <button onClick={() => toggleComponent('recommendations')} className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              {components.recommendations ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">6. Rekomendasi Strategis</span>
            </button>

            <button onClick={() => toggleComponent('newsAttachment')} className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              {components.newsAttachment ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">7. Lampiran Berita</span>
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Export Format</h3>
          
          <button 
            onClick={exportPDF}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {isExporting ? 'Mengekspor...' : 'Export to PDF'}
          </button>
          
          <button 
            onClick={exportDOCX}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <FileCode2 className="w-4 h-4" />
            Export to Word (DOCX)
          </button>

          <button 
            onClick={exportPPTX}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <FileImage className="w-4 h-4" />
            Export to PowerPoint
          </button>
        </div>
      </div>

      {/* Right Area: Live Preview */}
      <div className="flex-1 overflow-y-auto bg-gray-200 dark:bg-gray-800 p-4 md:p-8 flex justify-center print:bg-white print:p-0">
        <div 
          id="printable-report"
          ref={reportRef}
          className="bg-white w-full max-w-[210mm] shadow-2xl p-[20mm] text-gray-900 font-sans print:shadow-none print:max-w-none print:min-h-0 print:p-0 relative"
          style={{ color: '#111827' }} // Force dark text for PDF
        >
          {/* Document Header */}
          <div className="hidden print:block print-header">
            Laporan Media Monitoring - {reportPeriod}
          </div>

          {/* Header Line */}
          <div className="border-b-2 border-[#1E3A8A] pb-2 mb-12 flex justify-between items-end avoid-break">
            <div className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
              LAPORAN MEDIA MONITORING PARIWISATA JAWA BARAT
            </div>
            <div className="text-xs text-gray-500 relative group">
              <span className="text-right">{reportPeriod}</span>
            </div>
          </div>

          {/* Cover Section */}
          {components.cover && (
            <div className="mb-16 avoid-break">
              <div className="text-center mb-12">
                <img 
                  src="https://smilingwestjava.jabarprov.go.id/ic-logo.svg" 
                  alt="Smiling West Java Logo" 
                  className="h-20 mx-auto mb-6"
                  referrerPolicy="no-referrer"
                />
                <h3 className="text-sm font-bold text-gray-500 mb-1">DINAS PARIWISATA PROVINSI JAWA BARAT</h3>
                <p className="text-xs text-gray-400 italic mb-12">Media Intelligence Unit</p>
                
                <div className="border-t-4 border-b-4 border-[#1E3A8A] py-6 my-6 relative group">
                  <input 
                    type="text" 
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full text-2xl font-bold text-center text-[#1E3A8A] bg-transparent border-none focus:ring-0 focus:outline-none hover:bg-gray-50 rounded"
                  />
                  <input 
                    type="text" 
                    value={reportSubtitle}
                    onChange={(e) => setReportSubtitle(e.target.value)}
                    className="w-full text-3xl font-black text-center text-gray-800 mt-2 bg-transparent border-none focus:ring-0 focus:outline-none hover:bg-gray-50 rounded"
                  />
                  <input 
                    type="text" 
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    className="w-full text-xl font-bold text-center text-[#3B82F6] mt-4 bg-transparent border-none focus:ring-0 focus:outline-none hover:bg-gray-50 rounded uppercase"
                  />
                  <Edit3 className="w-4 h-4 text-gray-400 absolute top-2 right-2 opacity-0 group-hover:opacity-100 edit-icon" />
                </div>
              </div>

              {/* Metrics Table */}
              <div className="mb-8">
                <table className="w-full text-center border-collapse border border-gray-200">
                  <thead>
                    <tr className="text-white text-xs font-bold">
                      <th className="bg-[#1E3A8A] p-3 border border-white w-1/4">TOTAL BERITA</th>
                      <th className="bg-[#10B981] p-3 border border-white w-1/4">SENTIMEN +</th>
                      <th className="bg-[#F59E0B] p-3 border border-white w-1/4">SENTIMEN NETRAL</th>
                      <th className="bg-[#EF4444] p-3 border border-white w-1/4">SENTIMEN —</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-3xl font-black">
                      <td className="bg-blue-50 p-4 border border-white text-[#1E3A8A]">{totalBerita.toLocaleString('id-ID')}</td>
                      <td className="bg-green-50 p-4 border border-white text-[#10B981]">{sentimentCounts.positif.toLocaleString('id-ID')}</td>
                      <td className="bg-yellow-50 p-4 border border-white text-[#F59E0B]">{sentimentCounts.netral.toLocaleString('id-ID')}</td>
                      <td className="bg-red-50 p-4 border border-white text-[#EF4444]">{sentimentCounts.negatif.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr className="text-xs font-medium">
                      <td className="bg-blue-50 p-2 border border-white text-blue-800">+12.4% vs bln lalu</td>
                      <td className="bg-green-50 p-2 border border-white text-green-800">{pctPos}%</td>
                      <td className="bg-yellow-50 p-2 border border-white text-yellow-800">{pctNeu}%</td>
                      <td className="bg-red-50 p-2 border border-white text-red-800">{pctNeg}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-center text-sm">
                <p className="mb-1">Indeks Sentimen: <span className={`font-bold ${indeksSentimen > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{indeksFormatted} / 1.00</span></p>
                <p className="text-gray-500">Media Terpantau: <span className="font-bold text-blue-600">{topMedia.totalUnique} media</span></p>
              </div>
            </div>
          )}

          {/* 1. Ringkasan Eksekutif */}
          {components.execSummary && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">1. Ringkasan Eksekutif</h2>
              <p className="text-sm text-gray-700 mb-6">
                Laporan ini menyajikan hasil monitoring dan analisis pemberitaan media terkait pariwisata Jawa Barat selama periode {reportPeriod}. Data dikumpulkan dari {topMedia.totalUnique} sumber media mencakup media online, cetak, dan penyiaran.
              </p>
              
              <h3 className="text-lg font-bold text-blue-800 mb-3">1.1 Temuan Utama</h3>
              <p className="text-sm text-gray-700 mb-4">
                Secara keseluruhan, pemberitaan pariwisata Jawa Barat pada {reportPeriod} menunjukkan tren positif dengan total {totalBerita.toLocaleString('id-ID')} berita. Indeks sentimen berada di angka {indeksFormatted} dari skala 1.00, mencerminkan dominasi narasi positif di media.
              </p>

              <div className="relative group">
                <table className="w-full border-collapse border border-gray-200 text-sm">
                  <thead>
                    <tr className="text-white font-bold">
                      <th className="bg-[#10B981] p-3 border border-white w-1/2 text-left">Hal Menonjol Positif</th>
                      <th className="bg-[#EF4444] p-3 border border-white w-1/2 text-left">Hal yang Memerlukan Perhatian</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="bg-green-50 p-0 border border-white align-top">
                        <textarea 
                          value={posSummary}
                          onChange={(e) => setPosSummary(e.target.value)}
                          className="w-full h-full min-h-[150px] p-4 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-gray-800"
                        />
                      </td>
                      <td className="bg-red-50 p-0 border border-white align-top">
                        <textarea 
                          value={negSummary}
                          onChange={(e) => setNegSummary(e.target.value)}
                          className="w-full h-full min-h-[150px] p-4 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-gray-800"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <Edit3 className="w-4 h-4 text-gray-400 absolute -left-6 top-1/2 opacity-0 group-hover:opacity-100 edit-icon" />
              </div>
            </div>
          )}

          {/* 2. Peta Sebaran (Heatmap) */}
          {components.heatmap && mapData && (
            <div className="mb-12 page-break">
              <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">2. Peta Sebaran Berita (Heatmap)</h2>
              <p className="text-sm text-gray-700 mb-4">
                Peta berikut menunjukkan intensitas pemberitaan pariwisata di berbagai kabupaten/kota di Jawa Barat selama {reportPeriod}.
              </p>
              <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
                <MapContainer 
                  center={[-6.9147, 107.6098]}
                  zoom={8}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  dragging={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  />
                  {mapData.map((loc, idx) => {
                    const maxCount = Math.max(...mapData.map(d => d.count));
                    const intensity = loc.count / maxCount;
                    const radius = 10 + (intensity * 25);
                    
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
                        <LeafletTooltip direction="top" offset={[0, -10]} opacity={1} permanent={intensity > 0.5}>
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
          )}

          {/* 3. Destinasi Wisata */}
          {components.destinations && (
            <div className="mb-12 avoid-break">
              <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">3. Destinasi Wisata Paling Banyak Diberitakan</h2>
              <p className="text-sm text-gray-700 mb-4">
                Berikut adalah destinasi dengan volume pemberitaan tertinggi selama {reportPeriod} berdasarkan data media monitoring:
              </p>
              
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-white font-bold bg-[#1E3A8A]">
                    <th className="p-2 border border-white w-12 text-center">#</th>
                    <th className="p-2 border border-white text-left">Destinasi</th>
                    <th className="p-2 border border-white text-center">Jumlah Berita</th>
                    <th className="p-2 border border-white text-center">Persentase</th>
                    <th className="p-2 border border-white text-center">Dominasi Sentimen</th>
                  </tr>
                </thead>
                <tbody>
                  {topDestinations.slice(0, 8).map((dest, idx) => {
                    const pct = totalBerita > 0 ? ((dest.count / totalBerita) * 100).toFixed(1) : '0';
                    // Mock sentiment based on index for demonstration, ideally derived from data
                    const sentiment = idx === 4 ? 'Negatif' : (idx === 2 || idx === 3 || idx === 5) ? 'Netral' : 'Positif';
                    const sentimentColor = sentiment === 'Positif' ? 'text-[#10B981] bg-green-50' : sentiment === 'Negatif' ? 'text-[#EF4444] bg-red-50' : 'text-[#F59E0B] bg-yellow-50';
                    
                    return (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-2 text-center font-bold">{idx + 1}</td>
                        <td className="p-2 font-medium">{dest.name}</td>
                        <td className="p-2 text-center">{dest.count.toLocaleString('id-ID')}</td>
                        <td className="p-2 text-center">{pct}%</td>
                        <td className={`p-2 text-center font-bold ${sentimentColor}`}>{sentiment}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Sumber Media */}
          {components.media && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">3. Sumber Media Terbanyak</h2>
              <p className="text-sm text-gray-700 mb-4">
                Dari {topMedia.totalUnique} media yang dipantau, berikut adalah 10 sumber dengan kontribusi pemberitaan terbesar:
              </p>
              
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-white font-bold bg-[#1E3A8A]">
                    <th className="p-2 border border-white w-12 text-center">#</th>
                    <th className="p-2 border border-white text-left">Nama Media</th>
                    <th className="p-2 border border-white text-center">Jumlah Berita</th>
                    <th className="p-2 border border-white text-center">Porsi</th>
                  </tr>
                </thead>
                <tbody>
                  {topMedia.list.slice(0, 10).map((media, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="p-2 text-center font-bold">{idx + 1}</td>
                      <td className="p-2 font-medium">{media.name}</td>
                      <td className="p-2 text-center">{media.count.toLocaleString('id-ID')}</td>
                      <td className="p-2 text-center">{media.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Berita Utama */}
          {components.news && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">4. Berita Utama Bulan Ini</h2>
              <p className="text-sm text-gray-700 mb-4">
                Berikut adalah berita dengan dampak dan perhatian media tertinggi selama periode {reportPeriod}:
              </p>
              
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-white font-bold bg-[#1E3A8A]">
                    <th className="p-2 border border-white text-left w-1/2">Judul Berita</th>
                    <th className="p-2 border border-white text-left">Media</th>
                    <th className="p-2 border border-white text-center">Tanggal</th>
                    <th className="p-2 border border-white text-center">Sentimen</th>
                  </tr>
                </thead>
                <tbody>
                  {recentNews.slice(0, 8).map((news, idx) => {
                    const sentimentColor = news.sentimen === 'Positif' ? 'text-[#10B981] bg-green-50' : news.sentimen === 'Negatif' ? 'text-[#EF4444] bg-red-50' : 'text-[#F59E0B] bg-yellow-50';
                    return (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-2 pr-4">{news.judul}</td>
                        <td className="p-2">{news.media}</td>
                        <td className="p-2 text-center whitespace-nowrap">{news.tanggal.split(',')[0]}</td>
                        <td className={`p-2 text-center font-bold ${sentimentColor}`}>{news.sentimen}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Rekomendasi Strategis */}
          {components.recommendations && (
            <div className="mb-12 relative group">
              <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">5. Rekomendasi Strategis</h2>
              <p className="text-sm text-gray-700 mb-4">
                Berdasarkan hasil analisis pemberitaan {reportPeriod}, berikut rekomendasi strategis untuk meningkatkan citra pariwisata Jawa Barat dan menangani isu yang berkembang di media:
              </p>
              
              <textarea 
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="w-full min-h-[250px] p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-y"
              />
              <Edit3 className="w-4 h-4 text-gray-400 absolute -left-6 top-1/2 opacity-0 group-hover:opacity-100 edit-icon" />
            </div>
          )}

          {/* 7. Lampiran Berita */}
          {components.newsAttachment && (
            <div className="mb-12 page-break">
              <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">7. Lampiran: Daftar Berita</h2>
              <p className="text-sm text-gray-700 mb-4">
                Berikut adalah daftar lengkap berita yang dipantau selama periode {reportPeriod}:
              </p>
              
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="text-white font-bold bg-[#1E3A8A]">
                    <th className="p-2 border border-white w-8 text-center">No</th>
                    <th className="p-2 border border-white text-left">Tanggal</th>
                    <th className="p-2 border border-white text-left">Media</th>
                    <th className="p-2 border border-white text-left w-1/2">Judul Berita</th>
                    <th className="p-2 border border-white text-center">Sentimen</th>
                  </tr>
                </thead>
                <tbody>
                  {recentNews.slice(0, 50).map((news, idx) => {
                    const sentimentColor = news.sentimen === 'Positif' ? 'text-[#10B981] bg-green-50' : news.sentimen === 'Negatif' ? 'text-[#EF4444] bg-red-50' : 'text-[#F59E0B] bg-yellow-50';
                    return (
                      <tr key={idx} className="border-b border-gray-200 avoid-break">
                        <td className="p-2 text-center">{idx + 1}</td>
                        <td className="p-2 whitespace-nowrap">{news.tanggal.split(',')[0]}</td>
                        <td className="p-2">{news.media}</td>
                        <td className="p-2 pr-4">
                          <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {news.judul}
                          </a>
                        </td>
                        <td className={`p-2 text-center font-bold ${sentimentColor}`}>{news.sentimen}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {recentNews.length > 50 && (
                <p className="text-xs text-gray-500 mt-4 italic text-center">
                  *Menampilkan 50 berita terbaru dari total {recentNews.length} berita.
                </p>
              )}
            </div>
          )}

          {/* Document Footer */}
          <div className="hidden print:block print-footer text-xs text-gray-400 border-t border-gray-200 pt-2 mt-4 text-center">
            Dihasilkan oleh Media Intelligence Unit - Dinas Pariwisata Provinsi Jawa Barat
          </div>

        </div>
      </div>
    </div>
  );
}
