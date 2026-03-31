import React, { useState, useRef } from 'react';
import { X, FileDown, Loader2, Calendar, CheckSquare, Square, Activity, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image';
import Markdown from 'react-markdown';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { MapContainer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const AVAILABLE_COLUMNS = [
  { id: 'TANGGAL', label: 'Tanggal' },
  { id: 'NAMA MEDIA', label: 'Media' },
  { id: 'JUDUL', label: 'Judul Berita' },
  { id: 'KAB/KOTA', label: 'Destinasi/Wilayah' },
  { id: 'SENTIMEN', label: 'Sentimen' },
];

const COLORS = {
  positive: '#10B981', // emerald-500
  neutral: '#F59E0B',  // amber-500
  negative: '#EF4444', // red-500
};

interface ReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  parseDate: (dateStr: string) => Date;
}

export default function ReportGenerator({ isOpen, onClose, data, parseDate }: ReportGeneratorProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [geoJson, setGeoJson] = useState<any>(null);
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch GeoJSON for West Java
  React.useEffect(() => {
    const fetchGeoJson = async () => {
      if (!isOpen || geoJson) return;
      
      const sources = [
        'https://cdn.jsdelivr.net/gh/m-fathur/geojson-indonesia@master/provinsi/jawa_barat.json',
        'https://raw.githubusercontent.com/m-fathur/geojson-indonesia/master/provinsi/jawa_barat.json',
        'https://gist.githubusercontent.com/joshuajonathan/8813783/raw/c686f483579465c075e177ad08d849f309d1d994/jawa_barat_kab.json'
      ];

      for (const source of sources) {
        try {
          const res = await fetch(source);
          if (!res.ok) continue;
          const data = await res.json();
          setGeoJson(data);
          console.log('GeoJSON loaded successfully from:', source);
          return;
        } catch (err) {
          console.error(`Failed to fetch from ${source}:`, err);
        }
      }
    };

    fetchGeoJson();
  }, [isOpen, geoJson]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setStep('form');
      setReportData(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setIsGenerating(false);
      setSelectedColumns([]);
    }
  }, [isOpen]);

  // Cleanup PDF URL
  React.useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  if (!isOpen) return null;

  const toggleColumn = (colId: string) => {
    setSelectedColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      alert('Silakan pilih rentang tanggal terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    setProgressText('Menyiapkan Data...');

    // Ensure GeoJSON is loaded before proceeding
    if (!geoJson) {
      setProgressText('Menunggu Data Peta West Java...');
      // Wait up to 5 seconds for geoJson
      for (let i = 0; i < 10; i++) {
        if (geoJson) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setProgressText('Memfilter data...');

    try {
      // 1. Filter Data
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const filteredData = data.filter(row => {
        const rowDate = parseDate(row['TANGGAL'] || '');
        return rowDate >= start && rowDate <= end;
      });

      if (filteredData.length === 0) {
        alert('Tidak ada data berita pada rentang tanggal tersebut.');
        setIsGenerating(false);
        return;
      }

      // Calculate Stats
      let positif = 0, netral = 0, negatif = 0;
      const destCounts: Record<string, number> = {};
      const mediaCounts: Record<string, number> = {};

      filteredData.forEach(row => {
        const sentimen = String(row['SENTIMEN'] || '').toLowerCase().trim();
        if (sentimen === 'positif') positif++;
        else if (sentimen === 'negatif') negatif++;
        else netral++;

        const dests = String(row['KAB/KOTA'] || '').split(',');
        dests.forEach(d => {
          const cleanDest = d.trim();
          if (cleanDest && cleanDest !== 'undefined') {
            destCounts[cleanDest] = (destCounts[cleanDest] || 0) + 1;
          }
        });

        const media = String(row['NAMA MEDIA'] || '').trim();
        if (media && media !== 'undefined') {
          mediaCounts[media] = (mediaCounts[media] || 0) + 1;
        }
      });

      const topDestinations = Object.entries(destCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const topMedia = Object.entries(mediaCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const allRegions = Object.entries(destCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

      // 2. Call AI for Analysis and Recommendations
      setProgressText('Menyusun analisis dengan AI...');
      
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY tidak ditemukan di environment.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Anda adalah seorang Analis Intelijen Media Senior yang bekerja untuk Dinas Pariwisata dan Kebudayaan Provinsi Jawa Barat. 
        Tugas Anda adalah menyusun "Laporan Analisis Strategis Media Intelligence" yang akan dipresentasikan kepada pimpinan tinggi (Kepala Dinas).
        
        Gunakan data pemberitaan berikut sebagai basis analisis utama:
        - Periode Laporan: ${startDate} s/d ${endDate}
        - Total Volume Pemberitaan: ${filteredData.length} berita
        - Profil Sentimen: Positif (${positif}), Netral (${netral}), Negatif (${negatif})
        - Destinasi Unggulan (Top 5): ${topDestinations.map(d => `${d.name} (${d.count})`).join(', ')}
        - Media Utama: ${topMedia.map(m => `${m.name} (${m.count})`).join(', ')}
        
        Instruksi Penulisan Laporan:
        1. Gunakan Bahasa Indonesia yang sangat formal, profesional, teknis, dan berwibawa (Bahasa Indonesia Ragam Resmi Pemerintahan).
        2. Hindari penggunaan kata-kata santai atau populer yang tidak perlu. Gunakan terminologi strategis seperti "signifikansi", "eskalasi narasi", "mitigasi reputasi", "akselerasi kunjungan", "stakeholder", "reputasi institusional".
        3. Struktur laporan harus mencakup:
           ### I. RINGKASAN EKSEKUTIF
           Berikan gambaran umum performa media selama periode ini. Apakah trennya positif atau memerlukan perhatian khusus? Gunakan kalimat yang padat dan informatif.
           
           ### II. ANALISIS SENTIMEN DAN REPUTASI DIGITAL
           Bedah makna di balik angka sentimen. Apa faktor pendorong sentimen positif? Jika ada sentimen negatif, apa akar permasalahannya secara naratif dan bagaimana dampaknya terhadap citra pariwisata?
           
           ### III. DINAMIKA DESTINASI DAN GEOGRAFIS
           Analisis mengapa destinasi tertentu mendominasi pembicaraan. Hubungkan dengan tren pariwisata terkini di Jawa Barat dan efektivitas promosi di wilayah tersebut.
           
           ### IV. REKOMENDASI STRATEGIS DAN TINDAK LANJUT
           Berikan minimal 4 rekomendasi konkret yang bersifat manajerial, strategis, dan taktis untuk meningkatkan citra pariwisata Jawa Barat. Gunakan format poin-poin profesional.
        
        Pastikan analisis Anda mendalam, objektif, dan memberikan nilai tambah strategis bagi pengambil keputusan.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const aiContent = response.text || 'Gagal menghasilkan analisis.';

      const newReportData = {
        startDate,
        endDate,
        total: filteredData.length,
        positif,
        netral,
        negatif,
        topDestinations,
        topMedia,
        allRegions,
        aiContent,
        selectedColumns,
        tableData: filteredData
      };

      // Set data for rendering
      setReportData(newReportData);
      
      // Move to a temporary state to allow hidden template to render
      setProgressText('Menyiapkan pratinjau PDF...');
      
      // Wait for the hidden template to render its charts
      setTimeout(async () => {
        try {
          const pdf = await generatePDFDocument(newReportData);
          const blob = pdf.output('blob');
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          setStep('review');
          setIsGenerating(false);
        } catch (err: any) {
          console.error('Preview generation failed:', err);
          // Fallback to HTML preview if PDF fails
          setStep('review');
          setIsGenerating(false);
        }
      }, 2000); // 2 seconds to ensure all charts and AI content are rendered

    } catch (error: any) {
      console.error('Error:', error);
      alert(`Terjadi kesalahan saat memproses laporan: ${error?.message || String(error)}`);
      setIsGenerating(false);
    }
  };

  const generatePDFDocument = async (data: any) => {
    if (!reportRef.current) throw new Error('Report template not found');

    // Small delay to ensure map and charts are fully rendered in the hidden template
    // Increased delay for map tiles to load
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Capture the visual summary (Header, Stats, Charts, Map)
    const visualsElement = reportRef.current.querySelector('#report-visuals') as HTMLElement;
    if (!visualsElement) throw new Error('Visuals section not found');

    const visualsImg = await htmlToImage.toJpeg(visualsElement, { 
      pixelRatio: 1.2,
      quality: 0.75,
      backgroundColor: '#ffffff',
    });
    
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pdfWidth - (margin * 2);
    
    // Page 1: Visual Summary
    const imgProps = pdf.getImageProperties(visualsImg);
    const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
    
    pdf.addImage(visualsImg, 'JPEG', margin, margin, contentWidth, imgHeight, undefined, 'FAST');
    
    // Page 2: Strategic Analysis (Searchable Text / OCR)
    pdf.addPage();
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 58, 138); // blue-900
    pdf.text('Analisis Strategis & Rekomendasi', margin, 25);
    
    pdf.setDrawColor(30, 58, 138);
    pdf.setLineWidth(1);
    pdf.line(margin, 30, margin + 100, 30);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85); // slate-700
    
    // Clean markdown for PDF text
    const cleanText = data.aiContent
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/### (.*)/g, '$1')     // Clean H3
      .replace(/## (.*)/g, '$1')      // Clean H2
      .replace(/# (.*)/g, '$1')       // Clean H1
      .replace(/\* (.*)/g, '• $1')    // Convert bullets
      .replace(/\n\n/g, '\n')         // Reduce double newlines
      .trim();
      
    const splitText = pdf.splitTextToSize(cleanText, contentWidth);
    let yPos = 40;
    
    // Handle multi-page text for analysis
    for (let i = 0; i < splitText.length; i++) {
      if (yPos > pageHeight - 20) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(splitText[i], margin, yPos);
      yPos += 6;
    }
    
    // Page 3+: Data Appendix (Searchable Table)
    if (data.selectedColumns && data.selectedColumns.length > 0) {
      pdf.addPage();
      
      const tableColumn = AVAILABLE_COLUMNS.filter(c => data.selectedColumns.includes(c.id)).map(c => c.label);
      const tableRows = data.tableData.map((row: any) => {
        return data.selectedColumns.map((colId: string) => {
          let val = String(row[colId] || '-');
          if (colId === 'KAB/KOTA') {
            val = val.replace(/,/g, ', ');
          }
          return val;
        });
      });
      
      const columnStyles: any = {};
      data.selectedColumns.forEach((colId: string, index: number) => {
        if (colId === 'TANGGAL') columnStyles[index] = { cellWidth: 22 };
        if (colId === 'NAMA MEDIA') columnStyles[index] = { cellWidth: 30 };
        if (colId === 'JUDUL') columnStyles[index] = { cellWidth: 'auto' };
        if (colId === 'KAB/KOTA') columnStyles[index] = { cellWidth: 35 };
        if (colId === 'SENTIMEN') columnStyles[index] = { cellWidth: 20 };
      });
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text('Lampiran: Rincian Data Berita', margin, 20);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Periode: ${data.startDate} s/d ${data.endDate}`, margin, 26);
      
      autoTable(pdf, {
        head: [tableColumn],
        body: tableRows,
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', overflow: 'linebreak' },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 20, left: margin, right: margin },
        columnStyles: columnStyles,
      });
    }

    return pdf;
  };

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    
    setIsGenerating(true);
    setProgressText('Mengunduh PDF...');
    
    try {
      const pdf = await generatePDFDocument(reportData);
      pdf.save(`Laporan_Media_Intelijen_${reportData.startDate}_${reportData.endDate}.pdf`);
      setIsGenerating(false);
      onClose();
    } catch (err: any) {
      console.error('Error downloading PDF:', err);
      alert(`Terjadi kesalahan saat mengunduh PDF: ${err?.message || String(err)}`);
      setIsGenerating(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const getRegionColor = (count: number, maxCount: number) => {
    if (count === 0) return '#F3F4F6'; // gray-100
    const intensity = 0.3 + (count / maxCount) * 0.7;
    return `rgba(30, 58, 138, ${intensity})`;
  };

  const normalizeRegionName = (name: string) => {
    return name.toLowerCase()
      .replace('kabupaten', 'kab.')
      .replace('kota', 'kota')
      .replace('kab.', '')
      .replace('kota', '')
      .trim();
  };

  const renderReportContent = () => (
    <div className="bg-white p-12 text-gray-800 font-sans" style={{ width: '1024px' }}>
      <div id="report-visuals">
        {/* Header */}
        <div className="flex justify-between items-center border-b-8 border-blue-900 pb-8 mb-12">
        <div className="flex items-center gap-6">
          <div className="bg-blue-900 p-4 rounded-2xl shadow-lg">
            <Activity className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black text-blue-900 tracking-tighter mb-1 uppercase">Media Intelligence</h1>
            <h2 className="text-2xl font-bold text-blue-700/70 uppercase tracking-widest">Dinas Pariwisata Jawa Barat</h2>
          </div>
        </div>
        <div className="text-right bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Periode Laporan</p>
          <p className="text-xl font-black text-gray-900">
            {reportData.startDate} <span className="text-gray-300 font-light mx-2">|</span> {reportData.endDate}
          </p>
        </div>
      </div>

      {/* Executive Summary Stats */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-8 rounded-3xl border-2 border-blue-50 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <BarChart2 className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Berita</p>
          <p className="text-4xl font-black text-blue-900">{reportData.total}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border-2 border-emerald-50 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
            <PieChartIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Positif</p>
          <p className="text-4xl font-black text-emerald-600">{reportData.positif}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border-2 border-amber-50 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
            <PieChartIcon className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Netral</p>
          <p className="text-4xl font-black text-amber-600">{reportData.netral}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border-2 border-red-50 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <PieChartIcon className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Negatif</p>
          <p className="text-4xl font-black text-red-600">{reportData.negatif}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-10 mb-12">
        {/* Sentiment Chart */}
        <div className="bg-white rounded-3xl p-8 border-2 border-gray-50 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-8 text-center uppercase tracking-widest border-b-2 border-gray-50 pb-6">Distribusi Sentimen</h3>
          <div className="h-[320px] w-full flex items-center justify-center relative">
            <PieChart width={400} height={320}>
              <Pie
                data={[
                  { name: 'Positif', value: reportData.positif, color: COLORS.positive },
                  { name: 'Netral', value: reportData.netral, color: COLORS.neutral },
                  { name: 'Negatif', value: reportData.negatif, color: COLORS.negative }
                ]}
                cx="50%" cy="50%" innerRadius={80} outerRadius={110}
                paddingAngle={5} dataKey="value" stroke="none"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                isAnimationActive={!isGenerating}
              >
                {([
                  { name: 'Positif', value: reportData.positif, color: COLORS.positive },
                  { name: 'Netral', value: reportData.netral, color: COLORS.neutral },
                  { name: 'Negatif', value: reportData.negatif, color: COLORS.negative }
                ]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-gray-900">{reportData.total}</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Berita</span>
            </div>
          </div>
        </div>

        {/* Top Destinations Bar Chart */}
        <div className="bg-white rounded-3xl p-8 border-2 border-gray-50 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-8 text-center uppercase tracking-widest border-b-2 border-gray-50 pb-6">Top 5 Destinasi</h3>
          <div className="h-[320px] w-full flex items-center justify-center">
            <BarChart width={400} height={320} data={reportData.topDestinations} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 12, fill: '#1F2937', fontWeight: 700}} 
                width={150} 
              />
              <Bar 
                dataKey="count" 
                fill="#1D4ED8" 
                radius={[0, 8, 8, 0]} 
                barSize={32}
                isAnimationActive={!isGenerating}
              >
                {reportData.topDestinations.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#1E3A8A' : '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
      </div>

      {/* Heatmap Sebaran Wilayah */}
      <div className="bg-white rounded-3xl p-10 border-2 border-gray-50 shadow-sm mb-12">
        <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-50 pb-6">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Sebaran Wilayah (Heatmap)</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 h-[500px] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 relative">
            {geoJson ? (
              <MapContainer 
                center={[-6.9175, 107.6191]} 
                zoom={8} 
                className="h-full w-full"
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                attributionControl={false}
                preferCanvas={true}
              >
                <GeoJSON 
                  data={geoJson} 
                  style={(feature) => {
                    const regionName = feature?.properties?.nm_kabko || feature?.properties?.NAME_2 || '';
                    const normName = normalizeRegionName(regionName);
                    const regionData = reportData.allRegions.find((r: any) => 
                      normalizeRegionName(r.name) === normName
                    );
                    const count = regionData ? regionData.count : 0;
                    const maxCount = reportData.allRegions.length > 0 ? reportData.allRegions[0].count : 1;
                    
                    return {
                      fillColor: getRegionColor(count, maxCount),
                      weight: 1,
                      opacity: 1,
                      color: 'white',
                      fillOpacity: 1
                    };
                  }}
                />
              </MapContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                Memuat Peta...
              </div>
            )}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-gray-100 shadow-sm z-[1000]">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Intensitas Berita</p>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gradient-to-r from-blue-100 to-blue-900 rounded-full" />
                <span className="text-[10px] font-bold text-gray-600">Tinggi</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Daftar Wilayah Teratas</h4>
            {reportData.allRegions.slice(0, 10).map((region: any, idx: number) => {
              const maxCount = reportData.allRegions[0].count;
              const percentage = (region.count / maxCount) * 100;
              return (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>{region.name}</span>
                    <span>{region.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {reportData.allRegions.length > 10 && (
              <p className="text-[10px] text-gray-400 italic mt-2">
                * Menampilkan 10 wilayah dengan intensitas pemberitaan tertinggi
              </p>
            )}
          </div>
        </div>
      </div>

      </div>

      {/* AI Analysis & Recommendations */}
      <div id="report-analysis" className="bg-blue-900 rounded-[40px] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-800 rounded-full -mr-32 -mt-32 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-800 rounded-full -ml-24 -mb-24 opacity-30"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-10 border-b border-blue-700/50 pb-8">
            <div className="bg-white p-4 rounded-2xl shadow-xl">
              <Activity className="w-10 h-10 text-blue-900" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight">Analisis Strategis</h3>
              <p className="text-blue-200 font-medium">Rekomendasi Kebijakan Berbasis AI Intelligence</p>
            </div>
          </div>
          <div className="prose prose-invert prose-lg max-w-none prose-p:text-blue-50 prose-p:leading-relaxed prose-p:text-justify prose-headings:text-white prose-li:text-blue-50">
            <Markdown>{reportData.aiContent}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${step === 'review' ? 'max-w-4xl h-[90vh]' : 'max-w-md'} overflow-hidden flex flex-col transition-all duration-300`}>
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileDown className="w-5 h-5 text-blue-600" /> 
            {step === 'form' ? 'Generate Laporan PDF' : 'Review Laporan'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isGenerating}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {step === 'form' ? (
          <>
            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600">
                Pilih rentang waktu untuk menghasilkan laporan analisis media yang dilengkapi dengan rekomendasi kebijakan berbasis AI.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Mulai</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Akhir</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-2">Kolom Data Tambahan (Opsional)</label>
                <p className="text-xs text-gray-500 mb-3">Pilih kolom yang ingin dilampirkan sebagai tabel di halaman berikutnya pada PDF.</p>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_COLUMNS.map(col => (
                    <button
                      key={col.id}
                      onClick={() => toggleColumn(col.id)}
                      disabled={isGenerating}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-colors ${
                        selectedColumns.includes(col.id) 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {selectedColumns.includes(col.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="truncate">{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !startDate || !endDate}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {progressText}
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Buat Laporan
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Review Step - Real PDF Viewer */}
            <div className="flex-1 bg-gray-200 relative overflow-y-auto p-4 flex justify-center">
              {pdfUrl ? (
                <div className="shadow-2xl bg-white">
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                        <p className="text-gray-500 font-medium">Menampilkan PDF...</p>
                      </div>
                    }
                    error={
                      <div className="p-10 text-red-500 text-center">
                        Gagal memuat pratinjau PDF. Silakan coba unduh langsung.
                      </div>
                    }
                  >
                    {Array.from(new Array(numPages), (el, index) => (
                      <Page 
                        key={`page_${index + 1}`} 
                        pageNumber={index + 1} 
                        width={800}
                        className="mb-4 last:mb-0"
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    ))}
                  </Document>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                  <p className="font-medium">Memuat pratinjau PDF...</p>
                  <p className="text-sm">Jika pratinjau tidak muncul, Anda tetap dapat mengunduh PDF di bawah.</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <button 
                onClick={() => setStep('form')}
                disabled={isGenerating}
                className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors px-4 py-2"
              >
                Kembali
              </button>
              <button 
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {progressText}
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden Report Template for PDF Generation */}
      {reportData && (
        <div 
          className="fixed" 
          style={{ 
            left: '-9999px',
            top: '0',
            width: '1024px',
            backgroundColor: 'white',
            zIndex: -100
          }}
        >
          <div ref={reportRef}>
            {renderReportContent()}
          </div>
        </div>
      )}
    </div>
  );
}
