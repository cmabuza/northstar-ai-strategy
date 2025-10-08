import { jsPDF } from "jspdf";

interface ExportData {
  okr: string;
  productType: string;
  features: any[];
  implementation: any;
}

export const exportToJSON = (data: ExportData) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadFile(blob, `strategy-${getTimestamp()}.json`);
};

export const exportToCSV = (data: ExportData) => {
  const rows: string[][] = [];
  
  // Header
  rows.push(['Section', 'Field', 'Value']);
  
  // OKR Section
  rows.push(['OKR', 'Objective', data.okr]);
  rows.push(['OKR', 'Product Type', data.productType]);
  
  // Features Section
  data.features?.forEach((feature, idx) => {
    rows.push([`Feature ${idx + 1}`, 'Title', feature.title]);
    rows.push([`Feature ${idx + 1}`, 'Description', feature.description]);
    rows.push([`Feature ${idx + 1}`, 'Impact', feature.impact]);
    rows.push([`Feature ${idx + 1}`, 'Effort', feature.effort]);
    
    // KPIs for this feature
    feature.kpis?.forEach((kpi: any, kpiIdx: number) => {
      rows.push([`Feature ${idx + 1} - KPI ${kpiIdx + 1}`, 'Name', kpi.name]);
      rows.push([`Feature ${idx + 1} - KPI ${kpiIdx + 1}`, 'Description', kpi.description]);
      rows.push([`Feature ${idx + 1} - KPI ${kpiIdx + 1}`, 'Selected', kpi.selected ? 'Yes' : 'No']);
    });
  });
  
  // Implementation Section
  if (data.implementation) {
    rows.push(['Implementation', 'Steps', JSON.stringify(data.implementation.steps || [])]);
    rows.push(['Implementation', 'Timeline', data.implementation.timeline || 'N/A']);
  }
  
  const csvContent = rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `strategy-${getTimestamp()}.csv`);
};

export const exportToPDF = (data: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = 20;
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(82, 176, 231); // Primary brand color
  doc.text('North Star Nav Strategy', margin, yPosition);
  yPosition += 15;
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 15;
  
  // OKR Section
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 61); // Dark brand color
  doc.text('Objective & Key Results', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  const okrLines = doc.splitTextToSize(data.okr, maxWidth);
  doc.text(okrLines, margin, yPosition);
  yPosition += okrLines.length * 5 + 10;
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Product Type: ${data.productType}`, margin, yPosition);
  yPosition += 15;
  
  // Features Section
  data.features?.forEach((feature, idx) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 61);
    doc.text(`Feature ${idx + 1}: ${feature.title}`, margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const descLines = doc.splitTextToSize(feature.description, maxWidth);
    doc.text(descLines, margin, yPosition);
    yPosition += descLines.length * 5 + 5;
    
    doc.setTextColor(100, 100, 100);
    doc.text(`Impact: ${feature.impact} | Effort: ${feature.effort}`, margin, yPosition);
    yPosition += 10;
    
    // KPIs
    if (feature.kpis && feature.kpis.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(82, 176, 231);
      doc.text('Key Performance Indicators:', margin, yPosition);
      yPosition += 7;
      
      feature.kpis.forEach((kpi: any) => {
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.text(`• ${kpi.name}`, margin + 5, yPosition);
        yPosition += 5;
        
        const kpiDescLines = doc.splitTextToSize(kpi.description, maxWidth - 10);
        doc.setTextColor(100, 100, 100);
        doc.text(kpiDescLines, margin + 10, yPosition);
        yPosition += kpiDescLines.length * 5 + 3;
      });
      
      yPosition += 5;
    }
    
    yPosition += 5;
  });
  
  // Implementation
  if (data.implementation && yPosition < 250) {
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 61);
    doc.text('Implementation Plan', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('See JSON export for detailed implementation steps', margin, yPosition);
  }
  
  doc.save(`strategy-${getTimestamp()}.pdf`);
};

const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const getTimestamp = () => {
  return new Date().toISOString().split('T')[0];
};
