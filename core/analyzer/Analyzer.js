import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import NarseseTranslator from './NarseseTranslator.js';
import DataIngestor from './DataIngestor.js';
import AnalysisEngine from './AnalysisEngine.js';
import ReportGenerator from './ReportGenerator.js';

const errorHandler = createUnifiedErrorHandler('Analyzer');

class UnitTestAnalyzer {
    constructor({
                    enableCoverageAnalysis = true,
                    enablePerformanceAnalysis = true,
                    enableFailureAnalysis = true,
                    ...config
                } = {}) {
        this.config = {enableCoverageAnalysis, enablePerformanceAnalysis, enableFailureAnalysis, ...config};
        this.ingestor = new DataIngestor(this.config);
        this.translator = new NarseseTranslator(this.config);
        this.engine = new AnalysisEngine(this.config);
        this.reportGenerator = new ReportGenerator(this.config);
        this.analysisResults = null;
    }

    async analyzeTestData(testResults, coverageData = null, profilingData = null) {
        return errorHandler.execute(async () => {
            const {enableCoverageAnalysis, enablePerformanceAnalysis} = this.config;

            const [testData, ingestedCoverageData, ingestedProfilingData] = await Promise.all([
                this.ingestor.ingestTestResults(testResults),
                enableCoverageAnalysis && coverageData ? this.ingestor.ingestCoverageData(coverageData) : Promise.resolve(null),
                enablePerformanceAnalysis && profilingData ? this.ingestor.ingestProfilingData(profilingData) : Promise.resolve(null),
            ]);

            const narseseData = await this.translator.translate(testData, ingestedCoverageData, ingestedProfilingData);
            this.analysisResults = await this.engine.analyze(narseseData, this.config);

            return this.analysisResults;
        }, 'analyze-test-data', null);
    }

    generateReport(format = 'json') {
        return errorHandler.executeSync(() => {
            this._checkAnalysisResults();
            return this.reportGenerator.generate(this.analysisResults, format);
        }, 'generate-report', null);
    }

    async generateDetailedReport(format = 'html') {
        return errorHandler.execute(async () => {
            this._checkAnalysisResults();
            return await this.reportGenerator.generateDetailed(this.analysisResults, format);
        }, 'generate-detailed-report', null);
    }

    _checkAnalysisResults() {
        if (!this.analysisResults) {
            throw new Error('No analysis results available. Run analyzeTestData first.');
        }
    }
}

export default UnitTestAnalyzer;