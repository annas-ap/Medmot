import React from 'react';
import { Document as PdfDocument, Page as PdfPage, Text as PdfText, View as PdfView, StyleSheet as PdfStyleSheet } from '@react-pdf/renderer';

const pdfStyles = PdfStyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { fontSize: 10, color: '#9CA3AF', marginBottom: 20, textAlign: 'right', borderBottom: '1px solid #E5E7EB', paddingBottom: 10 },
  footer: { fontSize: 10, color: '#9CA3AF', marginTop: 20, textAlign: 'center', borderTop: '1px solid #E5E7EB', paddingTop: 10, position: 'absolute', bottom: 30, left: 40, right: 40 },
  coverTitle: { fontSize: 28, color: '#1E3A8A', textAlign: 'center', marginTop: 100, fontWeight: 'bold' },
  coverSubtitle: { fontSize: 16, color: '#4B5563', textAlign: 'center', marginTop: 20 },
  coverPeriod: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 40 },
  sectionTitle: { fontSize: 18, color: '#1E3A8A', marginTop: 30, marginBottom: 15, borderBottom: '2px solid #1E3A8A', paddingBottom: 5, fontWeight: 'bold' },
  text: { fontSize: 11, color: '#374151', lineHeight: 1.6, marginBottom: 10 },
  table: { display: 'flex', flexDirection: 'column', marginTop: 10, borderTop: '1px solid #E5E7EB', borderLeft: '1px solid #E5E7EB' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #E5E7EB' },
  tableHeader: { backgroundColor: '#F3F4F6', padding: 8, borderRight: '1px solid #E5E7EB', fontSize: 10, fontWeight: 'bold', color: '#111827' },
  tableCell: { padding: 8, borderRight: '1px solid #E5E7EB', fontSize: 10, color: '#374151' },
  col1: { width: '10%' },
  col2: { width: '50%' },
  col3: { width: '20%' },
  col4: { width: '20%' },
  metricBox: { padding: 15, backgroundColor: '#F3F4F6', borderRadius: 5, marginBottom: 10, width: '30%' },
  metricValue: { fontSize: 24, color: '#1E3A8A', fontWeight: 'bold' },
  metricLabel: { fontSize: 10, color: '#6B7280' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  newsItem: { marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid #E5E7EB' },
  newsTitle: { fontSize: 12, fontWeight: 'bold', color: '#111827', marginBottom: 5 },
  newsMeta: { fontSize: 9, color: '#6B7280', marginBottom: 5 },
  newsContent: { fontSize: 10, color: '#4B5563', lineHeight: 1.5 }
});

export const ReportPDF = ({ components, reportTitle, reportSubtitle, reportPeriod, execSummary1, execSummary2, posSummary, negSummary, recommendations, totalBerita, pctPos, pctNeg, topDestinations, topMedia, recentNews }: any) => (
  <PdfDocument>
    {/* Cover Page */}
    {components.cover && (
      <PdfPage size="A4" style={pdfStyles.page}>
        <PdfText style={pdfStyles.coverTitle}>{reportTitle}</PdfText>
        <PdfText style={pdfStyles.coverSubtitle}>{reportSubtitle}</PdfText>
        <PdfText style={pdfStyles.coverPeriod}>Periode: {reportPeriod}</PdfText>
        
        <PdfView style={pdfStyles.metricRow}>
          <PdfView style={pdfStyles.metricBox}>
            <PdfText style={pdfStyles.metricLabel}>Total Berita</PdfText>
            <PdfText style={pdfStyles.metricValue}>{totalBerita}</PdfText>
          </PdfView>
          <PdfView style={pdfStyles.metricBox}>
            <PdfText style={pdfStyles.metricLabel}>Sentimen Positif</PdfText>
            <PdfText style={{...pdfStyles.metricValue, color: '#10B981'}}>{pctPos}%</PdfText>
          </PdfView>
          <PdfView style={pdfStyles.metricBox}>
            <PdfText style={pdfStyles.metricLabel}>Sentimen Negatif</PdfText>
            <PdfText style={{...pdfStyles.metricValue, color: '#EF4444'}}>{pctNeg}%</PdfText>
          </PdfView>
        </PdfView>
      </PdfPage>
    )}

    {/* Content Pages */}
    <PdfPage size="A4" style={pdfStyles.page}>
      <PdfText style={pdfStyles.header}>Laporan Digital News Monitoring SWJ</PdfText>

      {components.execSummary && (
        <PdfView>
          <PdfText style={pdfStyles.sectionTitle}>1. Ringkasan Eksekutif</PdfText>
          <PdfText style={pdfStyles.text}>{execSummary1}</PdfText>
          <PdfText style={pdfStyles.text}>{execSummary2}</PdfText>
          <PdfText style={pdfStyles.text}>{posSummary}</PdfText>
          <PdfText style={pdfStyles.text}>{negSummary}</PdfText>
        </PdfView>
      )}

      {components.destinations && (
        <PdfView>
          <PdfText style={pdfStyles.sectionTitle}>2. Top Destinasi Wisata</PdfText>
          <PdfView style={pdfStyles.table}>
            <PdfView style={pdfStyles.tableRow}>
              <PdfText style={[pdfStyles.tableHeader, pdfStyles.col1]}>No</PdfText>
              <PdfText style={[pdfStyles.tableHeader, pdfStyles.col2]}>Destinasi</PdfText>
              <PdfText style={[pdfStyles.tableHeader, pdfStyles.col3]}>Total Berita</PdfText>
              <PdfText style={[pdfStyles.tableHeader, pdfStyles.col4]}>Sentimen</PdfText>
            </PdfView>
            {topDestinations.slice(0, 10).map((dest: any, i: number) => (
              <PdfView style={pdfStyles.tableRow} key={i}>
                <PdfText style={[pdfStyles.tableCell, pdfStyles.col1]}>{i + 1}</PdfText>
                <PdfText style={[pdfStyles.tableCell, pdfStyles.col2]}>{dest.name}</PdfText>
                <PdfText style={[pdfStyles.tableCell, pdfStyles.col3]}>{dest.count}</PdfText>
                <PdfText style={[pdfStyles.tableCell, pdfStyles.col4]}>{dest.sentiment}</PdfText>
              </PdfView>
            ))}
          </PdfView>
        </PdfView>
      )}

      {components.media && (
        <PdfView>
          <PdfText style={pdfStyles.sectionTitle}>3. Sumber Media Terbanyak</PdfText>
          <PdfView style={pdfStyles.table}>
            <PdfView style={pdfStyles.tableRow}>
              <PdfText style={[pdfStyles.tableHeader, pdfStyles.col1]}>No</PdfText>
              <PdfText style={[pdfStyles.tableHeader, pdfStyles.col2]}>Nama Media</PdfText>
              <PdfText style={[pdfStyles.tableHeader, pdfStyles.col3]}>Jumlah Berita</PdfText>
            </PdfView>
            {topMedia.list.slice(0, 10).map((media: any, i: number) => (
              <PdfView style={pdfStyles.tableRow} key={i}>
                <PdfText style={[pdfStyles.tableCell, pdfStyles.col1]}>{i + 1}</PdfText>
                <PdfText style={[pdfStyles.tableCell, pdfStyles.col2]}>{media.name}</PdfText>
                <PdfText style={[pdfStyles.tableCell, pdfStyles.col3]}>{media.count}</PdfText>
              </PdfView>
            ))}
          </PdfView>
        </PdfView>
      )}

      {components.recommendations && (
        <PdfView>
          <PdfText style={pdfStyles.sectionTitle}>4. Rekomendasi Strategis</PdfText>
          <PdfText style={pdfStyles.text}>{recommendations}</PdfText>
        </PdfView>
      )}

      <PdfText style={pdfStyles.footer} render={({ pageNumber, totalPages }) => (
        `Media Intelligence 209 • Hal ${pageNumber} dari ${totalPages}`
      )} fixed />
    </PdfPage>

    {/* News Attachment Page */}
    {components.newsAttachment && (
      <PdfPage size="A4" style={pdfStyles.page}>
        <PdfText style={pdfStyles.header}>Laporan Digital News Monitoring SWJ</PdfText>
        <PdfText style={pdfStyles.sectionTitle}>Lampiran Berita Terbaru</PdfText>
        {recentNews.slice(0, 20).map((news: any, i: number) => (
          <PdfView style={pdfStyles.newsItem} key={i} wrap={false}>
            <PdfText style={pdfStyles.newsTitle}>{news.judul}</PdfText>
            <PdfText style={pdfStyles.newsMeta}>{news.tanggal} • {news.media} • Sentimen: {news.sentimen}</PdfText>
            <PdfText style={pdfStyles.newsContent}>{news.isi.substring(0, 300)}...</PdfText>
          </PdfView>
        ))}
        <PdfText style={pdfStyles.footer} render={({ pageNumber, totalPages }) => (
          `Media Intelligence 209 • Hal ${pageNumber} dari ${totalPages}`
        )} fixed />
      </PdfPage>
    )}
  </PdfDocument>
);
