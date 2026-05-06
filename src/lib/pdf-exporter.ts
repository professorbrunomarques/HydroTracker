import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Unit, ReportMetadata } from '../types';

export function generateUnitTicket(metadata: ReportMetadata, unit: Unit) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // A5 is better for individual tickets
  });

  // Header Box
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, 148, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(metadata.condominium || 'Stories Residence', 10, 12);
  
  doc.setFontSize(8);
  doc.text(`Mês de Referência: ${metadata.referenceMonth || 'N/A'}`, 10, 22);
  doc.text(metadata.address || '', 10, 26);

  // Body
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Comprovante de Consumo - Unidade ${unit.unit}`, 10, 45);

  autoTable(doc, {
    startY: 55,
    head: [['Descrição', 'Valor']],
    body: [
      ['Unidade', unit.unit],
      ['Leitura Anterior', unit.previousReading.toFixed(2)],
      ['Leitura Atual', unit.currentReading.toFixed(2)],
      ['Consumo (m³)', `${unit.consumption.toFixed(2)} m³`],
      ['Vlr. Faixa 1 (até 15m³)', `R$ ${unit.tier1Value.toFixed(2)}`],
      ['Vlr. Faixa 2 (>15m³)', `R$ ${unit.tier2Value.toFixed(2)}`],
    ],
    theme: 'striped',
    margin: { left: 10, right: 10 },
  });

  // Total Box
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Tabela de Tarifas Info
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Regras de Cobrança:', 10, finalY);
  doc.text('- Até 15 m³: R$ 14,82 por m³', 10, finalY + 4);
  doc.text('- Acima de 15 m³: R$ 32,62 por m³ (excedente)', 10, finalY + 8);

  const totalBoxY = finalY + 12;
  doc.setFillColor(245, 245, 245);
  doc.rect(10, totalBoxY, 128, 20, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('TOTAL A PAGAR:', 15, totalBoxY + 12);
  doc.text(`R$ ${unit.value.toFixed(2)}`, 128, totalBoxY + 12, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Este documento é um informativo de consumo individual.', 74, 200, { align: 'center' });

  doc.save(`Recibo_Unidade_${unit.unit}_${metadata.referenceMonth || 'Stories'}.pdf`);
}

export function generatePdfReport(metadata: ReportMetadata, units: Unit[]) {
  const doc = new jsPDF();
  const totalConsumption = units.reduce((acc, unit) => acc + unit.consumption, 0);
  const totalValue = units.reduce((acc, unit) => acc + unit.value, 0);

  // Header
  doc.setFontSize(20);
  doc.text(metadata.condominium || 'Relatório de Consumo de Água', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(metadata.address || '', 14, 30);
  doc.text(`Mês de Referência: ${metadata.referenceMonth || 'N/A'}`, 14, 35);
  
  doc.setDrawColor(200);
  doc.line(14, 40, 196, 40);

  // Summary
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Resumo Geral:', 14, 48);
  
  doc.setFontSize(9);
  doc.text(`Total de Unidades: ${units.length}`, 14, 54);
  doc.text(`Consumo Total: ${totalConsumption.toFixed(2)} m³`, 60, 54);
  doc.text(`Valor Total: R$ ${totalValue.toFixed(2)}`, 110, 54);
  
  // Rule info in report
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Tarifas: Até 15m³ = R$ 14,82/m³ | >15m³ = R$ 32,62/m³', 14, 59);

  // Table
  const tableData = units.map(u => [
    u.unit,
    u.previousReading.toFixed(2),
    u.currentReading.toFixed(2),
    u.consumption.toFixed(2),
    `R$ ${u.value.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 65,
    head: [['Unidade', 'L. Anterior', 'L. Atual', 'Consumo (m³)', 'Valor (R$)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`Relatório_Consumo_${metadata.referenceMonth || 'Stories'}.pdf`);
}
