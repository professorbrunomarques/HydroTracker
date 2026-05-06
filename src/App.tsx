import React, { useState, useMemo } from 'react';
import { Upload, FileText, Search, Download, AlertTriangle, CheckCircle2, Loader2, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractTextFromPdf } from './lib/pdf-parser';
import { generatePdfReport, generateUnitTicket } from './lib/pdf-exporter';
import { extractDataFromText } from './services/gemini';
import { Unit, ReportMetadata, TARIFF_RULES } from './types';

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<{ metadata: ReportMetadata; units: Unit[] } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getConsumptionBreakdown = (consumption: number) => {
    if (consumption <= 0) return { total: 0, tier1: 0, tier2: 0 };
    
    let tier1 = 0;
    let tier2 = 0;

    if (consumption <= TARIFF_RULES.LOW_TIER_LIMIT) {
      tier1 = consumption * TARIFF_RULES.LOW_TIER_PRICE;
    } else {
      tier1 = TARIFF_RULES.LOW_TIER_LIMIT * TARIFF_RULES.LOW_TIER_PRICE;
      tier2 = (consumption - TARIFF_RULES.LOW_TIER_LIMIT) * TARIFF_RULES.HIGH_TIER_PRICE;
    }

    return {
      total: tier1 + tier2,
      tier1,
      tier2
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const text = await extractTextFromPdf(file);
      const rawData = await extractDataFromText(text);
      
      if (!rawData || !rawData.units || rawData.units.length === 0) {
        throw new Error('Não foi possível extrair dados válidos deste PDF. O formato pode ser incompatível.');
      }
      
      // Process units to calculate consumption and value
      const processedUnits = rawData.units.map((u: any) => {
        const consumption = Math.max(0, u.currentReading - u.previousReading);
        const breakdown = getConsumptionBreakdown(consumption);
        return {
          ...u,
          consumption,
          value: breakdown.total,
          tier1Value: breakdown.tier1,
          tier2Value: breakdown.tier2,
        };
      });

      setData({
        metadata: rawData.metadata,
        units: processedUnits,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUnits = useMemo(() => {
    if (!data) return [];
    return data.units.filter(u => 
      u.unit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const stats = useMemo(() => {
    if (!data) return null;
    const totalConsumption = data.units.reduce((acc, u) => acc + u.consumption, 0);
    const totalValue = data.units.reduce((acc, u) => acc + u.value, 0);
    const highConsumptionCount = data.units.filter(u => u.consumption > 20).length;
    return { totalConsumption, totalValue, highConsumptionCount };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Droplets className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">HydroTracker</h1>
          </div>
          {data && (
            <button
              onClick={() => generatePdfReport(data.metadata, data.units)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              id="btn-export"
            >
              <Download className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        <AnimatePresence mode="wait">
          {!data ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center pt-10"
            >
              <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Upload de Planilha</h2>
                <p className="text-slate-500 mb-8 px-4">
                  Selecione o PDF original do consumo de água do Stories Residence para análise.
                </p>

                <div className="flex flex-col gap-4">
                  <label className="block w-full cursor-pointer">
                    <span className="sr-only">Escolher arquivo</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={isProcessing}
                      className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-3 file:px-6
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-600 file:text-white
                        hover:file:bg-blue-700
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    />
                  </label>

                  <button
                    onClick={() => {
                      const sampleData = {
                        metadata: {
                          condominium: "Stories Residence",
                          address: "Av. Principal, 1234 - Rio de Janeiro, RJ",
                          referenceMonth: "Maio/2026"
                        },
                        units: [
                          { unit: "1-101", previousReading: 120, currentReading: 135 },
                          { unit: "1-102", previousReading: 145, currentReading: 172 },
                          { unit: "1-201", previousReading: 110, currentReading: 110 },
                          { unit: "2-305", previousReading: 890, currentReading: 915 },
                          { unit: "2-401", previousReading: 450, currentReading: 462 }
                        ]
                      };
                      
                      const processedUnits = sampleData.units.map((u: any) => {
                        const consumption = Math.max(0, u.currentReading - u.previousReading);
                        const breakdown = getConsumptionBreakdown(consumption);
                        return {
                          ...u,
                          consumption,
                          value: breakdown.total,
                          tier1Value: breakdown.tier1,
                          tier2Value: breakdown.tier2,
                        };
                      });

                      setData({
                        metadata: sampleData.metadata,
                        units: processedUnits,
                      });
                    }}
                    disabled={isProcessing}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors py-2"
                  >
                    Ou usar dados de exemplo para testar
                  </button>
                </div>

                {isProcessing && (
                  <div className="mt-8 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-blue-600 font-medium animate-pulse">
                      Lendo dados com Inteligência Artificial...
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Consumo Total</p>
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-bold text-slate-900">{stats?.totalConsumption.toFixed(2)}</p>
                    <span className="text-slate-500 mb-1 font-medium italic">m³</span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-blue-600">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Valor Total</p>
                  <p className="text-3xl font-bold text-slate-900">R$ {stats?.totalValue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Alertas ({'>'}20m³)</p>
                  <p className="text-3xl font-bold text-slate-900">{stats?.highConsumptionCount}</p>
                </div>
              </div>

              {/* Condominium Info */}
              <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{data.metadata.condominium}</h2>
                    <p className="text-blue-100 text-sm">{data.metadata.address}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 inline-block">
                    <span className="text-xs font-medium uppercase opacity-80 block">Referência</span>
                    <span className="font-bold">{data.metadata.referenceMonth}</span>
                  </div>
                </div>
              </div>

              {/* Search and List */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar unidade (ex: 101)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUnits.map((u, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={u.unit}
                      className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between group ${
                        u.consumption > 20 ? 'border-orange-200 bg-orange-50/30' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Unidade</span>
                          <h3 className="text-xl font-bold text-slate-900">{u.unit}</h3>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {u.consumption > 20 && (
                            <div className="bg-orange-100 text-orange-700 p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-bold uppercase">
                              <AlertTriangle className="w-3 h-3" />
                              Consumo Alto
                            </div>
                          )}
                          {u.consumption <= 20 && u.consumption > 0 && (
                            <div className="bg-green-100 text-green-700 p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-bold uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              Normal
                            </div>
                          )}
                          <button
                            onClick={() => generateUnitTicket(data.metadata, u)}
                            className="bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 p-2 rounded-xl transition-colors md:opacity-0 group-hover:opacity-100"
                            title="Exportar Comprovante"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Consumo</p>
                          <p className="text-lg font-bold text-slate-900">
                            {u.consumption.toFixed(2)} <span className="text-xs font-medium text-slate-500">m³</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Valor</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {u.value.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                          <span>Faixa 1 (até 15m³)</span>
                          <span>R$ {u.tier1Value.toFixed(2)}</span>
                        </div>
                        {u.tier2Value > 0 && (
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>Faixa 2 (excedente)</span>
                            <span>R$ {u.tier2Value.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1 pt-1 border-t border-slate-200 uppercase">
                          <span>L. Anterior: {u.previousReading.toFixed(2)}</span>
                          <span>L. Atual: {u.currentReading.toFixed(2)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filteredUnits.length === 0 && (
                  <div className="text-center py-12 bg-slate-100 rounded-3xl border border-dashed border-slate-300">
                    <p className="text-slate-500">Nenhuma unidade encontrada.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setData(null);
                    setSearchTerm('');
                  }}
                  className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors py-2 px-4"
                >
                  Fazer upload de outro arquivo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
