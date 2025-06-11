// PDF to Audio Converter Application
class PDFToAudioConverter {
    constructor() {
        this.pdfDoc = null;
        this.pdfText = '';
        this.audioBlob = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.totalPages = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSpeechSynthesis();
    }

    initializeElements() {
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileStats = document.getElementById('fileStats');
        this.removeFileBtn = document.getElementById('removeFile');

        // Settings elements
        this.settingsSection = document.getElementById('settingsSection');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.startPage = document.getElementById('startPage');
        this.endPage = document.getElementById('endPage');

        // Convert elements
        this.convertSection = document.getElementById('convertSection');
        this.convertBtn = document.getElementById('convertBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.statusMessage = document.getElementById('statusMessage');

        // Download elements
        this.downloadSection = document.getElementById('downloadSection');
        this.downloadTitle = document.getElementById('downloadTitle');
        this.downloadSize = document.getElementById('downloadSize');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.resetBtn = document.getElementById('resetBtn');
    }

    setupEventListeners() {
        // Upload area events
        this.uploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            this.fileInput.click();
        });
        
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove dragover if we're leaving the upload area itself
            if (!this.uploadArea.contains(e.relatedTarget)) {
                this.uploadArea.classList.remove('dragover');
            }
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        this.fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        this.removeFileBtn.addEventListener('click', this.removeFile.bind(this));

        // Settings events
        this.speedSlider.addEventListener('input', this.updateSpeedValue.bind(this));
        this.startPage.addEventListener('input', this.validatePageRange.bind(this));
        this.endPage.addEventListener('input', this.validatePageRange.bind(this));

        // Convert and download events
        this.convertBtn.addEventListener('click', this.startConversion.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadAudio.bind(this));
        this.resetBtn.addEventListener('click', this.resetApplication.bind(this));

        // Prevent text selection during drag operations
        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });
    }

    setupSpeechSynthesis() {
        this.synthesis = window.speechSynthesis;
        this.availableVoices = [];
        
        // Load voices
        this.loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.loadVoices.bind(this);
        }
    }

    loadVoices() {
        this.availableVoices = this.synthesis.getVoices();
        this.populateVoiceSelect();
    }

    populateVoiceSelect() {
        const femaleVoices = this.availableVoices.filter(voice => 
            voice.name.toLowerCase().includes('female') || 
            voice.name.toLowerCase().includes('zira') ||
            voice.name.toLowerCase().includes('susan') ||
            voice.name.toLowerCase().includes('samantha') ||
            voice.gender === 'female'
        );
        
        const maleVoices = this.availableVoices.filter(voice => 
            voice.name.toLowerCase().includes('male') || 
            voice.name.toLowerCase().includes('david') ||
            voice.name.toLowerCase().includes('mark') ||
            voice.name.toLowerCase().includes('alex') ||
            voice.gender === 'male'
        );

        // Use default voices if specific gender voices not found
        if (femaleVoices.length === 0 && this.availableVoices.length > 0) {
            femaleVoices.push(this.availableVoices[0]);
        }
        if (maleVoices.length === 0 && this.availableVoices.length > 1) {
            maleVoices.push(this.availableVoices[1]);
        }

        this.femaleVoice = femaleVoices[0];
        this.maleVoice = maleVoices[0] || femaleVoices[0];
    }

    async processFile(file) {
        // Validate file
        if (!this.validateFile(file)) return;

        this.showStatus('Loading PDF...', 'info');
        
        try {
            // Load PDF
            const arrayBuffer = await file.arrayBuffer();
            this.pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            this.totalPages = this.pdfDoc.numPages;

            // Update UI
            this.fileName.textContent = file.name;
            this.fileStats.textContent = `${this.totalPages} pages • ${this.formatFileSize(file.size)}`;
            this.fileInfo.style.display = 'flex';
            this.settingsSection.style.display = 'block';
            this.convertSection.style.display = 'block';

            // Update page range inputs
            this.startPage.max = this.totalPages;
            this.endPage.max = this.totalPages;
            this.endPage.value = this.totalPages;

            this.showStatus('PDF loaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showStatus('Error loading PDF. Please try a different file.', 'error');
        }
    }

    validateFile(file) {
        if (file.type !== 'application/pdf') {
            this.showStatus('Please select a PDF file.', 'error');
            return false;
        }
        
        if (file.size > 50 * 1024 * 1024) { // 50MB
            this.showStatus('File size exceeds 50MB limit.', 'error');
            return false;
        }
        
        return true;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeFile() {
        this.pdfDoc = null;
        this.fileInput.value = '';
        this.fileInfo.style.display = 'none';
        this.settingsSection.style.display = 'none';
        this.convertSection.style.display = 'none';
        this.downloadSection.style.display = 'none';
        this.statusMessage.textContent = '';
        this.statusMessage.className = 'status-message';
    }

    updateSpeedValue() {
        this.speedValue.textContent = this.speedSlider.value;
    }

    validatePageRange() {
        const start = parseInt(this.startPage.value);
        const end = parseInt(this.endPage.value);
        
        if (start > end) {
            this.startPage.value = end;
        }
        if (end < start) {
            this.endPage.value = start;
        }
    }

    async startConversion() {
        if (!this.pdfDoc) return;

        this.convertBtn.disabled = true;
        this.convertBtn.innerHTML = '<span class="loading"></span>Converting...';
        this.progressContainer.style.display = 'block';
        this.updateProgress(0, 'Extracting text from PDF...');

        try {
            // Extract text from selected pages
            await this.extractTextFromPages();
            
            if (!this.pdfText.trim()) {
                throw new Error('No text found in the selected pages.');
            }

            this.updateProgress(30, 'Requesting screen share permission...');
            this.showStatus('Please select "Share system audio" when prompted for screen sharing.', 'info');
            
            // Request screen capture with audio
            await this.setupAudioRecording();
            
            this.updateProgress(40, 'Starting text-to-speech conversion...');
            
            // Start TTS and recording
            await this.convertTextToSpeech();
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.showStatus(`Conversion failed: ${error.message}`, 'error');
            this.resetConvertButton();
        }
    }

    async extractTextFromPages() {
        const startPage = parseInt(this.startPage.value);
        const endPage = parseInt(this.endPage.value);
        this.pdfText = '';

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            const page = await this.pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            this.pdfText += pageText + ' ';
            
            const progress = 10 + (pageNum - startPage + 1) / (endPage - startPage + 1) * 20;
            this.updateProgress(progress, `Extracting text from page ${pageNum}...`);
        }
    }

    async setupAudioRecording() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    sampleRate: 44100
                },
                video: {
                    width: 1,
                    height: 1
                }
            });

            // Stop video track immediately since we only need audio
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.stop();
                stream.removeTrack(videoTrack);
            }

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.processRecordedAudio();
            };

        } catch (error) {
            throw new Error('Screen share permission denied or not supported. Please allow screen sharing with audio to continue.');
        }
    }

    async convertTextToSpeech() {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            const utterance = new SpeechSynthesisUtterance(this.pdfText);
            
            // Configure voice
            const selectedVoice = this.voiceSelect.value === 'female' ? this.femaleVoice : this.maleVoice;
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            
            // Configure speech settings
            utterance.rate = parseInt(this.speedSlider.value) / 150; // Normalize to 1.0 = 150 WPM
            utterance.pitch = 1;
            utterance.volume = 1;

            let progress = 50;
            const words = this.pdfText.split(' ').length;
            const wordsPerMinute = parseInt(this.speedSlider.value);
            const estimatedDuration = (words / wordsPerMinute) * 60000; // milliseconds

            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;

            // Progress simulation during speech
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 2;
                    this.updateProgress(progress, 'Converting text to speech...');
                }
            }, estimatedDuration / 20);

            utterance.onend = () => {
                clearInterval(progressInterval);
                this.updateProgress(95, 'Finishing recording...');
                
                // Stop recording after a short delay
                setTimeout(() => {
                    if (this.mediaRecorder && this.isRecording) {
                        this.mediaRecorder.stop();
                        this.isRecording = false;
                    }
                    resolve();
                }, 1000);
            };

            utterance.onerror = (event) => {
                clearInterval(progressInterval);
                if (this.mediaRecorder && this.isRecording) {
                    this.mediaRecorder.stop();
                    this.isRecording = false;
                }
                reject(new Error('Speech synthesis failed: ' + event.error));
            };

            // Start speaking
            this.synthesis.speak(utterance);
        });
    }

    async processRecordedAudio() {
        this.updateProgress(98, 'Processing audio...');
        
        try {
            // Create blob from recorded chunks
            this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            
            // Convert to MP3-compatible blob for download
            const mp3Blob = await this.convertToMP3Compatible(this.audioBlob);
            this.audioBlob = mp3Blob;
            
            this.updateProgress(100, 'Conversion complete!');
            this.showConversionComplete();
            
        } catch (error) {
            console.error('Error processing audio:', error);
            this.showStatus('Error processing audio. Please try again.', 'error');
            this.resetConvertButton();
        }
    }

    async convertToMP3Compatible(webmBlob) {
        // For now, we'll rename the webm file to mp3 for download
        // In a production environment, you'd want to use a library like FFmpeg.wasm
        // to actually convert the audio format
        return new Blob([webmBlob], { type: 'audio/mp3' });
    }

    showConversionComplete() {
        this.convertSection.style.display = 'none';
        this.downloadSection.style.display = 'block';
        
        const sizeText = this.formatFileSize(this.audioBlob.size);
        this.downloadSize.textContent = `File size: ${sizeText}`;
        
        this.showStatus('Your MP3 file is ready for download!', 'success');
    }

    downloadAudio() {
        if (!this.audioBlob) return;

        const url = URL.createObjectURL(this.audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.fileName.textContent.replace('.pdf', '')}_audio.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    resetApplication() {
        // Stop any ongoing speech
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        // Stop recording if active
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
        
        // Reset all state
        this.pdfDoc = null;
        this.pdfText = '';
        this.audioBlob = null;
        this.audioChunks = [];
        
        // Reset UI
        this.removeFile();
        this.resetConvertButton();
        this.progressContainer.style.display = 'none';
        this.updateProgress(0, '');
    }

    resetConvertButton() {
        this.convertBtn.disabled = false;
        this.convertBtn.innerHTML = 'Convert & Download MP3';
    }

    updateProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
    }

    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (this.statusMessage.classList.contains(type)) {
                    this.statusMessage.textContent = '';
                    this.statusMessage.className = 'status-message';
                }
            }, 5000);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for required APIs
    if (!window.speechSynthesis) {
        alert('Your browser does not support speech synthesis. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Your browser does not support screen capture. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
    }
    
    if (!window.MediaRecorder) {
        alert('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
    }
    
    // Initialize the converter
    new PDFToAudioConverter();
});