/**
 * Media Processor Executor
 * Provides multi-modal processing capabilities including PDF, image, audio, and video
 */

import { debug, error as logError, info, warn } from '../utils/logger.js';
import { createUnifiedErrorHandler } from '../utils/errorHandler.js';
import { readFile, access } from 'fs/promises';
import { extname } from 'path';
import { randomUUID } from 'crypto';

const errorHandler = createUnifiedErrorHandler('MediaProcessorExecutor');

class MediaProcessorExecutor {
    constructor(config = {}) {
        this.config = {
            maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
            enableOCR: config.enableOCR ?? true,
            enableImageAnalysis: config.enableImageAnalysis ?? true,
            enableAudioTranscription: config.enableAudioTranscription ?? true,
            enableVideoProcessing: config.enableVideoProcessing ?? true,
            visionProvider: config.visionProvider || 'claude',
            transcriptionProvider: config.transcriptionProvider || 'whisper',
            ...config
        };

        this.processors = new Map();
        this.initializeProcessors();

        info('MediaProcessorExecutor initialized');
    }

    initializeProcessors() {
        this.processors.set('.pdf', this.processPDF.bind(this));
        this.processors.set('.doc', this.processDOC.bind(this));
        this.processors.set('.docx', this.processDOCX.bind(this));

        this.processors.set('.jpg', this.processImage.bind(this));
        this.processors.set('.jpeg', this.processImage.bind(this));
        this.processors.set('.png', this.processImage.bind(this));
        this.processors.set('.gif', this.processImage.bind(this));
        this.processors.set('.webp', this.processImage.bind(this));
        this.processors.set('.bmp', this.processImage.bind(this));

        this.processors.set('.mp3', this.processAudio.bind(this));
        this.processors.set('.wav', this.processAudio.bind(this));
        this.processors.set('.m4a', this.processAudio.bind(this));
        this.processors.set('.flac', this.processAudio.bind(this));
        this.processors.set('.aac', this.processAudio.bind(this));

        this.processors.set('.mp4', this.processVideo.bind(this));
        this.processors.set('.avi', this.processVideo.bind(this));
        this.processors.set('.mov', this.processVideo.bind(this));
        this.processors.set('.webm', this.processVideo.bind(this));
        this.processors.set('.mkv', this.processVideo.bind(this));
    }

    async processPDF(params) {
        const { path, extractText, extractImages, pageRange } = {
            extractText: true,
            extractImages: false,
            pageRange: null,
            ...params
        };

        try {
            debug(`Processing PDF: ${path}`);

            // Validate file
            await this.validateFile(path, ['.pdf']);

            // Load PDF processing library
            const pdfParse = await import('pdf-parse');

            // Read file
            const buffer = await readFile(path);

            // Parse PDF
            const data = await pdfParse.default(buffer);

            const result = {
                success: true,
                type: 'pdf',
                path,
                info: {
                    pages: data.numpages,
                    info: data.info,
                    metadata: data.metadata,
                    version: data.version
                }
            };

            // Extract text
            if (extractText) {
                result.text = data.text;
                result.textLength = data.text.length;
            }

            // Extract images (if library supports it)
            if (extractImages && data.images) {
                result.images = data.images;
            }

            // Apply page range filtering
            if (pageRange) {
                result.pageRange = pageRange;
                // Note: pdf-parse doesn't support page range extraction natively
                // This would require a more advanced PDF library
            }

            info(`PDF processed successfully: ${path} (${data.numpages} pages)`);
            return result;

        } catch (error) {
            logError(`PDF processing failed: ${path}`, error);
            throw error;
        }
    }

    async processDOC(params) {
        const { path, extractText } = {
            extractText: true,
            ...params
        };

        try {
            debug(`Processing DOC: ${path}`);

            // Validate file
            await this.validateFile(path, ['.doc']);

            // For DOC files, we need a specialized library
            // This is a placeholder - in practice, you'd use mammoth.js or similar
            const result = {
                success: true,
                type: 'doc',
                path,
                note: 'DOC processing requires specialized library (e.g., mammoth.js)'
            };

            if (extractText) {
                // Placeholder for text extraction
                result.text = '[DOC text extraction not implemented]';
            }

            info(`DOC processed: ${path}`);
            return result;

        } catch (error) {
            logError(`DOC processing failed: ${path}`, error);
            throw error;
        }
    }

    async processDOCX(params) {
        const { path, extractText, extractImages } = {
            extractText: true,
            extractImages: false,
            ...params
        };

        try {
            debug(`Processing DOCX: ${path}`);

            // Validate file
            await this.validateFile(path, ['.docx']);

            // Load mammoth for DOCX processing
            const mammoth = await import('mammoth');

            // Read file
            const buffer = await readFile(path);

            // Extract content
            const options = {};
            if (extractImages) {
                options.convertImage = mammoth.images.imgElement((image) => {
                    return image.read("base64").then((imageBuffer) => {
                        return {
                            src: `data:${image.contentType};base64,${imageBuffer}`
                        };
                    });
                });
            }

            const result = await mammoth.convertToHtml(buffer, options);

            const output = {
                success: true,
                type: 'docx',
                path,
                content: {
                    html: result.value,
                    text: this.htmlToText(result.value),
                    messages: result.messages
                }
            };

            info(`DOCX processed successfully: ${path}`);
            return output;

        } catch (error) {
            logError(`DOCX processing failed: ${path}`, error);
            throw error;
        }
    }

    async processImage(params) {
        const { path, performOCR, analyzeContent, detectObjects } = {
            performOCR: this.config.enableOCR,
            analyzeContent: this.config.enableImageAnalysis,
            detectObjects: false,
            ...params
        };

        try {
            debug(`Processing image: ${path}`);

            // Validate file
            const ext = extname(path).toLowerCase();
            await this.validateFile(path, ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

            // Read image file
            const imageBuffer = await readFile(path);

            const result = {
                success: true,
                type: 'image',
                path,
                metadata: {
                    size: imageBuffer.length,
                    format: ext.substring(1),
                    dimensions: await this.getImageDimensions(imageBuffer)
                }
            };

            // Perform OCR
            if (performOCR) {
                try {
                    result.ocr = await this.performOCR(imageBuffer);
                } catch (error) {
                    warn(`OCR failed for image: ${path}`, error.message);
                    result.ocr = { error: error.message };
                }
            }

            // Analyze content with vision API
            if (analyzeContent) {
                try {
                    result.analysis = await this.analyzeImageContent(imageBuffer);
                } catch (error) {
                    warn(`Image analysis failed: ${path}`, error.message);
                    result.analysis = { error: error.message };
                }
            }

            // Detect objects
            if (detectObjects) {
                try {
                    result.objects = await this.detectObjects(imageBuffer);
                } catch (error) {
                    warn(`Object detection failed: ${path}`, error.message);
                    result.objects = { error: error.message };
                }
            }

            info(`Image processed successfully: ${path}`);
            return result;

        } catch (error) {
            logError(`Image processing failed: ${path}`, error);
            throw error;
        }
    }

    async processAudio(params) {
        const { path, transcribe, analyzeContent } = {
            transcribe: this.config.enableAudioTranscription,
            analyzeContent: false,
            ...params
        };

        try {
            debug(`Processing audio: ${path}`);

            // Validate file
            const ext = extname(path).toLowerCase();
            await this.validateFile(path, ['.mp3', '.wav', '.m4a', '.flac', '.aac']);

            // Read audio file
            const audioBuffer = await readFile(path);

            const result = {
                success: true,
                type: 'audio',
                path,
                metadata: {
                    size: audioBuffer.length,
                    format: ext.substring(1),
                    duration: await this.getAudioDuration(audioBuffer, ext)
                }
            };

            // Transcribe audio
            if (transcribe) {
                try {
                    result.transcription = await this.transcribeAudio(audioBuffer, ext);
                } catch (error) {
                    warn(`Audio transcription failed: ${path}`, error.message);
                    result.transcription = { error: error.message };
                }
            }

            // Analyze content
            if (analyzeContent && result.transcription) {
                try {
                    result.analysis = await this.analyzeAudioContent(result.transcription.text);
                } catch (error) {
                    warn(`Audio content analysis failed: ${path}`, error.message);
                    result.analysis = { error: error.message };
                }
            }

            info(`Audio processed successfully: ${path}`);
            return result;

        } catch (error) {
            logError(`Audio processing failed: ${path}`, error);
            throw error;
        }
    }

    async processVideo(params) {
        const { path, extractFrames, extractAudio, analyzeContent } = {
            extractFrames: false,
            extractAudio: false,
            analyzeContent: this.config.enableVideoProcessing,
            ...params
        };

        try {
            debug(`Processing video: ${path}`);

            // Validate file
            const ext = extname(path).toLowerCase();
            await this.validateFile(path, ['.mp4', '.avi', '.mov', '.webm', '.mkv']);

            // Note: Video processing requires complex libraries like ffmpeg
            // This is a placeholder implementation
            const result = {
                success: true,
                type: 'video',
                path,
                metadata: {
                    size: (await readFile(path)).length,
                    format: ext.substring(1),
                    note: 'Advanced video processing requires ffmpeg integration'
                }
            };

            if (extractFrames) {
                result.frames = { note: 'Frame extraction not implemented' };
            }

            if (extractAudio) {
                result.audio = { note: 'Audio extraction not implemented' };
            }

            if (analyzeContent) {
                result.analysis = { note: 'Video content analysis not implemented' };
            }

            info(`Video processed: ${path}`);
            return result;

        } catch (error) {
            logError(`Video processing failed: ${path}`, error);
            throw error;
        }
    }

    async performOCR(imageBuffer) {
        try {
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker();

            try {
                await worker.loadLanguage('eng');
                await worker.initialize('eng');

                const { data: { text } } = await worker.recognize(imageBuffer);

                return {
                    text: text.trim(),
                    confidence: 0.9, // Tesseract doesn't provide confidence in this version
                    language: 'eng'
                };
            } finally {
                await worker.terminate();
            }
        } catch (error) {
            throw new Error(`OCR failed: ${error.message}`);
        }
    }

    async analyzeImageContent(imageBuffer) {
        try {
            // This would integrate with vision APIs like Claude, GPT-4V, etc.
            const visionProvider = this.getVisionProvider();

            const analysis = await visionProvider.analyze(imageBuffer, {
                task: 'describe',
                detail: 'high'
            });

            return {
                description: analysis.description,
                objects: analysis.objects || [],
                text: analysis.text || [],
                colors: analysis.colors || [],
                confidence: analysis.confidence || 0.9
            };
        } catch (error) {
            throw new Error(`Image analysis failed: ${error.message}`);
        }
    }

    async detectObjects(imageBuffer) {
        try {
            // This would integrate with object detection APIs or libraries
            // For now, return a placeholder
            return {
                objects: [],
                confidence: 0,
                note: 'Object detection requires specialized ML models'
            };
        } catch (error) {
            throw new Error(`Object detection failed: ${error.message}`);
        }
    }

    async transcribeAudio(audioBuffer, format) {
        try {
            // This would integrate with transcription services like Whisper, Google Speech, etc.
            const transcriptionProvider = this.getTranscriptionProvider();

            const transcription = await transcriptionProvider.transcribe(audioBuffer, {
                language: 'en',
                format: format
            });

            return {
                text: transcription.text,
                confidence: transcription.confidence || 0.9,
                language: transcription.language || 'en',
                segments: transcription.segments || []
            };
        } catch (error) {
            throw new Error(`Audio transcription failed: ${error.message}`);
        }
    }

    async analyzeAudioContent(text) {
        try {
            // Basic text analysis of transcribed audio
            const words = text.split(/\s+/).filter(word => word.length > 0);
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

            return {
                wordCount: words.length,
                sentenceCount: sentences.length,
                averageWordsPerSentence: Math.round(words.length / sentences.length),
                language: 'en', // Would need language detection
                keywords: this.extractKeywords(text),
                sentiment: this.analyzeSentiment(text)
            };
        } catch (error) {
            throw new Error(`Audio content analysis failed: ${error.message}`);
        }
    }

    async validateFile(path, allowedExtensions) {
        // Check file existence
        try {
            await access(path);
        } catch (error) {
            throw new Error(`File not found: ${path}`);
        }

        // Check file extension
        const ext = extname(path).toLowerCase();
        if (allowedExtensions && !allowedExtensions.includes(ext)) {
            throw new Error(`Invalid file type: ${ext}. Allowed: ${allowedExtensions.join(', ')}`);
        }

        // Check file size
        const { stat } = await import('fs/promises');
        const stats = await stat(path);
        if (stats.size > this.config.maxFileSize) {
            throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
        }
    }

    async getImageDimensions(imageBuffer) {
        try {
            const sizeOf = await import('image-size');
            const dimensions = sizeOf.default(imageBuffer);

            return {
                width: dimensions.width,
                height: dimensions.height,
                type: dimensions.type
            };
        } catch (error) {
            warn('Failed to get image dimensions:', error.message);
            return { width: null, height: null, type: null };
        }
    }

    async getAudioDuration(audioBuffer, format) {
        try {
            // This would require audio metadata libraries
            // For now, return null
            return null;
        } catch (error) {
            warn('Failed to get audio duration:', error.message);
            return null;
        }
    }

    getVisionProvider() {
        // This would return the configured vision provider (Claude, GPT-4V, etc.)
        return {
            analyze: async (imageBuffer, options) => {
                // Placeholder implementation
                return {
                    description: 'Vision analysis not implemented',
                    objects: [],
                    text: [],
                    colors: [],
                    confidence: 0
                };
            }
        };
    }

    getTranscriptionProvider() {
        // This would return the configured transcription provider (Whisper, etc.)
        return {
            transcribe: async (audioBuffer, options) => {
                // Placeholder implementation
                return {
                    text: 'Transcription not implemented',
                    confidence: 0,
                    language: 'en',
                    segments: []
                };
            }
        };
    }

    extractKeywords(text) {
        // Simple keyword extraction
        const words = text.toLowerCase().split(/\s+/);
        const frequency = {};

        for (const word of words) {
            if (word.length > 3 && !this.isStopWord(word)) {
                frequency[word] = (frequency[word] || 0) + 1;
            }
        }

        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
    }

    isStopWord(word) {
        const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among'];
        return stopWords.includes(word);
    }

    analyzeSentiment(text) {
        // Simple sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'joy'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'upset'];

        const words = text.toLowerCase().split(/\s+/);
        let positive = 0;
        let negative = 0;

        for (const word of words) {
            if (positiveWords.includes(word)) positive++;
            if (negativeWords.includes(word)) negative++;
        }

        if (positive > negative) return 'positive';
        if (negative > positive) return 'negative';
        return 'neutral';
    }

    htmlToText(html) {
        // Simple HTML to text conversion
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    getSupportedFormats() {
        return {
            documents: ['.pdf', '.doc', '.docx'],
            images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
            audio: ['.mp3', '.wav', '.m4a', '.flac', '.aac'],
            video: ['.mp4', '.avi', '.mov', '.webm', '.mkv']
        };
    }

    async shutdown() {
        info('MediaProcessorExecutor shutdown completed');
    }
}

export default MediaProcessorExecutor;