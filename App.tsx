
import React, { useState, useRef, useMemo } from 'react';
import { analyzeReviews } from './services/geminiService';
import { AnalysisResult } from './types';
import SentimentChart from './components/SentimentChart';
import WordCloud from './components/WordCloud';
import ChatBot from './components/ChatBot';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SAMPLE_REVIEWS = `2024-10-01: The product is amazing! Fast delivery and great quality.
2024-10-03: I had some issues with the customer support, they were quite slow to respond.
2024-10-05: Best purchase of the year. I love the new interface.
2024-10-07: The price is a bit high compared to competitors, but the build quality justifies it.
2024-10-10: Shipping took 2 weeks longer than expected. Very frustrating.
2024-10-12: The mobile app keeps crashing after the latest update. Fix it!
2024-10-15: Really helpful onboarding process. I was up and running in minutes.
2024-10-18: I miss some of the older features that were removed recently.
2024-10-20: Fantastic customer service! They solved my issue within an hour.
2024-10-22: The documentation is a bit outdated and hard to follow.`;

const App: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Helper to convert -1..1 to 0..100
  const normalize = (val: number) => (val + 1) * 50;

  // Memoize the normalized data for the chart and UI
  const normalizedReport = useMemo(() => {
    if (!report) return null;
    return {
      ...report,
      sentimentTrend: report.sentimentTrend.map(p => ({
        ...p,
        score: normalize(p.score)
      })),
      overallStats: {
        ...report.overallStats,
        averageScore: normalize(report.overallStats.averageScore)
      }
    };
  }, [report]);

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyzeReviews(rawText);
      setReport(data);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to analyze data. Please check your API key and try again.";
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const useSampleData = () => {
    setRawText(SAMPLE_REVIEWS);
  };

  const handleExportCSV = () => {
    if (!normalizedReport) return;

    const headers = ["Date", "Score (0-100)", "Label", "Summary", "Actionable Items"];
    const actionableStr = normalizedReport.actionableItems.map(item => `${item.title}: ${item.description} (${item.impact} impact)`).join('; ');

    const rows = normalizedReport.sentimentTrend.map(point => [
      point.date,
      point.score.toFixed(1),
      point.label,
      `"${normalizedReport.summary.replace(/"/g, '""')}"`,
      `"${actionableStr.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add BOM (\uFEFF) to ensure Excel opens UTF-8 files correctly with Traditional Chinese
    const blob = new Blob(["\uFEFF", csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sentiment-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    setIsLoading(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const contentWidth = pdfWidth - (2 * margin);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - contentHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`sentiment-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <i className="fas fa-chart-line text-white"></i>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sentilyser<span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Redundant header buttons removed for UI cleanup */}
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <i className="fas fa-user text-xs"></i>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {!normalizedReport ? (
          <div className="max-w-3xl mx-auto text-center py-12">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Turn Feedback into Intelligence</h2>
            <p className="text-slate-600 mb-8 text-lg">Paste your customer reviews below to generate a deep-dive sentiment report powered by Gemini 3 Pro Reasoning.</p>

            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 text-left">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Customer Reviews (Text Batch)</label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="E.g. 2024-11-01: Great product!..."
                className="w-full h-64 p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none mb-4"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading || !rawText.trim()}
                  className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><i className="fas fa-circle-notch animate-spin"></i> Analyzing...</>
                  ) : (
                    <><i className="fas fa-wand-magic-sparkles"></i> Generate Report</>
                  )}
                </button>
                <button
                  onClick={useSampleData}
                  className="bg-slate-100 text-slate-600 font-semibold py-3 px-6 rounded-xl hover:bg-slate-200 transition-all"
                >
                  Try Sample Data
                </button>
              </div>
              {error && <p className="mt-4 text-rose-600 text-sm flex items-center gap-2"><i className="fas fa-exclamation-circle"></i> {error}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Executive Dashboard</h2>
                <p className="text-slate-500 text-sm">Generated on {new Date().toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <button
                  onClick={handleExportPDF}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg font-bold text-sm"
                >
                  <i className="fas fa-file-pdf"></i>
                  Download PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-semibold text-sm"
                >
                  <i className="fas fa-file-csv"></i>
                  CSV
                </button>
                <button
                  onClick={() => setReport(null)}
                  className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-400 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-semibold text-sm"
                >
                  <i className="fas fa-redo"></i>
                  Reset
                </button>
              </div>
            </div>

            <div ref={reportRef} className="p-4 md:p-8 -m-4 md:-m-8 rounded-3xl bg-slate-50">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-help">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl">
                      <i className="fas fa-chart-pie"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Satisfaction Index</p>
                        <i className="fas fa-question-circle text-[10px] text-slate-300"></i>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{normalizedReport.overallStats.averageScore.toFixed(1)}%</p>
                    </div>

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 bg-slate-900 text-white text-[12px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-2xl">
                      <p className="font-bold mb-1 text-indigo-400">What is Satisfaction Index?</p>
                      <p className="leading-relaxed text-slate-300">
                        This index scales overall sentiment from 0 to 100.
                        <br /><br />
                        • <span className="text-emerald-400">100%</span>: Perfect customer delight.
                        <br />
                        • <span className="text-amber-400">50%</span>: Balanced/Neutral feedback.
                        <br />
                        • <span className="text-rose-400">0%</span>: Critical dissatisfaction.
                      </p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl">
                      <i className="fas fa-smile"></i>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Positive Share</p>
                      <p className="text-2xl font-bold text-slate-900">{normalizedReport.overallStats.positive}%</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl">
                      <i className="fas fa-meh"></i>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Neutral Share</p>
                      <p className="text-2xl font-bold text-slate-900">{normalizedReport.overallStats.neutral}%</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-xl">
                      <i className="fas fa-frown"></i>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Negative Share</p>
                      <p className="text-2xl font-bold text-slate-900">{normalizedReport.overallStats.negative}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <i className="fas fa-chart-line text-indigo-600"></i> Satisfaction Trend (0-100)
                        </h3>
                      </div>
                      <SentimentChart data={normalizedReport.sentimentTrend} />
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <i className="fas fa-cloud text-indigo-600"></i> Key Sentiment Driver Words
                      </h3>
                      <WordCloud keywords={normalizedReport.keywords} />
                    </div>

                    <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-tight">
                        <i className="fas fa-book text-slate-400"></i> Metric Definitions
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
                        <div>
                          <p className="font-bold text-slate-800 mb-1">Satisfaction Index</p>
                          <p>A score from 0-100 summarizing overall customer sentiment. Higher values indicate better performance. Scores above 75 are excellent, while below 40 require immediate attention.</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 mb-1">Sentiment Share</p>
                          <p>The percentage of reviews categorized as Positive, Neutral, or Negative. These three metrics always sum to 100%.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2">
                          <i className="fas fa-robot"></i> AI Executive Summary
                        </h3>
                      </div>
                      <p className="text-indigo-100 text-sm leading-relaxed mb-6 italic border-l-2 border-indigo-500 pl-4 py-1">
                        "{normalizedReport.summary}"
                      </p>
                      <div className="space-y-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Top 3 Action Areas</p>
                        {normalizedReport.actionableItems.map((item, idx) => (
                          <div key={idx} className="bg-white/10 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-sm">{item.title}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${item.impact === 'High' ? 'bg-rose-500' : item.impact === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}>
                                {item.impact}
                              </span>
                            </div>
                            <p className="text-xs text-indigo-100 leading-tight">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-lightbulb"></i>
                      </div>
                      <p className="text-sm font-bold text-slate-800 mb-2">Need Deeper Insights?</p>
                      <p className="text-xs text-slate-500">Ask the AI Assistant in the bottom-right corner for specialized deep-dives into your feedback data.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {normalizedReport && <ChatBot analysisData={normalizedReport} />}
    </div>
  );
};

export default App;
