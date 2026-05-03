import React, { useState, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { motion } from 'motion/react';
import { FileDown, FileText, Settings, FileImage, FileCode2, CheckSquare, Square, Edit3, Sparkles, MapIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, ExternalHyperlink, Header, Footer, PageNumber } from 'docx';
import { saveAs } from 'file-saver';
import pptxgen from 'pptxgenjs';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, Popup } from 'react-leaflet';

interface ReportStudioProps {
  data: any[];
  trendData: any[];
  sentimentCounts: { positif: number, netral: number, negatif: number };
  topMedia: { totalUnique: number, list: any[] };
  recentNews: any[];
  topDestinations: any[];
  mapData?: any[];
  timeFilter: string;
}

const Page = ({ children, header, footer, currentPage, totalPages }: { children: React.ReactNode, header?: React.ReactNode, footer?: React.ComponentType<{ currentPage: number, totalPages: number }>, currentPage: number, totalPages: number }) => (
  <div className="bg-white w-[210mm] min-h-[297mm] shadow-lg p-[20mm] mb-8 mx-auto flex flex-col">
    {header}
    <div className="flex-1">
      {children}
    </div>
    {footer && React.createElement(footer, { currentPage, totalPages })}
  </div>
);

const ReportPageHeader = ({ reportPeriod, setReportPeriod }: { reportPeriod: string, setReportPeriod: (val: string) => void }) => {
  const [editing, setEditing] = useState(false);
  return (
    <div className="border-b-2 border-[#1E3A8A] pb-2 mb-12 flex justify-between items-end avoid-break">
      <div className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
        Laporan Digital News Monitoring SWJ
      </div>
      <div className="text-xs text-gray-500 relative group">
        {editing ? (
          <input 
            autoFocus
            type="text" 
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            onBlur={() => setEditing(false)}
            className="w-full text-right bg-transparent border-b border-gray-300 focus:ring-0 focus:outline-none"
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            className="cursor-text hover:bg-gray-50 rounded px-1"
          >
            {reportPeriod}
          </span>
        )}
      </div>
    </div>
  );
};

const ReportPageFooter = ({ currentPage, totalPages }: { currentPage: number, totalPages: number }) => (
  <div className="border-t border-gray-200 pt-2 mt-8 flex justify-between items-center text-xs text-gray-400">
    <span>Media Intelligence 209</span>
    <span>hal {currentPage} dari {totalPages}</span>
  </div>
);

export default function ReportStudio({ data, trendData, sentimentCounts, topMedia, recentNews, topDestinations, mapData, timeFilter }: ReportStudioProps) {
  const getPeriodText = (filter: string) => {
    const now = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    if (filter === 'Hari Ini') {
      return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    } else if (filter === '7 Hari') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return `${sevenDaysAgo.getDate()} ${months[sevenDaysAgo.getMonth()]} s.d ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    } else if (filter === '30 Hari') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return `${thirtyDaysAgo.getDate()} ${months[thirtyDaysAgo.getMonth()]} s.d ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    } else if (filter === 'Tahun Ini') {
      return `Januari ${now.getFullYear()} s.d Desember ${now.getFullYear()}`;
    }
    return 'Seluruh Periode';
  };

  const [reportTitle, setReportTitle] = useState('Laporan Digital News Monitoring SWJ');
  const [reportSubtitle, setReportSubtitle] = useState('Pariwisata Jawa Barat');
  const [reportPeriod, setReportPeriod] = useState(getPeriodText(timeFilter));
  
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

  const [selectedMapRegion, setSelectedMapRegion] = useState<any>(null);

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

  const [execSummary1, setExecSummary1] = useState(`Laporan ini menyajikan hasil monitoring dan analisis pemberitaan media terkait pariwisata Jawa Barat selama periode ${timeFilter.toUpperCase()}. Data dikumpulkan dari ${topMedia.totalUnique} sumber media mencakup media online, cetak, dan penyiaran.`);
  const [execSummary2, setExecSummary2] = useState(`Secara keseluruhan, pemberitaan pariwisata Jawa Barat pada periode ${timeFilter.toUpperCase()} menunjukkan tren positif dengan total ${totalBerita.toLocaleString('id-ID')} berita. Indeks sentimen berada di angka ${indeksFormatted} dari skala 1.00, mencerminkan dominasi narasi positif di media.`);
  
  const [posSummary, setPosSummary] = useState('');
  const [negSummary, setNegSummary] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Update period and summaries when timeFilter changes
  React.useEffect(() => {
    const period = getPeriodText(timeFilter);
    setReportPeriod(period);
    setExecSummary1(`Laporan ini menyajikan hasil monitoring dan analisis pemberitaan media terkait pariwisata Jawa Barat selama periode ${timeFilter.toUpperCase()}. Data dikumpulkan dari ${topMedia.totalUnique} sumber media mencakup media online, cetak, dan penyiaran.`);
    setExecSummary2(`Secara keseluruhan, pemberitaan pariwisata Jawa Barat pada periode ${timeFilter.toUpperCase()} menunjukkan tren positif dengan total ${totalBerita.toLocaleString('id-ID')} berita. Indeks sentimen berada di angka ${indeksFormatted} dari skala 1.00, mencerminkan dominasi narasi positif di media.`);
    
    const topDest1 = topDestinations[0]?.name || 'Beberapa destinasi';
    const topDest2 = topDestinations[1]?.name || 'wilayah lainnya';
    const topMediaName = topMedia.list[0]?.name || 'media utama';

    setPosSummary(`Volume pemberitaan pariwisata Jawa Barat mencapai ${totalBerita.toLocaleString('id-ID')} berita pada periode ini.\n\nDominasi sentimen positif (${pctPos}%) menunjukkan citra pariwisata Jabar yang baik di mata media.\n\n${topDest1} dan ${topDest2} konsisten menjadi destinasi dengan pemberitaan tertinggi.`);
    
    setNegSummary(`Terdapat ${pctNeg}% pemberitaan bersentimen negatif yang perlu menjadi perhatian.\n\nBeberapa isu negatif umumnya terkait dengan infrastruktur, kemacetan, atau kebersihan di kawasan wisata tertentu.\n\nPemantauan lebih lanjut diperlukan pada destinasi yang mengalami lonjakan sentimen negatif.`);
    
    setRecommendations(`1. Akselerasi Promosi Digital\nTingkatkan konten visual di media sosial khususnya untuk wilayah ${topDest1} dan ${topDest2} yang sedang mendapat sorotan tinggi.\n\n2. Mitigasi Isu Negatif\nSiapkan strategi komunikasi untuk merespons narasi negatif terkait kemacetan atau infrastruktur di jalur wisata utama.\n\n3. Kolaborasi Media\nPerkuat kerja sama dengan ${topMediaName} dan media lokal lainnya untuk mengamplifikasi kampanye pariwisata positif (Jabar Smile).`);

  }, [timeFilter, totalBerita, topMedia.totalUnique, indeksFormatted, pctPos, pctNeg, topDestinations, topMedia.list]);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    document.body.classList.add('is-exporting');
    
    // Memberi sedikit waktu jeda agar CSS 'is-exporting' terefleksi di DOM
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = reportRef.current.querySelectorAll('.w-\\[210mm\\]');
      
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, { 
          scale: 2, 
          useCORS: true, 
          allowTaint: false,
          backgroundColor: '#ffffff'
        });
        const dataUrl = canvas.toDataURL('image/png');
        
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`Laporan_SWJ_${timeFilter}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      // Fallback
      alert('Mode unduh langsung terblokir oleh keamanan browser (CORS). Dialihkan ke mode Print otomatis, mohon pilih "Save as PDF".');
      window.print();
    } finally {
      document.body.classList.remove('is-exporting');
      setIsExporting(false);
    }
  };

  const exportDOCX = async () => {
    setIsExporting(true);
    try {
      // Capture Heatmap if active
      let heatmapImage: Uint8Array | null = null;
      if (components.heatmap) {
        const heatmapEl = document.getElementById('report-map-container');
        if (heatmapEl) {
          const dataUrl = await toPng(heatmapEl, { quality: 0.95 });
          const base64Data = dataUrl.split(',')[1];
          heatmapImage = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        }
      }

      const children: any[] = [];

      // Cover
      if (components.cover) {
        children.push(new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          spacing: { after: 100 },
          children: [new TextRun({ text: "DINAS PARIWISATA PROVINSI JAWA BARAT", bold: true, color: "6B7280", size: 28 })]
        }));
        children.push(new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          spacing: { after: 400 },
          children: [new TextRun({ text: "Media Intelligence 209", italics: true, color: "9CA3AF", size: 24 })]
        }));
        children.push(new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          spacing: { after: 200 },
          children: [new TextRun({ text: reportTitle, bold: true, color: "1E3A8A", size: 48 })]
        }));
        children.push(new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          spacing: { after: 200 },
          children: [new TextRun({ text: reportSubtitle, bold: true, color: "1F2937", size: 60 })]
        }));
        children.push(new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          spacing: { after: 400 },
          children: [new TextRun({ text: reportPeriod, bold: true, color: "3B82F6", size: 40 })]
        }));
        
        // Metrics Table
        const metricsTable = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ shading: { fill: "1E3A8A" }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "TOTAL BERITA", bold: true, color: "FFFFFF", size: 18 })] })] }),
                new TableCell({ shading: { fill: "10B981" }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "SENTIMEN +", bold: true, color: "FFFFFF", size: 18 })] })] }),
                new TableCell({ shading: { fill: "F59E0B" }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "SENTIMEN NETRAL", bold: true, color: "FFFFFF", size: 18 })] })] }),
                new TableCell({ shading: { fill: "EF4444" }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "SENTIMEN -", bold: true, color: "FFFFFF", size: 18 })] })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ shading: { fill: "EFF6FF" }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 150, after: 150 }, children: [new TextRun({ text: totalBerita.toLocaleString('id-ID'), bold: true, color: "1E3A8A", size: 40 })] })] }),
                new TableCell({ shading: { fill: "ECFDF5" }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 150, after: 150 }, children: [new TextRun({ text: sentimentCounts.positif.toLocaleString('id-ID'), bold: true, color: "10B981", size: 40 })] })] }),
                new TableCell({ shading: { fill: "FFFBEB" }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 150, after: 150 }, children: [new TextRun({ text: sentimentCounts.netral.toLocaleString('id-ID'), bold: true, color: "F59E0B", size: 40 })] })] }),
                new TableCell({ shading: { fill: "FEF2F2" }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 150, after: 150 }, children: [new TextRun({ text: sentimentCounts.negatif.toLocaleString('id-ID'), bold: true, color: "EF4444", size: 40 })] })] }),
              ]
            })
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          }
        });
        children.push(metricsTable);
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: `Indeks Sentimen: ${indeksFormatted} / 1.00`, bold: true, color: indeksSentimen > 0 ? "10B981" : "EF4444" })] }));
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: `Media Terpantau: ${topMedia.totalUnique} media`, color: "6B7280" })] }));
      }

      // Executive Summary
      if (components.execSummary) {
        children.push(new Paragraph({ 
          spacing: { before: 400, after: 200 },
          children: [new TextRun({ text: "1. Ringkasan Eksekutif", bold: true, color: "1E3A8A", size: 32 })] 
        }));
        children.push(new Paragraph({ text: `Laporan ini menyajikan hasil monitoring dan analisis pemberitaan media terkait pariwisata Jawa Barat selama periode ${reportPeriod}. Data dikumpulkan dari ${topMedia.totalUnique} sumber media mencakup media online, cetak, dan penyiaran.`, spacing: { after: 200 } }));
        children.push(new Paragraph({ 
          spacing: { after: 200 },
          children: [new TextRun({ text: "1.1 Temuan Utama", bold: true, color: "1E40AF", size: 28 })] 
        }));
        children.push(new Paragraph({ text: `Secara keseluruhan, pemberitaan pariwisata Jawa Barat pada ${reportPeriod} menunjukkan tren positif dengan total ${totalBerita.toLocaleString('id-ID')} berita. Indeks sentimen berada di angka ${indeksFormatted} dari skala 1.00, mencerminkan dominasi narasi positif di media.`, spacing: { after: 200 } }));
        
        const summaryTable = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ shading: { fill: "10B981" }, children: [new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Hal Menonjol Positif", bold: true, color: "FFFFFF" })] })] }),
                new TableCell({ shading: { fill: "EF4444" }, children: [new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Hal yang Memerlukan Perhatian", bold: true, color: "FFFFFF" })] })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ shading: { fill: "ECFDF5" }, children: [new Paragraph({ text: posSummary, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ shading: { fill: "FEF2F2" }, children: [new Paragraph({ text: negSummary, spacing: { before: 100, after: 100 } })] }),
              ]
            })
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          }
        });
        children.push(summaryTable);
      }

      // Heatmap (Stats)
      if (components.heatmap) {
        children.push(new Paragraph({ 
          spacing: { before: 400, after: 200 },
          children: [new TextRun({ text: "2. Peta Sebaran Berita (Heatmap)", bold: true, color: "1E3A8A", size: 32 })] 
        }));
        children.push(new Paragraph({ text: `Peta berikut menunjukkan intensitas pemberitaan pariwisata di berbagai kabupaten/kota di Jawa Barat selama ${reportPeriod}:`, spacing: { after: 200 } }));
        
        if (heatmapImage) {
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 400 },
            children: [
              new ImageRun({
                data: heatmapImage,
                transformation: {
                  width: 550,
                  height: 300,
                },
              }),
            ],
          }));
        }
      }

      // Destinations
      if (components.destinations) {
        children.push(new Paragraph({ 
          spacing: { before: 400, after: 200 },
          children: [new TextRun({ text: "3. Destinasi Wisata Paling Banyak Diberitakan", bold: true, color: "1E3A8A", size: 32 })] 
        }));
        children.push(new Paragraph({ text: `Berikut adalah destinasi dengan volume pemberitaan tertinggi selama ${reportPeriod} berdasarkan data media monitoring:`, spacing: { after: 200 } }));
        
        const destRows = [
          new TableRow({
            children: [
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "#", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Destinasi", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Jumlah Berita", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Persentase", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Sentimen", bold: true, color: "FFFFFF" })] })] }),
            ]
          })
        ];
        
        topDestinations.slice(0, 8).forEach((dest, index) => {
          const pct = totalBerita > 0 ? ((dest.count / totalBerita) * 100).toFixed(1) : '0';
          const sentiment = dest.sentiment || 'Netral';
          let sentimentColor = "F59E0B";
          let sentimentFill = "FFFBEB";
          if (sentiment === 'Positif') {
            sentimentColor = "10B981";
            sentimentFill = "ECFDF5";
          } else if (sentiment === 'Negatif') {
            sentimentColor = "EF4444";
            sentimentFill = "FEF2F2";
          }

          destRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: `${index + 1}`, alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ children: [new Paragraph({ text: dest.name, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ children: [new Paragraph({ text: dest.count.toLocaleString('id-ID'), alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ children: [new Paragraph({ text: `${pct}%`, alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ shading: { fill: sentimentFill }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: sentiment, bold: true, color: sentimentColor })] })] }),
              ]
            })
          );
        });
        
        children.push(new Table({ 
          rows: destRows, 
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          }
        }));
      }

      // Media
      if (components.media) {
        children.push(new Paragraph({ 
          spacing: { before: 400, after: 200 },
          children: [new TextRun({ text: "4. Sumber Media Terbanyak", bold: true, color: "1E3A8A", size: 32 })] 
        }));
        children.push(new Paragraph({ text: `Dari ${topMedia.totalUnique} media yang dipantau, berikut adalah 10 sumber dengan kontribusi pemberitaan terbesar:`, spacing: { after: 200 } }));
        
        const mediaRows = [
          new TableRow({
            children: [
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "#", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Nama Media", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Jumlah Berita", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Porsi", bold: true, color: "FFFFFF" })] })] }),
            ]
          })
        ];
        
        topMedia.list.slice(0, 10).forEach((m, index) => {
          mediaRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: `${index + 1}`, alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ children: [new Paragraph({ text: m.name || m.domain, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ children: [new Paragraph({ text: m.count.toLocaleString('id-ID'), alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ children: [new Paragraph({ text: `${m.pct}%`, alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })] }),
              ]
            })
          );
        });
        
        children.push(new Table({ 
          rows: mediaRows, 
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          }
        }));
      }

      // News
      if (components.news) {
        children.push(new Paragraph({ 
          spacing: { before: 400, after: 200 },
          children: [new TextRun({ text: "5. Berita Utama Bulan Ini", bold: true, color: "1E3A8A", size: 32 })] 
        }));
        children.push(new Paragraph({ text: `Berikut adalah berita dengan dampak dan perhatian media tertinggi selama periode ${reportPeriod}:`, spacing: { after: 200 } }));
        
        const newsRows = [
          new TableRow({
            children: [
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Judul Berita", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Media", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Tanggal", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Sentimen", bold: true, color: "FFFFFF" })] })] }),
            ]
          })
        ];
        
        recentNews.slice(0, 8).forEach((item, index) => {
          let sentimentColor = "F59E0B";
          let sentimentFill = "FFFBEB";
          if (item.sentimen === 'Positif' || item.sentiment === 'Positif') {
            sentimentColor = "10B981";
            sentimentFill = "ECFDF5";
          } else if (item.sentimen === 'Negatif' || item.sentiment === 'Negatif') {
            sentimentColor = "EF4444";
            sentimentFill = "FEF2F2";
          }

          newsRows.push(
            new TableRow({
              children: [
                new TableCell({ 
                  children: [
                    new Paragraph({ 
                      spacing: { before: 100, after: 100 },
                      children: item.url ? [
                        new ExternalHyperlink({
                          children: [
                            new TextRun({
                              text: item.judul || item.title,
                              color: "1E40AF",
                              underline: {},
                            }),
                          ],
                          link: item.url,
                        }),
                      ] : [
                        new TextRun({ text: item.judul || item.title }),
                      ],
                    }),
                  ],
                }),
                new TableCell({ children: [new Paragraph({ text: item.media || item.domain, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ children: [new Paragraph({ text: (item.tanggal || item.published_at || ""), alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ shading: { fill: sentimentFill }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: item.sentimen || item.sentiment, bold: true, color: sentimentColor })] })] }),
              ]
            })
          );
        });
        
        children.push(new Table({ 
          rows: newsRows, 
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          }
        }));
      }

      // Recommendations
      if (components.recommendations) {
        children.push(new Paragraph({ 
          spacing: { before: 400, after: 200 },
          children: [new TextRun({ text: "6. Rekomendasi Strategis", bold: true, color: "1E3A8A", size: 32 })] 
        }));
        children.push(new Paragraph({ text: `Berdasarkan hasil analisis pemberitaan ${reportPeriod}, berikut rekomendasi strategis untuk meningkatkan citra pariwisata Jawa Barat dan menangani isu yang berkembang di media:`, spacing: { after: 200 } }));
        children.push(new Paragraph({ text: recommendations, spacing: { after: 200 } }));
      }

      // News Attachment
      if (components.newsAttachment) {
        children.push(new Paragraph({ 
          spacing: { before: 400, after: 200 },
          children: [new TextRun({ text: "7. Lampiran: Daftar Berita", bold: true, color: "1E3A8A", size: 32 })] 
        }));
        children.push(new Paragraph({ text: `Berikut adalah daftar lengkap berita yang dipantau selama periode ${reportPeriod}:`, spacing: { after: 200 } }));
        
        const tableRows = [
          new TableRow({
            children: [
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "No", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Tanggal", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Media", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Judul", bold: true, color: "FFFFFF" })] })] }),
              new TableCell({ shading: { fill: "1E3A8A" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Sentimen", bold: true, color: "FFFFFF" })] })] }),
            ],
          })
        ];

        recentNews.forEach((item, index) => { 
          let sentimentColor = "F59E0B";
          let sentimentFill = "FFFBEB";
          if (item.sentimen === 'Positif' || item.sentiment === 'Positif') {
            sentimentColor = "10B981";
            sentimentFill = "ECFDF5";
          } else if (item.sentimen === 'Negatif' || item.sentiment === 'Negatif') {
            sentimentColor = "EF4444";
            sentimentFill = "FEF2F2";
          }

          tableRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: `${index + 1}`, alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ children: [new Paragraph({ text: (item.tanggal || item.published_at || ""), alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ children: [new Paragraph({ text: item.media || item.domain, spacing: { before: 100, after: 100 } })] }),
                new TableCell({ 
                  children: [
                    new Paragraph({ 
                      spacing: { before: 100, after: 100 },
                      children: item.url ? [
                        new ExternalHyperlink({
                          children: [
                            new TextRun({
                              text: item.judul || item.title,
                              color: "1E40AF",
                              underline: {},
                            }),
                          ],
                          link: item.url,
                        }),
                      ] : [
                        new TextRun({ text: item.judul || item.title }),
                      ],
                    }),
                  ],
                }),
                new TableCell({ shading: { fill: sentimentFill }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: item.sentimen || item.sentiment, bold: true, color: sentimentColor })] })] }),
              ]
            })
          );
        });

        children.push(new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          }
        }));
      }

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Media Intelligence 209 - Jawa Barat",
                      color: "9CA3AF",
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Halaman ",
                      color: "9CA3AF",
                      size: 18,
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      color: "9CA3AF",
                      size: 18,
                    }),
                    new TextRun({
                      text: " dari ",
                      color: "9CA3AF",
                      size: 18,
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      color: "9CA3AF",
                      size: 18,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children: children
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
        .is-exporting .edit-icon { display: none !important; }
        .is-exporting textarea { border: none !important; background: transparent !important; }
        .is-exporting input { border: none !important; background: transparent !important; }
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
          .leaflet-control-container {
            display: none !important;
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
            {isExporting ? 'Memproses...' : 'Download PDF'}
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
          className="bg-white w-[210mm] mx-auto min-h-full shadow-2xl text-gray-900 font-sans print:shadow-none print:max-w-none print:min-h-0 print:p-0 relative"
          style={{ color: '#111827' }} // Force dark text for PDF
        >
        
          {(() => {
            const activeComponents = Object.values(components).filter(Boolean).length;
            let pageCount = 0;
            return (
              <>
                <Page currentPage={++pageCount} totalPages={activeComponents} header={<ReportPageHeader reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} />} footer={ReportPageFooter}>
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
                        <p className="text-xs text-gray-400 italic mb-12">Media Intelligence 209</p>
                        
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
                </Page>

          <Page currentPage={++pageCount} totalPages={activeComponents} header={<ReportPageHeader reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} />} footer={ReportPageFooter}>
            {/* 1. Ringkasan Eksekutif */}
            {components.execSummary && (
              <div className="mb-12">
                <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">1. Ringkasan Eksekutif</h2>
                <TextareaAutosize 
                  value={execSummary1}
                  onChange={(e) => setExecSummary1(e.target.value)}
                  className="w-full text-sm text-gray-700 mb-6 bg-transparent border-none focus:ring-0 focus:outline-none hover:bg-gray-50 rounded"
                />
                
                <h3 className="text-lg font-bold text-blue-800 mb-3">1.1 Temuan Utama</h3>
                <TextareaAutosize 
                  value={execSummary2}
                  onChange={(e) => setExecSummary2(e.target.value)}
                  className="w-full text-sm text-gray-700 mb-4 bg-transparent border-none focus:ring-0 focus:outline-none hover:bg-gray-50 rounded"
                />

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
                          <TextareaAutosize 
                            value={posSummary}
                            onChange={(e) => setPosSummary(e.target.value)}
                            className="w-full h-full min-h-[150px] p-4 bg-transparent border-none focus:ring-0 focus:outline-none text-gray-800"
                          />
                        </td>
                        <td className="bg-red-50 p-0 border border-white align-top">
                          <TextareaAutosize 
                            value={negSummary}
                            onChange={(e) => setNegSummary(e.target.value)}
                            className="w-full h-full min-h-[150px] p-4 bg-transparent border-none focus:ring-0 focus:outline-none text-gray-800"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <Edit3 className="w-4 h-4 text-gray-400 absolute -left-6 top-1/2 opacity-0 group-hover:opacity-100 edit-icon" />
                </div>
              </div>
            )}
          </Page>

          <Page currentPage={++pageCount} totalPages={activeComponents} header={<ReportPageHeader reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} />} footer={ReportPageFooter}>
            {/* 2. Peta Sebaran (Heatmap) */}
            {components.heatmap && mapData && (
              <div className="mb-12 page-break">
                <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">2. Peta Sebaran Berita (Heatmap)</h2>
                <p className="text-sm text-gray-700 mb-4">
                  Peta berikut menunjukkan intensitas pemberitaan pariwisata di berbagai kabupaten/kota di Jawa Barat selama {reportPeriod}.
                </p>
                <div id="report-map-container" className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-200 relative z-0 mb-4">
                  <MapContainer 
                    center={[-6.9147, 107.6098]}
                    zoom={8}
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                    dragging={true}
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
                          eventHandlers={{ click: () => setSelectedMapRegion(loc) }}
                        >
                          <LeafletTooltip direction="top" offset={[0, -10]} opacity={1}>
                            <div className="text-center p-0.5">
                              <div className="font-bold text-gray-800 text-sm mb-0.5 capitalize">{loc.name}</div>
                              <div className="text-xs text-gray-600">{loc.count.toLocaleString('id-ID')} Berita</div>
                              {loc.dominantSentiment && (
                                <div className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full inline-block ${
                                  loc.dominantSentiment === 'Positif' ? 'bg-green-100 text-green-700' : 
                                  loc.dominantSentiment === 'Negatif' ? 'bg-red-100 text-red-700' : 
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {loc.dominantSentiment}
                                </div>
                              )}
                              <div className="text-[9px] text-gray-400 mt-1.5 border-t pt-1 border-gray-100">Klik untuk rincian lengkap</div>
                            </div>
                          </LeafletTooltip>
                        </CircleMarker>
                      );
                    })}
                  </MapContainer>

                  {/* Custom Info Panel for Selected Region */}
                  {selectedMapRegion && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-5 rounded-xl shadow-xl border border-gray-100 z-[1000] min-w-[200px]" contentEditable={false}>
                      <button 
                        onClick={() => setSelectedMapRegion(null)}
                        className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                      >
                        ×
                      </button>
                      <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3 mr-4 capitalize text-sm">{selectedMapRegion.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded">
                          <span className="text-gray-600 text-xs">Total Berita</span>
                          <span className="font-black text-gray-800">{selectedMapRegion.count.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-600 p-1.5 hover:bg-green-50 rounded transition-colors">
                          <span className="text-xs font-medium">Positif</span>
                          <span className="font-bold">{selectedMapRegion.positif || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-yellow-600 p-1.5 hover:bg-yellow-50 rounded transition-colors">
                          <span className="text-xs font-medium">Netral</span>
                          <span className="font-bold">{selectedMapRegion.netral || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors">
                          <span className="text-xs font-medium">Negatif</span>
                          <span className="font-bold">{selectedMapRegion.negatif || 0}</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col items-center">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Sentimen Dominan</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            selectedMapRegion.dominantSentiment === 'Positif' ? 'bg-green-100 text-green-700' : 
                            selectedMapRegion.dominantSentiment === 'Negatif' ? 'bg-red-100 text-red-700' : 
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {selectedMapRegion.dominantSentiment || 'Netral'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Map Legend - Outside and Centered */}
                <div className="flex flex-col items-center justify-center py-2 border-t border-gray-100 mt-2">
                  <div className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-widest">Legenda Intensitas Pemberitaan</div>
                  <div className="flex items-center justify-center gap-8 text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[rgb(255,0,0)] opacity-60 border border-red-600"></div>
                      <span className="text-gray-600 font-medium">Sangat Tinggi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[rgb(255,128,0)] opacity-60 border border-orange-500"></div>
                      <span className="text-gray-600 font-medium">Tinggi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[rgb(255,255,0)] opacity-60 border border-yellow-400"></div>
                      <span className="text-gray-600 font-medium">Sedang / Rendah</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Page>

          <Page currentPage={++pageCount} totalPages={activeComponents} header={<ReportPageHeader reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} />} footer={ReportPageFooter}>
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
                      const sentiment = dest.sentiment || 'Netral';
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
          </Page>

          <Page currentPage={++pageCount} totalPages={activeComponents} header={<ReportPageHeader reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} />} footer={ReportPageFooter}>
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
          </Page>

          <Page currentPage={++pageCount} totalPages={activeComponents} header={<ReportPageHeader reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} />} footer={ReportPageFooter}>
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
                          <td className="p-2 text-center whitespace-nowrap">{news.tanggal}</td>
                          <td className={`p-2 text-center font-bold ${sentimentColor}`}>{news.sentimen}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Page>

          <Page currentPage={++pageCount} totalPages={activeComponents} header={<ReportPageHeader reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} />} footer={ReportPageFooter}>
            {/* 5. Rekomendasi Strategis */}
            {components.recommendations && (
              <div className="mb-12 relative group">
                <h2 className="text-xl font-bold text-[#1E3A8A] border-b border-gray-300 pb-2 mb-4">5. Rekomendasi Strategis</h2>
                <p className="text-sm text-gray-700 mb-4">
                  Berdasarkan hasil analisis pemberitaan {reportPeriod}, berikut rekomendasi strategis untuk meningkatkan citra pariwisata Jawa Barat dan menangani isu yang berkembang di media:
                </p>
                
                <TextareaAutosize 
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="w-full min-h-[250px] p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <Edit3 className="w-4 h-4 text-gray-400 absolute -left-6 top-1/2 opacity-0 group-hover:opacity-100 edit-icon" />
              </div>
            )}
          </Page>

          <Page currentPage={++pageCount} totalPages={activeComponents} header={<ReportPageHeader reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} />} footer={ReportPageFooter}>
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
                    {recentNews.map((news, idx) => {
                      const sentimentColor = news.sentimen === 'Positif' ? 'text-[#10B981] bg-green-50' : news.sentimen === 'Negatif' ? 'text-[#EF4444] bg-red-50' : 'text-[#F59E0B] bg-yellow-50';
                      return (
                        <tr key={idx} className="border-b border-gray-200 avoid-break">
                          <td className="p-2 text-center">{idx + 1}</td>
                          <td className="p-2 whitespace-nowrap">{news.tanggal}</td>
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
                {recentNews.length > 0 && (
                  <p className="text-xs text-gray-500 mt-4 italic text-center">
                    *Menampilkan seluruh {recentNews.length} berita terpantau.
                  </p>
                )}
              </div>
            )}
          </Page>
              </>
            );
          })()}
          <div className="block print:hidden border-t border-gray-200 pt-2 mt-8 text-center text-xs text-gray-400">
            Media Intelligence 209
          </div>

          {/* Document Footer (Print) */}
          <div className="hidden print:block print-footer text-xs text-gray-400 border-t border-gray-200 pt-2 mt-4 text-center">
            Media Intelligence 209
          </div>

        </div>
      </div>
    </div>
  );
}
