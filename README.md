# Logo Generator

기업 로고 가이드라인 준수 이미지 생성 및 AI 파일 변환 웹 도구

## 🎯 Features

- **드래그 앤 드롭** 파일 업로드
- **다양한 포맷 지원**: JPG, JPEG, PNG, PDF, AI
- **AI 파일 변환**: Adobe Illustrator 파일을 PNG로 자동 변환
- **자동 스케일링**: 원본 비율 유지하며 캔버스에 맞춤 (Contain 방식)
- **PNG 내보내기**: 786×280px 규격의 로고 이미지 생성

## 📐 Output Specification

- **크기**: 786 × 280 pixels
- **배경**: Pure White (#FFFFFF)
- **포맷**: PNG
- **파일명**: `[원본파일명]_logo.png`

## 🚀 Usage

### Local Development

```bash
# Python 서버로 실행
python3 -m http.server 8080

# 또는 Node.js serve 패키지 사용
npx serve .
```

`http://localhost:8080` 에서 확인

### 사용 방법

1. 로고 파일을 드래그하여 업로드 영역에 드롭
2. 프리뷰 캔버스에서 결과 확인
3. "저장하기" 버튼 클릭하여 PNG 다운로드

## ⚠️ AI File Support

AI 파일은 **PDF 호환 모드**로 저장되어야 합니다.

Adobe Illustrator에서:
1. File → Save As
2. "Create PDF Compatible File" 옵션 체크
3. 저장

## 🛠 Tech Stack

- HTML5 Canvas API
- Vanilla JavaScript
- CSS3 (Flexbox)
- PDF.js (AI/PDF 렌더링)

## 📁 Project Structure

```
carehe-logoGeneration/
├── index.html    # Main HTML
├── styles.css    # Styling
├── app.js        # Application logic
└── README.md     # Documentation
```

## License

MIT License
