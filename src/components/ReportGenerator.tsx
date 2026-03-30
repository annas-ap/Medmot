import React, { useState, useRef } from 'react';
import { X, FileDown, Loader2, Calendar } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Markdown from 'react-markdown';

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
  
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      alert('Silakan pilih rentang tanggal terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
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

      // 2. Call AI for Analysis and Recommendations
      setProgressText('Menyusun analisis dengan AI...');
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Anda adalah analis media intelijen senior untuk Dinas Pariwisata Jawa Barat.
        Buatkan laporan eksekutif berdasarkan data pemberitaan berikut:
        
        Rentang Waktu: ${startDate} hingga ${endDate}
        Total Berita: ${filteredData.length}
        Sentimen: Positif (${positif}), Netral (${netral}), Negatif (${negatif})
        Top 5 Destinasi yang dibahas: ${topDestinations.map(d => `${d.name} (${d.count})`).join(', ')}
        Top 5 Media yang memberitakan: ${topMedia.map(m => `${m.name} (${m.count})`).join(', ')}
        
        Berdasarkan data di atas, berikan 2 hal berikut dalam format Markdown:
        1. Rincian Analisis (Analisis tren sentimen, fokus pemberitaan, dan peran media).
        2. Rekomendasi Kebijakan (Langkah strategis yang harus diambil oleh Dinas Pariwisata Jawa Barat).
        
        Tulis dengan bahasa Indonesia yang profesional, ringkas, dan langsung pada intinya.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      const aiContent = response.text || 'Gagal menghasilkan analisis.';

      // Set data for rendering
      setReportData({
        startDate,
        endDate,
        total: filteredData.length,
        positif,
        netral,
        negatif,
        topDestinations,
        topMedia,
        aiContent
      });

      setProgressText('Menyiapkan dokumen PDF...');
      
      // Wait for React to render the hidden report
      setTimeout(async () => {
        if (reportRef.current) {
          try {
            const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Laporan_Media_Intelijen_${startDate}_${endDate}.pdf`);
          } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Terjadi kesalahan saat membuat PDF.');
          }
        }
        setIsGenerating(false);
        setReportData(null);
        onClose();
      }, 1000); // Give it a second to render

    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan saat memproses laporan.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileDown className="w-5 h-5 text-blue-600" /> Generate Laporan PDF
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isGenerating}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
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
                Generate PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden Report Template for PDF Generation */}
      {reportData && (
        <div className="fixed top-0 left-0 w-[794px] bg-white text-black -z-50" style={{ left: '-9999px' }}>
          <div ref={reportRef} className="p-10 bg-white" style={{ width: '794px', minHeight: '1123px' }}>
            {/* Header */}
            <div className="border-b-2 border-blue-900 pb-6 mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-extrabold text-blue-900 mb-2">Laporan Media Intelligence</h1>
                <h2 className="text-xl font-bold text-gray-700">Dinas Pariwisata Jawa Barat</h2>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-500">Periode Laporan:</p>
                <p className="text-base font-bold text-gray-800">{reportData.startDate} s/d {reportData.endDate}</p>
              </div>
            </div>

            {/* Executive Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase">Total Berita</p>
                <p className="text-2xl font-black text-blue-900">{reportData.total}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <p className="text-xs font-bold text-green-600 uppercase">Positif</p>
                <p className="text-2xl font-black text-green-900">{reportData.positif}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                <p className="text-xs font-bold text-yellow-600 uppercase">Netral</p>
                <p className="text-2xl font-black text-yellow-900">{reportData.netral}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-xs font-bold text-red-600 uppercase">Negatif</p>
                <p className="text-2xl font-black text-red-900">{reportData.negatif}</p>
              </div>
            </div>

            {/* Top Lists */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3 uppercase">Top 5 Destinasi</h3>
                <ul className="space-y-2">
                  {reportData.topDestinations.map((d: any, i: number) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{d.name}</span>
                      <span className="font-bold text-gray-900">{d.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3 uppercase">Top 5 Media</h3>
                <ul className="space-y-2">
                  {reportData.topMedia.map((m: any, i: number) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{m.name}</span>
                      <span className="font-bold text-gray-900">{m.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Analysis & Recommendations */}
            <div className="prose prose-sm max-w-none prose-blue prose-headings:text-blue-900 prose-headings:font-bold">
              <div className="markdown-body">
                <Markdown>{reportData.aiContent}</Markdown>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
              Dokumen ini dihasilkan secara otomatis oleh AI Studio Media Intelligence System pada {new Date().toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
