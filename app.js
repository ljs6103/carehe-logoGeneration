/**
 * Logo Generator - Main Application Logic
 * Handles image upload, processing, AI/PDF conversion with artboard selection, and export
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
const artboardSection = document.getElementById('artboardSection');
const artboardGrid = document.getElementById('artboardGrid');
const artboardCount = document.getElementById('artboardCount');

// State
let currentFileName = '';
let hasImage = false;
let currentPDF = null;
let selectedArtboard = null;

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

    // Hide artboard section initially
    hideArtboardSection();

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
 * Shows artboard selector if multiple pages exist
 * @param {File} file - The PDF or AI file
 */
async function processPDFFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        currentPDF = pdf;

        const numPages = pdf.numPages;

        if (numPages > 1) {
            // Multiple pages - show artboard selector
            await showArtboardSelector(pdf, numPages);
            uploadArea.classList.remove('loading');
        } else {
            // Single page - render directly
            await renderPDFPage(pdf, 1);
            uploadArea.classList.remove('loading');
        }

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
 * Show artboard selector with thumbnails
 * @param {PDFDocumentProxy} pdf - The PDF document
 * @param {number} numPages - Number of pages/artboards
 */
async function showArtboardSelector(pdf, numPages) {
    // Clear existing thumbnails
    artboardGrid.innerHTML = '';
    selectedArtboard = null;

    // Update count
    artboardCount.textContent = `(${numPages}개)`;

    // Create thumbnails for each page
    for (let i = 1; i <= numPages; i++) {
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'artboard-item';
        thumbnailContainer.dataset.page = i;

        const thumbnailWrapper = document.createElement('div');
        thumbnailWrapper.className = 'artboard-thumbnail';

        const label = document.createElement('div');
        label.className = 'artboard-label';
        label.textContent = `대지 ${i}`;

        thumbnailContainer.appendChild(thumbnailWrapper);
        thumbnailContainer.appendChild(label);

        // Add click handler
        thumbnailContainer.addEventListener('click', () => selectArtboard(thumbnailContainer, i));

        artboardGrid.appendChild(thumbnailContainer);

        // Generate thumbnail asynchronously
        generateThumbnail(pdf, i, thumbnailWrapper);
    }

    // Show artboard section
    artboardSection.classList.add('visible');
}

/**
 * Generate thumbnail for a PDF page
 * @param {PDFDocumentProxy} pdf - The PDF document
 * @param {number} pageNum - Page number
 * @param {HTMLElement} container - Container element for thumbnail
 */
async function generateThumbnail(pdf, pageNum, container) {
    try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });

        // Calculate scale for thumbnail (max 200px width)
        const maxWidth = 200;
        const scale = maxWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        // Create canvas for thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        const ctx = canvas.getContext('2d');

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render page
        await page.render({
            canvasContext: ctx,
            viewport: scaledViewport
        }).promise;

        // Create image from canvas
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.alt = `대지 ${pageNum}`;

        container.appendChild(img);

    } catch (error) {
        console.error(`Error generating thumbnail for page ${pageNum}:`, error);
        container.innerHTML = '<span style="color: #94a3b8; font-size: 12px;">로드 실패</span>';
    }
}

/**
 * Select an artboard and render it
 * @param {HTMLElement} element - The clicked artboard element
 * @param {number} pageNum - Page number to render
 */
async function selectArtboard(element, pageNum) {
    // Remove previous selection
    const previousSelected = artboardGrid.querySelector('.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }

    // Add selection to clicked element
    element.classList.add('selected');
    selectedArtboard = pageNum;

    // Render the selected page
    if (currentPDF) {
        await renderPDFPage(currentPDF, pageNum);
    }
}

/**
 * Render a specific PDF page to the main canvas
 * @param {PDFDocumentProxy} pdf - The PDF document
 * @param {number} pageNum - Page number to render
 */
async function renderPDFPage(pdf, pageNum) {
    try {
        const page = await pdf.getPage(pageNum);

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

        // Fill white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Render PDF page to temporary canvas
        await page.render({
            canvasContext: tempCtx,
            viewport: scaledViewport
        }).promise;

        // Create image from temporary canvas
        const img = new Image();
        img.onload = () => {
            drawImageToCanvas(img);
        };
        img.src = tempCanvas.toDataURL('image/png');

    } catch (error) {
        console.error('Error rendering PDF page:', error);
        alert('페이지 렌더링 중 오류가 발생했습니다.');
    }
}

/**
 * Hide artboard selector section
 */
function hideArtboardSection() {
    artboardSection.classList.remove('visible');
    artboardGrid.innerHTML = '';
    currentPDF = null;
    selectedArtboard = null;
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
    hideArtboardSection();
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
