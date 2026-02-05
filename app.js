/**
 * Logo Generator - Main Application Logic
 * Handles image upload, processing, AI/PDF conversion, and export
 */

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Constants
const CANVAS_WIDTH = 786;
const CANVAS_HEIGHT = 280;
const BACKGROUND_COLOR = '#FFFFFF';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const clearBtn = document.getElementById('clearBtn');
const previewCanvas = document.getElementById('previewCanvas');
const saveBtn = document.getElementById('saveBtn');

// State
let currentFileName = '';
let hasImage = false;

// Canvas Context
const ctx = previewCanvas.getContext('2d');

// Initialize canvas with white background
function initCanvas() {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// Initialize on load
initCanvas();

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

clearBtn.addEventListener('click', () => {
    clearCanvas();
});

saveBtn.addEventListener('click', () => {
    downloadImage();
});

/**
 * Handle uploaded file
 * @param {File} file - The uploaded file
 */
function handleFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'ai'];

    if (!validExtensions.includes(extension)) {
        alert('지원하지 않는 파일 형식입니다.\n지원 포맷: JPG, JPEG, PNG, PDF, AI');
        return;
    }

    // Extract filename without extension
    currentFileName = file.name.replace(/\.[^/.]+$/, '');

    // Show file info
    fileName.textContent = file.name;
    fileInfo.classList.add('visible');

    // Add loading state
    uploadArea.classList.add('loading');

    // Process based on file type
    if (extension === 'pdf' || extension === 'ai') {
        processPDFFile(file);
    } else {
        processImageFile(file);
    }
}

/**
 * Process image file (JPG, JPEG, PNG)
 * @param {File} file - The image file
 */
function processImageFile(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            drawImageToCanvas(img);
            uploadArea.classList.remove('loading');
        };
        img.onerror = () => {
            alert('이미지를 불러오는데 실패했습니다.');
            uploadArea.classList.remove('loading');
            clearCanvas();
        };
        img.src = e.target.result;
    };

    reader.onerror = () => {
        alert('파일을 읽는데 실패했습니다.');
        uploadArea.classList.remove('loading');
    };

    reader.readAsDataURL(file);
}

/**
 * Process PDF/AI file using PDF.js
 * @param {File} file - The PDF or AI file
 */
async function processPDFFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Get first page
        const page = await pdf.getPage(1);

        // Calculate scale to fit within canvas while maintaining aspect ratio
        const viewport = page.getViewport({ scale: 1 });
        const scaleX = CANVAS_WIDTH / viewport.width;
        const scaleY = CANVAS_HEIGHT / viewport.height;
        const scale = Math.min(scaleX, scaleY) * 0.9; // 90% of max to add some padding

        const scaledViewport = page.getViewport({ scale });

        // Create temporary canvas for PDF rendering
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = scaledViewport.width;
        tempCanvas.height = scaledViewport.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Render PDF page to temporary canvas
        await page.render({
            canvasContext: tempCtx,
            viewport: scaledViewport
        }).promise;

        // Create image from temporary canvas
        const img = new Image();
        img.onload = () => {
            drawImageToCanvas(img);
            uploadArea.classList.remove('loading');
        };
        img.src = tempCanvas.toDataURL('image/png');

    } catch (error) {
        console.error('PDF/AI processing error:', error);

        let errorMessage = 'PDF/AI 파일 처리 중 오류가 발생했습니다.';
        if (error.message && error.message.includes('Invalid PDF')) {
            errorMessage = 'AI 파일이 PDF 호환 모드로 저장되지 않았습니다.\nAdobe Illustrator에서 "PDF 호환 파일 만들기" 옵션을 활성화하여 다시 저장해주세요.';
        }

        alert(errorMessage);
        uploadArea.classList.remove('loading');
        clearCanvas();
    }
}

/**
 * Draw image to canvas with proper scaling and centering
 * @param {HTMLImageElement} img - The image to draw
 */
function drawImageToCanvas(img) {
    // Clear canvas with white background
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Calculate scaled dimensions (contain mode)
    const imgAspect = img.width / img.height;
    const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;

    let drawWidth, drawHeight;

    if (imgAspect > canvasAspect) {
        // Image is wider than canvas
        drawWidth = CANVAS_WIDTH * 0.9; // 90% width with padding
        drawHeight = drawWidth / imgAspect;
    } else {
        // Image is taller than canvas
        drawHeight = CANVAS_HEIGHT * 0.9; // 90% height with padding
        drawWidth = drawHeight * imgAspect;
    }

    // Center the image
    const x = (CANVAS_WIDTH - drawWidth) / 2;
    const y = (CANVAS_HEIGHT - drawHeight) / 2;

    // Draw image
    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    // Enable save button
    hasImage = true;
    saveBtn.disabled = false;
}

/**
 * Clear canvas and reset state
 */
function clearCanvas() {
    initCanvas();
    currentFileName = '';
    hasImage = false;
    saveBtn.disabled = true;
    fileInfo.classList.remove('visible');
    fileInput.value = '';
}

/**
 * Download the canvas as PNG
 */
function downloadImage() {
    if (!hasImage) {
        alert('먼저 이미지를 업로드해주세요.');
        return;
    }

    // Create download link
    const link = document.createElement('a');
    link.download = `${currentFileName}_logo.png`;
    link.href = previewCanvas.toDataURL('image/png');

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Prevent default drag behaviors on document
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});
