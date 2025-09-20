import {createModuleErrorHandler} from '../utils/errorHandler.js';
import NarseseTranslator from './NarseseTranslator.js';
import DataIngestor from './DataIngestor.js';
import AnalysisEngine from './AnalysisEngine.js';
import ReportGenerator from './ReportGenerator.js';

const errorHandler = createModuleErrorHandler('Analyzer');

class UnitTestAnalyzer {
    constructor(config = {},
                ingestor = new DataIngestor(config),
                translator = new NarseseTranslator(config),
                engine = new AnalysisEngine(config),
                reportGenerator = new ReportGenerator(config)) {
        this.config = {
            enableCoverageAnalysis: config.enableCoverageAnalysis ?? true,
            enablePerformanceAnalysis: config.enablePerformanceAnalysis ?? true,
            enableFailureAnalysis: config.enableFailureAnalysis ?? true,
            ...config
        };

        this.ingestor = ingestor;
        this.translator = translator;
        this.engine = engine;
        this.reportGenerator = reportGenerator;

        this.testData = null;
        this.coverageData = null;
        this.profilingData = null;
        this.analysisResults = null;
    }

    async analyzeTestData(testResults, coverageData = null, profilingData = null) {
        return errorHandler.safeAsync(async () => {
            // Ingest all data sources
            this.testData = await this.ingestor.ingestTestResults(testResults);

            if (coverageData && this.config.enableCoverageAnalysis) {
                this.coverageData = await this.ingestor.ingestCoverageData(coverageData);
            }

            if (profilingData && this.config.enablePerformanceAnalysis) {
                this.profilingData = await this.ingestor.ingestProfilingData(profilingData);
            }

            // Translate to Narsese
            const narseseData = await this.translator.translate(this.testData, this.coverageData, this.profilingData);

            // Analyze the data
            this.analysisResults = await this.engine.analyze(narseseData, this.config);

            return this.analysisResults;
        }, 'analyze-test-data', null);
    }

    generateReport(format = 'json') {
        return errorHandler.safeSync(() => {
            if (!this.analysisResults) {
                throw new Error('No analysis results available. Run analyzeTestData first.');
            }

            return this.reportGenerator.generate(this.analysisResults, format);
        }, 'generate-report', null);
    }

    async generateDetailedReport(format = 'html') {
        return errorHandler.safeAsync(async () => {
            if (!this.analysisResults) {
                throw new Error('No analysis results available. Run analyzeTestData first.');
            }

            return await this.reportGenerator.generateDetailed(this.analysisResults, format);
        }, 'generate-detailed-report', null);
    }
}

export default UnitTestAnalyzer;