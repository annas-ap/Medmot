import React, { useState, useRef } from 'react';
import { X, FileDown, Loader2, Calendar, CheckSquare, Square, Activity, BarChart2, PieChart as PieChartIcon, FileText, Presentation, Image as ImageIcon, Video, Download } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image';
import Markdown from 'react-markdown';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LabelList } from 'recharts';
import { MapContainer, GeoJSON, TileLayer, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'motion/react';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const AVAILABLE_COLUMNS = [
  { id: 'NOMOR', label: 'Nomor' },
  { id: 'TANGGAL', label: 'Tanggal' },
  { id: 'NAMA MEDIA', label: 'Media' },
  { id: 'JUDUL', label: 'Judul Berita' },
  { id: 'KAB/KOTA', label: 'Destinasi/Wilayah' },
  { id: 'SENTIMEN', label: 'Sentimen' },
  { id: 'LINK BERITA', label: 'Link Berita' },
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
  const [step, setStep] = useState<'form' | 'review' | 'motion'>('form');
  const [format, setFormat] = useState<'pdf' | 'docx' | 'pptx' | 'infographic' | 'motion'>('pdf');
  const [aiFocus, setAiFocus] = useState('');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [geoJson, setGeoJson] = useState<any>(null);
  
  const reportRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const infographicRef = useRef<HTMLDivElement>(null);

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
      setAiFocus('');
      setFormat('pdf');
      setIncludeCharts(true);
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
        .map(([name, count]) => ({ name, count })) || [];

      const topMedia = Object.entries(mediaCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })) || [];

      const allRegions = Object.entries(destCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })) || [];

      // Map Data based on real KAB/KOTA
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

      const mapData = Object.entries(destCounts).map(([name, count]) => {
        const key = name.toLowerCase();
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
        
        ${aiFocus ? `FOKUS ANALISIS KHUSUS: ${aiFocus}\nPastikan laporan Anda sangat menitikberatkan pada fokus ini.` : ''}
        
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
        
        Pastikan analisis Anda mendalam, objektif, dan memberikan nilai tambah strategis bagi pengambil keputusan. Format output menggunakan markdown yang rapi.
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
        sentimentData: [
          { name: 'Positif', value: positif, color: '#10B981' },
          { name: 'Netral', value: netral, color: '#F59E0B' },
          { name: 'Negatif', value: negatif, color: '#EF4444' }
        ],
        topDestinations,
        topMedia,
        allRegions,
        topRegions: allRegions,
        mapData,
        aiContent,
        selectedColumns,
        tableData: filteredData
      };

      // Set data for rendering
      setReportData(newReportData);
      
      // Move to a temporary state to allow hidden template to render
      setProgressText('Menyiapkan dokumen...');
      
      // Wait for the hidden template to render its charts
      setTimeout(async () => {
        try {
          if (format === 'pdf') {
            const pdf = await generatePDFDocument(newReportData);
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setStep('review');
          } else if (format === 'infographic') {
            await generateInfographic(newReportData);
            onClose();
          } else if (format === 'docx') {
            await generateDocx(newReportData);
            onClose();
          } else if (format === 'pptx') {
            await generatePptx(newReportData);
            onClose();
          } else if (format === 'motion') {
            setStep('motion');
          }
          setIsGenerating(false);
        } catch (err: any) {
          console.error('Generation failed:', err);
          alert('Gagal membuat laporan: ' + err.message);
          setIsGenerating(false);
        }
      }, 2000); // 2 seconds to ensure all charts and AI content are rendered

    } catch (error: any) {
      console.error('Error:', error);
      alert(`Terjadi kesalahan saat memproses laporan: ${error?.message || String(error)}`);
      setIsGenerating(false);
    }
  };

  const generateInfographic = async (data: any) => {
    if (!infographicRef.current) throw new Error('Infographic template not found');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for render
    
    // Use html2canvas or htmlToImage. We use htmlToImage here but with specific settings
    // to avoid CORS issues (no external SVGs or Leaflet maps in the capture div)
    const dataUrl = await htmlToImage.toPng(infographicRef.current, { 
      pixelRatio: 2, // High resolution for infographic
      quality: 1,
      backgroundColor: '#0f172a', // slate-900
      skipFonts: true, // Sometimes helps with hanging
    });
    
    const link = document.createElement('a');
    link.download = `Infografis_Media_${data.startDate}_${data.endDate}.png`;
    link.href = dataUrl;
    link.click();
  };

  const generateDocx = async (data: any) => {
    // Dynamic import to save bundle size
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, Header } = await import('docx');
    const { saveAs } = await import('file-saver');

    // Parse markdown to docx paragraphs
    const paragraphs: any[] = [];
    
    // Title
    paragraphs.push(
      new Paragraph({
        text: "LAPORAN ANALISIS STRATEGIS",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: "MEDIA INTELLIGENCE PARIWISATA JAWA BARAT",
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        text: `Periode: ${data.startDate} s/d ${data.endDate}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // AI Content
    const lines = data.aiContent.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith('### ')) {
        paragraphs.push(new Paragraph({ text: line.replace('### ', ''), heading: HeadingLevel.HEADING_3, spacing: { before: 400, after: 200 } }));
      } else if (line.startsWith('## ')) {
        paragraphs.push(new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
      } else if (line.startsWith('# ')) {
        paragraphs.push(new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        paragraphs.push(new Paragraph({ text: line.substring(2), bullet: { level: 0 } }));
      } else {
        paragraphs.push(new Paragraph({ text: line.replace(/\*\*(.*?)\*\*/g, '$1'), spacing: { after: 200 } }));
      }
    }

    // Table
    if (data.selectedColumns && data.selectedColumns.length > 0) {
      paragraphs.push(new Paragraph({ text: "Lampiran Data", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
      
      const selectedCols = AVAILABLE_COLUMNS.filter(c => data.selectedColumns.includes(c.id));
      
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: selectedCols.map(col => new TableCell({ children: [new Paragraph({ text: col.label, style: "Strong" })], shading: { fill: "E2E8F0" } }))
          }),
          ...data.tableData.map((row: any, index: number) => new TableRow({
            children: selectedCols.map(col => {
              let val = col.id === 'NOMOR' ? String(index + 1) : col.id === 'LINK BERITA' ? String(row['LINK URL'] || row['URL'] || '-') : String(row[col.id] || '-');
              return new TableCell({ children: [new Paragraph(val)] });
            })
          }))
        ]
      });
      paragraphs.push(table);
    }

    const doc = new Document({
      sections: [{ 
        properties: {}, 
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "SMILING WEST JAVA - MEDIA INTELLIGENCE",
                    bold: true,
                    color: "1E3A8A",
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: { color: "1E3A8A", space: 1, value: "single", size: 6 },
                },
              }),
            ],
          }),
        },
        children: paragraphs 
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Laporan_Media_${data.startDate}_${data.endDate}.docx`);
  };

  const generatePptx = async (data: any) => {
    const pptxgen = (await import('pptxgenjs')).default;
    const pres = new pptxgen();

    // Define Master Slide
    pres.defineSlideMaster({
      title: "MASTER_SLIDE",
      background: { color: "F8FAFC" },
      objects: [
        { rect: { x: 0, y: 0, w: "100%", h: 0.8, fill: { color: "1E3A8A" } } },
        { text: { text: "SMILING WEST JAVA - MEDIA INTELLIGENCE", options: { x: 0.5, y: 0.2, w: 5, h: 0.4, color: "FFFFFF", fontSize: 14, bold: true } } },
        { text: { text: `Periode: ${data.startDate} - ${data.endDate}`, options: { x: "70%", y: 0.2, w: 2.5, h: 0.4, color: "BFDBFE", fontSize: 12, align: "right" } } }
      ]
    });

    // Slide 1: Title
    const slide1 = pres.addSlide();
    slide1.background = { color: "1E3A8A" }; // blue-900
    slide1.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "0F172A", transparency: 50 } });
    slide1.addText("LAPORAN ANALISIS STRATEGIS", { x: 1, y: 2, w: '80%', h: 1, fontSize: 36, color: "FFFFFF", bold: true });
    slide1.addText("MEDIA INTELLIGENCE PARIWISATA JAWA BARAT", { x: 1, y: 3, w: '80%', h: 0.8, fontSize: 20, color: "38BDF8", bold: true });
    slide1.addText(`Periode: ${data.startDate} s/d ${data.endDate}`, { x: 1, y: 4, w: '80%', h: 0.5, fontSize: 16, color: "94A3B8" });

    // Slide 2: Stats
    const slide2 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide2.addText("Ringkasan Statistik", { x: 0.5, y: 1.2, fontSize: 24, bold: true, color: "1E3A8A" });
    
    // Stat boxes
    slide2.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 2, w: 2, h: 1.5, fill: { color: "EFF6FF" }, line: { color: "BFDBFE", width: 1 } });
    slide2.addText("Total Berita", { x: 0.5, y: 2.2, w: 2, h: 0.4, align: "center", fontSize: 12, color: "64748B", bold: true });
    slide2.addText(`${data.total}`, { x: 0.5, y: 2.6, w: 2, h: 0.6, align: "center", fontSize: 28, color: "1E3A8A", bold: true });

    slide2.addShape(pres.ShapeType.roundRect, { x: 2.8, y: 2, w: 2, h: 1.5, fill: { color: "ECFDF5" }, line: { color: "A7F3D0", width: 1 } });
    slide2.addText("Positif", { x: 2.8, y: 2.2, w: 2, h: 0.4, align: "center", fontSize: 12, color: "64748B", bold: true });
    slide2.addText(`${data.positif}`, { x: 2.8, y: 2.6, w: 2, h: 0.6, align: "center", fontSize: 28, color: "059669", bold: true });

    slide2.addShape(pres.ShapeType.roundRect, { x: 5.1, y: 2, w: 2, h: 1.5, fill: { color: "FFFBEB" }, line: { color: "FDE68A", width: 1 } });
    slide2.addText("Netral", { x: 5.1, y: 2.2, w: 2, h: 0.4, align: "center", fontSize: 12, color: "64748B", bold: true });
    slide2.addText(`${data.netral}`, { x: 5.1, y: 2.6, w: 2, h: 0.6, align: "center", fontSize: 28, color: "D97706", bold: true });

    slide2.addShape(pres.ShapeType.roundRect, { x: 7.4, y: 2, w: 2, h: 1.5, fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 } });
    slide2.addText("Negatif", { x: 7.4, y: 2.2, w: 2, h: 0.4, align: "center", fontSize: 12, color: "64748B", bold: true });
    slide2.addText(`${data.negatif}`, { x: 7.4, y: 2.6, w: 2, h: 0.6, align: "center", fontSize: 28, color: "DC2626", bold: true });

    // Slide 3: AI Analysis
    const slide3 = pres.addSlide({ masterName: "MASTER_SLIDE" });
    slide3.addText("Analisis Strategis AI", { x: 0.5, y: 1.2, fontSize: 24, bold: true, color: "1E3A8A" });
    
    // Simple text extraction for PPTX
    let aiText = data.aiContent.replace(/### /g, '').replace(/## /g, '').replace(/# /g, '').replace(/\*\*/g, '');
    slide3.addText(aiText.substring(0, 800) + (aiText.length > 800 ? "..." : ""), { x: 0.5, y: 1.8, w: '90%', h: 3.5, fontSize: 14, valign: "top", color: "334155" });

    pres.writeFile({ fileName: `Presentasi_Media_${data.startDate}_${data.endDate}.pptx` });
  };

  const generatePDFDocument = async (data: any) => {
    if (!pdfRef.current) throw new Error('PDF template not found');

    // Small delay to ensure charts are fully rendered in the hidden template
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Capture the visual summary (Header, Stats, Charts) from pdfRef
    const visualsImg = await htmlToImage.toJpeg(pdfRef.current, { 
      pixelRatio: 2,
      quality: 0.8,
      backgroundColor: '#ffffff',
      skipFonts: true, // Prevent hanging on external fonts
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
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width; // Scale to fit full width
    
    pdf.addImage(visualsImg, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
    
    // Page 2: Strategic Analysis (Searchable Text / OCR)
    pdf.addPage();
    
    // Add Header to Page 2
    pdf.setFillColor(30, 58, 138);
    pdf.rect(0, 0, pdfWidth, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SMILING WEST JAVA - MEDIA INTELLIGENCE', margin, 13);
    
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 58, 138); // blue-900
    pdf.text('Analisis Strategis & Rekomendasi', margin, 35);
    
    pdf.setDrawColor(30, 58, 138);
    pdf.setLineWidth(1);
    pdf.line(margin, 40, margin + 100, 40);
    
    // Process markdown for PDF text
    const lines = data.aiContent.split('\n');
    let yPos = 50;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) {
        yPos += 4; // Add some space for empty lines
        continue;
      }

      // Handle Headers
      if (line.startsWith('### ')) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 58, 138);
        line = line.replace('### ', '');
        yPos += 4;
      } else if (line.startsWith('## ')) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 58, 138);
        line = line.replace('## ', '');
        yPos += 6;
      } else if (line.startsWith('# ')) {
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 58, 138);
        line = line.replace('# ', '');
        yPos += 8;
      } else {
        // Normal text
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(51, 65, 85);
        
        // Handle bold text within line (simple approximation for PDF)
        line = line.replace(/\*\*(.*?)\*\*/g, '$1');
        
        // Handle bullets
        if (line.startsWith('* ') || line.startsWith('- ')) {
          line = '• ' + line.substring(2);
        }
      }

      const splitText = pdf.splitTextToSize(line, contentWidth);
      
      for (let j = 0; j < splitText.length; j++) {
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          
          // Add Header to new page
          pdf.setFillColor(30, 58, 138);
          pdf.rect(0, 0, pdfWidth, 20, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('SMILING WEST JAVA - MEDIA INTELLIGENCE', margin, 13);
          
          yPos = 30;
        }
        pdf.text(splitText[j], margin, yPos);
        yPos += 6;
      }
    }
    
    // Page 3+: Data Appendix (Searchable Table)
    if (data.selectedColumns && data.selectedColumns.length > 0) {
      pdf.addPage('a4', 'l'); // Add page in landscape orientation
      
      const landscapeWidth = pdf.internal.pageSize.getWidth();
      const landscapeMargin = 15;
      
      const selectedCols = AVAILABLE_COLUMNS.filter(c => data.selectedColumns.includes(c.id));
      const tableColumn = selectedCols.map(c => c.label);
      
      const tableRows = data.tableData.map((row: any, index: number) => {
        return selectedCols.map(col => {
          if (col.id === 'NOMOR') return String(index + 1);
          if (col.id === 'LINK BERITA') return String(row['LINK URL'] || row['URL'] || '-');
          let val = String(row[col.id] || '-');
          if (col.id === 'KAB/KOTA') {
            val = val.replace(/,/g, ', ');
          }
          return val;
        });
      });
      
      const columnStyles: any = {};
      selectedCols.forEach((col, index) => {
        if (col.id === 'NOMOR') columnStyles[index] = { cellWidth: 10, halign: 'center' };
        else if (col.id === 'TANGGAL') columnStyles[index] = { cellWidth: 25 };
        else if (col.id === 'NAMA MEDIA') columnStyles[index] = { cellWidth: 35 };
        else if (col.id === 'JUDUL') columnStyles[index] = { cellWidth: 'auto' };
        else if (col.id === 'KAB/KOTA') columnStyles[index] = { cellWidth: 40 };
        else if (col.id === 'SENTIMEN') columnStyles[index] = { cellWidth: 20 };
        else if (col.id === 'LINK BERITA') columnStyles[index] = { cellWidth: 50, overflow: 'hidden' };
      });
      
      const linkColIndex = selectedCols.findIndex(c => c.id === 'LINK BERITA');
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text('Lampiran: Rincian Data Berita', landscapeMargin, 20);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Periode: ${data.startDate} s/d ${data.endDate}`, landscapeMargin, 26);
      
      autoTable(pdf, {
        head: [tableColumn],
        body: tableRows,
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', overflow: 'linebreak' },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 20, left: landscapeMargin, right: landscapeMargin },
        columnStyles: columnStyles,
        didDrawCell: (data) => {
          // Add link functionality if it's the link column and has a valid URL
          if (data.section === 'body' && data.column.index === linkColIndex && data.cell.raw !== '-') {
            const url = String(data.cell.raw);
            if (url.startsWith('http')) {
              pdf.setTextColor(37, 99, 235); // blue-600
              pdf.textWithLink(url.substring(0, 30) + (url.length > 30 ? '...' : ''), data.cell.x + 2, data.cell.y + 5, { url: url });
            }
          }
        }
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
    <div className="bg-slate-50 p-0 text-gray-800 font-sans relative overflow-hidden" style={{ width: '1200px' }}>
      <div id="report-visuals" className="bg-slate-50 relative">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-900 to-slate-50 z-0"></div>
        
        <div className="relative z-10 p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-12 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl">
            <div className="flex items-center gap-6">
              <img src="https://smilingwestjava.jabarprov.go.id/ic-logo.svg" alt="Smiling West Java" className="w-24 h-24 drop-shadow-lg" />
              <div>
                <h1 className="text-5xl font-black text-white tracking-tight mb-2 drop-shadow-md">MEDIA INTELLIGENCE</h1>
                <h2 className="text-2xl font-bold text-blue-200 tracking-widest uppercase drop-shadow-md">Dinas Pariwisata & Kebudayaan Jawa Barat</h2>
              </div>
            </div>
            <div className="text-right bg-white/20 backdrop-blur-md p-6 rounded-2xl border border-white/30 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.2em] mb-2 text-blue-100">Periode Laporan</p>
              <p className="text-2xl font-black">{reportData.startDate} <span className="font-light mx-2 text-blue-300">|</span> {reportData.endDate}</p>
            </div>
          </div>

          {/* Executive Summary Stats */}
          <div className="grid grid-cols-4 gap-6 mb-12">
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-white/50 shadow-xl flex flex-col items-center text-center transform transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                <BarChart2 className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Berita</p>
              <p className="text-5xl font-black text-blue-900">{reportData.total}</p>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-white/50 shadow-xl flex flex-col items-center text-center transform transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                <PieChartIcon className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Positif</p>
              <p className="text-5xl font-black text-emerald-600">{reportData.positif}</p>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-white/50 shadow-xl flex flex-col items-center text-center transform transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                <PieChartIcon className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Netral</p>
              <p className="text-5xl font-black text-amber-600">{reportData.netral}</p>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-white/50 shadow-xl flex flex-col items-center text-center transform transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                <PieChartIcon className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Negatif</p>
              <p className="text-5xl font-black text-red-600">{reportData.negatif}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-10 mb-12">
            {/* Sentiment Chart */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl">
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
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl">
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
                {(reportData.topDestinations || []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#1E3A8A' : '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
      </div>

      {/* Heatmap Sebaran Wilayah */}
      <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-xl mb-12">
        <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-50 pb-6">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Peta Sebaran Berita Jawa Barat</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 h-[500px] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 relative">
            <MapContainer 
              center={[-6.9204, 107.6046]} 
              zoom={8} 
              className="h-full w-full"
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              attributionControl={false}
              preferCanvas={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {(reportData.mapData || []).map((loc: any, idx: number) => {
                const maxCount = Math.max(...(reportData.mapData || []).map((d: any) => d.count), 1);
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
                  />
                );
              })}
            </MapContainer>
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-gray-100 shadow-sm z-[1000]">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Intensitas Berita</p>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gradient-to-r from-yellow-400 to-red-600 rounded-full" />
                <span className="text-[10px] font-bold text-gray-600">Tinggi</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Daftar Wilayah Teratas</h4>
            {(reportData.allRegions || []).slice(0, 10).map((region: any, idx: number) => {
              const maxCount = reportData.allRegions && reportData.allRegions.length > 0 ? reportData.allRegions[0].count : 1;
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

      {/* Footer */}
      <div className="mt-12 border-t-2 border-gray-100 pt-8 flex justify-between items-center text-gray-400 text-xs font-bold uppercase tracking-widest">
        <p>Dihasilkan oleh Sistem Media Intelligence</p>
        <p>{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${step === 'review' ? 'max-w-4xl h-[90vh]' : step === 'motion' ? 'max-w-5xl h-[90vh] bg-black dark:bg-black' : 'max-w-md'} overflow-hidden flex flex-col transition-all duration-300 relative`}>
        {/* Loading Overlay */}
        {isGenerating && step === 'form' && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Membuat Laporan</h3>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center max-w-xs">
              {progressText}
            </p>
            <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-6 overflow-hidden">
              <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full animate-pulse w-full"></div>
            </div>
          </div>
        )}
        <div className={`flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 ${step === 'motion' ? 'bg-black text-white border-gray-800' : ''}`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${step === 'motion' ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
            <Activity className={`w-5 h-5 ${step === 'motion' ? 'text-blue-400' : 'text-blue-600 dark:text-blue-400'}`} /> 
            {step === 'form' ? 'Report Studio' : step === 'motion' ? 'Motion Story' : 'Review Laporan'}
          </h2>
          <button onClick={onClose} className={`${step === 'motion' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'} transition-colors`} disabled={isGenerating}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {step === 'form' ? (
          <>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              
              {/* Format Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Format Laporan</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setFormat('pdf')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${format === 'pdf' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                  >
                    <FileDown className="w-6 h-6" />
                    <span className="text-xs font-medium">PDF Eksekutif</span>
                  </button>
                  <button
                    onClick={() => setFormat('infographic')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${format === 'infographic' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-medium">Infografis (PNG)</span>
                  </button>
                  <button
                    onClick={() => setFormat('docx')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${format === 'docx' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                  >
                    <FileText className="w-6 h-6" />
                    <span className="text-xs font-medium">Word (Docs)</span>
                  </button>
                  <button
                    onClick={() => setFormat('pptx')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${format === 'pptx' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                  >
                    <Presentation className="w-6 h-6" />
                    <span className="text-xs font-medium">PowerPoint</span>
                  </button>
                  <button
                    onClick={() => setFormat('motion')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${format === 'motion' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                  >
                    <Video className="w-6 h-6" />
                    <span className="text-xs font-medium">Motion Story</span>
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tanggal Mulai</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tanggal Akhir</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI Focus */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fokus Analisis AI (Opsional)</label>
                <input 
                  type="text" 
                  value={aiFocus}
                  onChange={(e) => setAiFocus(e.target.value)}
                  placeholder="Misal: Fokus pada sentimen negatif terkait infrastruktur..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  disabled={isGenerating}
                />
              </div>

              {/* Options */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Opsi Tambahan</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setIncludeCharts(!includeCharts)}
                    disabled={isGenerating || format === 'infographic' || format === 'motion'}
                    className={`flex items-center gap-2 w-full p-2 rounded-lg border text-left text-sm transition-colors ${
                      includeCharts 
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${(format === 'infographic' || format === 'motion') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {includeCharts ? <CheckSquare className="w-4 h-4 flex-shrink-0" /> : <Square className="w-4 h-4 flex-shrink-0" />}
                    <span>Sertakan Grafik & Visualisasi</span>
                  </button>
                </div>
              </div>
              
              {/* Columns for PDF/Docs */}
              {(format === 'pdf' || format === 'docx') && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Lampiran Tabel Data (Opsional)</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Pilih kolom yang ingin dilampirkan sebagai tabel di halaman berikutnya.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_COLUMNS.map(col => (
                      <button
                        key={col.id}
                        onClick={() => toggleColumn(col.id)}
                        disabled={isGenerating}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-colors ${
                          selectedColumns.includes(col.id) 
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {selectedColumns.includes(col.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <button
                onClick={() => {
                  // Export CSV functionality
                  if (!startDate || !endDate) {
                    alert('Silakan pilih rentang tanggal terlebih dahulu.');
                    return;
                  }
                  const start = new Date(startDate);
                  start.setHours(0, 0, 0, 0);
                  const end = new Date(endDate);
                  end.setHours(23, 59, 59, 999);
                  const filteredData = data.filter(row => {
                    const rowDate = parseDate(row['TANGGAL'] || '');
                    return rowDate >= start && rowDate <= end;
                  });
                  if (filteredData.length === 0) {
                    alert('Tidak ada data.');
                    return;
                  }
                  const headers = Object.keys(filteredData[0]).join(',');
                  const csvContent = [
                    headers,
                    ...filteredData.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
                  ].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `Data_Mentah_${startDate}_${endDate}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                disabled={isGenerating || !startDate || !endDate}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download CSV</span>
              </button>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !startDate || !endDate}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
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
        ) : step === 'review' ? (
          <>
            {/* Review Step - Real PDF Viewer */}
            <div className="flex-1 bg-gray-200 dark:bg-gray-900 relative overflow-y-auto p-4 flex justify-center">
              {pdfUrl ? (
                <div className="shadow-2xl bg-white">
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Menampilkan PDF...</p>
                      </div>
                    }
                    error={
                      <div className="p-10 text-red-500 dark:text-red-400 text-center">
                        Gagal memuat pratinjau PDF. Silakan coba unduh langsung.
                      </div>
                    }
                  >
                    {Array.from(new Array(numPages), (el, index) => (
                      <Page 
                        key={`page_${index + 1}`} 
                        pageNumber={index + 1} 
                        width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 64 : 800)}
                        className="mb-4 last:mb-0"
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    ))}
                  </Document>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
                  <p className="font-medium">Memuat pratinjau PDF...</p>
                  <p className="text-sm">Jika pratinjau tidak muncul, Anda tetap dapat mengunduh PDF di bawah.</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <button 
                onClick={() => setStep('form')}
                disabled={isGenerating}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium text-sm transition-colors px-4 py-2"
              >
                Kembali
              </button>
              <button 
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
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
        ) : step === 'motion' && reportData ? (
          <div className="flex-1 bg-black/95 relative overflow-hidden flex flex-col items-center justify-center p-4">
            
            {/* Mobile Frame Container */}
            <div className="w-full max-w-[400px] aspect-[9/16] bg-slate-950 relative overflow-hidden flex flex-col rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[8px] border-gray-900">
              
              {/* Decorative Background */}
              <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[50%] bg-blue-600/30 blur-[80px] rounded-full pointer-events-none"></div>
              <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[50%] bg-emerald-600/20 blur-[80px] rounded-full pointer-events-none"></div>
              
              {/* Logo Header */}
              <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-[10px] tracking-widest leading-tight">SMILING WEST JAVA</span>
                  <span className="text-blue-400 text-[9px] leading-tight">Media Intelligence</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 hide-scrollbar relative z-10 snap-y snap-mandatory">
                
                {/* Intro Slide */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{ duration: 0.5 }}
                  className="h-full flex flex-col justify-center items-center text-center space-y-6 snap-center"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)]"
                  >
                    <Activity className="w-12 h-12 text-white" />
                  </motion.div>
                  <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
                    Laporan <br/> Analisis <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Strategis</span>
                  </h1>
                  <div className="bg-gray-900/80 px-4 py-2 rounded-full border border-gray-800">
                    <p className="text-sm text-gray-300 font-medium">{reportData.startDate} - {reportData.endDate}</p>
                  </div>
                  
                  <div className="absolute bottom-10 animate-bounce">
                    <p className="text-gray-500 text-xs mb-2">Scroll ke bawah</p>
                    <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center p-1 mx-auto">
                      <div className="w-1 h-2 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                </motion.div>

                {/* Stats Slide */}
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{ duration: 0.5 }}
                  className="h-full flex flex-col justify-center space-y-6 snap-center pt-12"
                >
                  <h2 className="text-2xl font-bold text-white text-center mb-4">Ringkasan Statistik</h2>
                  
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-blue-900/40 border border-blue-800/50 p-6 rounded-3xl text-center backdrop-blur-sm"
                  >
                    <p className="text-blue-300 font-medium mb-1 uppercase tracking-widest text-xs">Total Berita</p>
                    <p className="text-6xl font-black text-white">{reportData.total}</p>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-4">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-emerald-900/30 border border-emerald-800/50 p-4 rounded-2xl text-center backdrop-blur-sm"
                    >
                      <p className="text-emerald-400 text-xs font-bold uppercase mb-1">Positif</p>
                      <p className="text-3xl font-black text-white">{reportData.positif}</p>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-red-900/30 border border-red-800/50 p-4 rounded-2xl text-center backdrop-blur-sm"
                    >
                      <p className="text-red-400 text-xs font-bold uppercase mb-1">Negatif</p>
                      <p className="text-3xl font-black text-white">{reportData.negatif}</p>
                    </motion.div>
                  </div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-amber-900/30 border border-amber-800/50 p-4 rounded-2xl text-center backdrop-blur-sm mx-8"
                  >
                    <p className="text-amber-400 text-xs font-bold uppercase mb-1">Netral</p>
                    <p className="text-2xl font-black text-white">{reportData.netral}</p>
                  </motion.div>
                </motion.div>

                {/* AI Analysis Slide */}
                <motion.div 
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ duration: 0.5 }}
                  className="min-h-full flex flex-col justify-center space-y-6 snap-start pt-20 pb-10"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-900/50 p-2 rounded-lg">
                      <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Analisis AI</h2>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800 p-6 rounded-3xl backdrop-blur-sm prose prose-invert prose-sm max-w-none prose-p:text-gray-300 prose-headings:text-white prose-li:text-gray-300">
                    <Markdown>{reportData.aiContent}</Markdown>
                  </div>
                </motion.div>
              </div>
              
              {/* Fixed Bottom Bar inside mobile frame */}
              <div className="p-4 border-t border-gray-800 bg-slate-950/90 backdrop-blur-md flex justify-between items-center shrink-0 relative z-10">
                <button 
                  onClick={() => setStep('form')}
                  className="text-gray-400 hover:text-white font-medium text-xs transition-colors px-3 py-1.5 bg-gray-900 rounded-full"
                >
                  Tutup
                </button>
                <p className="text-gray-500 text-[10px]">Geser untuk melihat</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Hidden Report Templates for Generation */}
      {reportData && (
        <div style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -100 }}>
          
          {/* 1. PDF A4 Portrait Template (794px width) */}
          <div ref={pdfRef} className="bg-white" style={{ width: '794px', minHeight: '1123px', padding: '40px' }}>
            <div className="flex items-center gap-4 mb-8 border-b-4 border-blue-900 pb-4">
              <div className="w-16 h-16 bg-blue-900 rounded-xl flex items-center justify-center">
                <Activity className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tight">Laporan Eksekutif</h1>
                <p className="text-blue-600 font-bold tracking-widest">SMILING WEST JAVA - MEDIA INTELLIGENCE</p>
                <p className="text-gray-500 text-sm mt-1">Periode: {reportData.startDate} s/d {reportData.endDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-xl">
                <p className="text-gray-500 text-xs font-bold uppercase">Total Berita</p>
                <p className="text-3xl font-black text-blue-900">{reportData.total}</p>
              </div>
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl">
                <p className="text-gray-500 text-xs font-bold uppercase">Positif</p>
                <p className="text-3xl font-black text-emerald-600">{reportData.positif}</p>
              </div>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                <p className="text-gray-500 text-xs font-bold uppercase">Netral</p>
                <p className="text-3xl font-black text-amber-600">{reportData.netral}</p>
              </div>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                <p className="text-gray-500 text-xs font-bold uppercase">Negatif</p>
                <p className="text-3xl font-black text-red-600">{reportData.negatif}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-200 rounded-2xl p-4 bg-white">
                <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase text-center">Analisis Sentimen</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportData.sentimentData || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {(reportData.sentimentData || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="border border-gray-200 rounded-2xl p-4 bg-white">
                <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase text-center">Top 5 Destinasi</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(reportData.topDestinations || []).slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} width={80} />
                      <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                        <LabelList dataKey="count" position="right" fill="#64748b" fontSize={10} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-2xl p-4 bg-white">
              <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase">Daftar Wilayah Teratas</h3>
              <div className="grid grid-cols-2 gap-4">
                {(reportData.topRegions || []).slice(0, 10).map((region: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="text-sm font-medium text-gray-700">{region.name}</span>
                    <span className="text-sm font-bold text-blue-600">{region.count} Berita</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Infographic Template (9:16 Vertical - 1080x1920) */}
          <div ref={infographicRef} className="bg-slate-950 relative overflow-hidden flex flex-col" style={{ width: '1080px', height: '1920px', padding: '80px' }}>
            <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[40%] bg-blue-600/30 blur-[150px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[40%] bg-emerald-600/20 blur-[150px] rounded-full"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-16 border-b border-gray-800 pb-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                    <Activity className="w-14 h-14 text-white" />
                  </div>
                  <div>
                    <h1 className="text-5xl font-black text-white tracking-tight">MEDIA INTELLIGENCE</h1>
                    <p className="text-2xl text-blue-400 font-bold tracking-widest mt-2">SMILING WEST JAVA</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xl font-medium uppercase tracking-widest">Periode Laporan</p>
                  <p className="text-3xl font-bold text-white mt-2">{reportData.startDate} - {reportData.endDate}</p>
                </div>
              </div>

              {/* Big Stats */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-[40px] p-12 mb-12 backdrop-blur-sm">
                <p className="text-center text-gray-400 text-2xl font-bold uppercase tracking-widest mb-6">Total Publikasi Berita</p>
                <p className="text-center text-[120px] font-black text-white leading-none mb-12">{reportData.total}</p>
                
                <div className="grid grid-cols-3 gap-8">
                  <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-3xl p-8 text-center">
                    <p className="text-emerald-400 text-xl font-bold uppercase mb-2">Positif</p>
                    <p className="text-6xl font-black text-white">{reportData.positif}</p>
                  </div>
                  <div className="bg-amber-900/30 border border-amber-800/50 rounded-3xl p-8 text-center">
                    <p className="text-amber-400 text-xl font-bold uppercase mb-2">Netral</p>
                    <p className="text-6xl font-black text-white">{reportData.netral}</p>
                  </div>
                  <div className="bg-red-900/30 border border-red-800/50 rounded-3xl p-8 text-center">
                    <p className="text-red-400 text-xl font-bold uppercase mb-2">Negatif</p>
                    <p className="text-6xl font-black text-white">{reportData.negatif}</p>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-12 mb-12 flex-1">
                <div className="bg-gray-900/60 border border-gray-800 rounded-[40px] p-10 backdrop-blur-sm flex flex-col">
                  <h3 className="text-2xl font-bold text-white mb-8 text-center">Sentimen Publik</h3>
                  <div className="flex-1 min-h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reportData.sentimentData || []} cx="50%" cy="50%" innerRadius={100} outerRadius={160} paddingAngle={5} dataKey="value">
                          {(reportData.sentimentData || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={60} iconSize={24} wrapperStyle={{ fontSize: '20px', color: 'white' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-gray-900/60 border border-gray-800 rounded-[40px] p-10 backdrop-blur-sm flex flex-col">
                  <h3 className="text-2xl font-bold text-white mb-8 text-center">Top 5 Destinasi</h3>
                  <div className="flex-1 min-h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(reportData.topDestinations || []).slice(0, 5)} layout="vertical" margin={{ top: 0, right: 50, left: 60, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 18 }} width={120} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={40}>
                          <LabelList dataKey="count" position="right" fill="#ffffff" fontSize={20} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* AI Summary Snippet */}
              <div className="bg-blue-900/40 border border-blue-800/50 rounded-[40px] p-10 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-6">
                  <Activity className="w-8 h-8 text-blue-400" />
                  <h3 className="text-2xl font-bold text-white">Insight Strategis</h3>
                </div>
                <p className="text-blue-100 text-2xl leading-relaxed line-clamp-4">
                  {reportData.aiContent.replace(/#/g, '').replace(/\*/g, '').split('\n').filter((l: string) => l.trim().length > 20)[0] || "Analisis sentimen menunjukkan tren positif pada pariwisata Jawa Barat."}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-8 flex justify-between items-center border-t border-gray-800">
                <p className="text-gray-500 text-xl font-bold tracking-widest">@smilingwestjava</p>
                <p className="text-gray-500 text-xl font-bold">disparbud.jabarprov.go.id</p>
              </div>
            </div>
          </div>

          {/* Keep the original report template for the web UI preview if needed, or we can just use the new ones */}
          <div ref={reportRef} className="bg-white" style={{ width: '1200px' }}>
            {renderReportContent()}
          </div>
        </div>
      )}
    </div>
  );
}
