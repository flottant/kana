import React, { useState, useEffect } from 'react';
import * as wanakana from 'wanakana';
import * as kuromoji from 'kuromoji';
import './App.css';

function App() {
  // State management
  const [inputText, setInputText] = useState('');
  const [processedText, setProcessedText] = useState([]);
  const [fontSize, setFontSize] = useState(32);
  const [analyzer, setAnalyzer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cachedTranslations, setCachedTranslations] = useState({});
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // 添加这个新状态
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize Japanese text analyzer
  useEffect(() => {
    const builder = kuromoji.builder({
      dicPath: '/dict/'
    });

    builder.build((err, builtAnalyzer) => {
      if (err) {
        console.error('Failed to initialize kuromoji:', err);
        return;
      }
      setAnalyzer(builtAnalyzer);
      setLoading(false);
    });
  }, []);

  // Translate katakana to English
  const translateKatakana = async (phrases) => {
    // Check cache for existing translations
    const newPhrases = phrases.filter(phrase => !cachedTranslations[phrase]);
    if (newPhrases.length === 0) return;

    try {
      // Use Google Translate API
      const joinedText = newPhrases.join('\n');
      const url = `https://translate.googleapis.com/translate_a/single?sl=ja&tl=en&dt=t&client=gtx&q=${encodeURIComponent(joinedText)}`;

      const response = await fetch(url);
      const data = await response.json();

      // Update cache with new translations
      const newTranslations = { ...cachedTranslations };
      data[0].forEach(item => {
        const original = item[1].trim();
        const translated = item[0].trim();
        newTranslations[original] = translated;
      });

      setCachedTranslations(newTranslations);
      // Re-process text to update translations
      setProcessedText(processText(inputText));
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

  // Process text and add furigana
  const processText = (text) => {
    if (!analyzer || !text) return [];

    const tokens = analyzer.tokenize(text);
    const katakanaPhrases = [];
  
    // Define part-of-speech to color mapping
    const posColorMap = {
      '名詞': '#1a5fb4',    // Noun - 深蓝色
      '動詞': '#c02f1d',    // Verb - 深红色
      '形容詞': '#277d17',  // Adjective - 深绿色
      '副詞': '#6b2c91',    // Adverb - 深紫色
      '助詞': '#666666',    // Particle - 中灰色
      '助動詞': '#e07c17',   // Auxiliary verb - 深橙色
      '連体詞': '#0aa3a3',   // Adnominal adjective - 青色
      '感動詞': '#e671b8',   // Interjection - 粉红色
      '接続詞': '#8b4513',   // Conjunction - 棕色
      '記号': '#000000'      // Symbol - 黑色
    };
  
    const processed = tokens.map(token => {
      // 添加调试信息，查看token结构
      console.log('Token structure:', token);
  
      // 修正：直接使用pos属性获取词性
      const pos = token.pos || 'その他';
      const color = posColorMap[pos] || '#000000';
  
      // 添加调试信息，确认词性和颜色
      console.log(`Token: ${token.surface_form}, POS: ${pos}, Color: ${color}`);
  
      // Add furigana to kanji characters
      if (token.reading && token.surface_form !== token.reading && wanakana.isKanji(token.surface_form[0])) {
        return {
          type: 'kanji',
          text: token.surface_form,
          reading: wanakana.toHiragana(token.reading),
          pos: pos,
          color: color
        };
      }
      // Add English translation to katakana
      else if (wanakana.isKatakana(token.surface_form)) {
        katakanaPhrases.push(token.surface_form);
        return {
          type: 'katakana',
          text: token.surface_form,
          english: cachedTranslations[token.surface_form] || '',
          pos: pos,
          color: color
        };
      }
      // Regular text with part-of-speech coloring
      else {
        return {
          type: 'text',
          text: token.surface_form,
          pos: pos,
          color: color
        };
      }
    });

    // Translate katakana phrases if any
    if (katakanaPhrases.length > 0) {
      translateKatakana(katakanaPhrases);
    }

    return processed;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    setProcessedText(processText(text));
  };

  // 添加这个新的处理函数
  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
    setProcessedText(processText(inputText));
  };

  // Toggle full screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Render text items with appropriate formatting
  const renderTextItem = (item, index) => {
  // 添加调试信息，确认渲染时的颜色值
  console.log(`Rendering item: ${item.text}, Color: ${item.color}`);

  // 决定是否添加空格
  // 不添加空格的情况：当前词是动词、助动词，或者下一个词是助动词、助词
  let addSpace = true;
  if (index < processedText.length - 1) {
    const currentPos = item.pos;
    const nextItem = processedText[index + 1];
    const nextPos = nextItem.pos;

    // 动词后接助动词或助词时不加空格
    if (currentPos === '動詞' && (nextPos === '助動詞' || nextPos === '助詞')) {
      addSpace = false;
    }
    // 助动词后接助词时不加空格
    else if (currentPos === '助動詞' && nextPos === '助詞') {
      addSpace = false;
    }
    // 名词后直接接动词时不加空格
    else if (currentPos === '名詞' && nextPos === '動詞') {
      addSpace = false;
    }
  }

  const space = addSpace ? ' ' : '';

  // 创建一个唯一的类名，基于颜色值
  const colorClass = `text-color-${item.color.replace('#', '')}`;

  switch (item.type) {
    case 'kanji':
      return (
        <span key={index} style={{ marginRight: '4px' }}>
          <ruby className={`kanji-ruby ${colorClass}`} style={{ color: item.color }}>
            <span style={{ color: item.color }}>{item.text}</span>
            <rt style={{ color: item.color }}>{item.reading}</rt>
          </ruby>
          {space}
        </span>
      );
    case 'katakana':
      return (
        <span key={index} style={{ marginRight: '4px' }}>
          <ruby className={`katakana ${colorClass}`} style={{ color: item.color }}>
            <span style={{ color: item.color }}>{item.text}</span>
            <rt className="katakana-english" style={{ color: item.color }}>{item.english || '...'}</rt>
          </ruby>
          {space}
        </span>
      );
    default: // text
      return (
        <span key={index} className={colorClass} style={{ color: item.color, marginRight: '4px' }}>
          {item.text}{space}
        </span>
      );
  }
};

  return (
    <div className="App">
      <div className="header">
        <h1>Kanji Helper</h1>
        <div className="floating-legend">
          <span style={{ color: '#1a5fb4' }}>名詞</span>
          <span style={{ color: '#c02f1d' }}>動詞</span>
          <span style={{ color: '#277d17' }}>形容詞</span>
          <span style={{ color: '#6b2c91' }}>副詞</span>
          <span style={{ color: '#666666' }}>助詞</span>
          <span style={{ color: '#e07c17' }}>助動詞</span>
          <span style={{ color: '#0aa3a3' }}>連体詞</span>
          <span style={{ color: '#e671b8' }}>感動詞</span>
          <span style={{ color: '#8b4513' }}>接続詞</span>
        </div>
        <div className="font-control">
          <label>font size: {fontSize}px</label>
          <input
            type="range"
            min="12"
            max="128"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="font-slider"
          />
        </div>
      </div>

      <div className="editor-container">
        <div className={`editor-section ${isFullScreen ? 'hidden' : ''}`}>
          <div className="editor-header">
            <h2>Input Area</h2>
            <div className="button-group">
              <button
                onClick={handleRefresh}
                className="refresh-button"
              >
                Display
              </button>
              <button
                onClick={() => setInputText('')}
                className="clear-button"
              >
                Clear
              </button>
            </div>
          </div>
          <textarea
            key={refreshKey}
            value={inputText}
            onChange={handleInputChange}
            placeholder="Input here"
            style={{ fontSize: `${fontSize}px` }}
            className="input-textarea"
          />
        </div>

        <div className={`preview-section ${isFullScreen ? 'full-width' : ''}`}>
          <div className="preview-header">
            <h2>Preview</h2>
            <button
              onClick={toggleFullScreen}
              className="fullscreen-button"
            >
              {isFullScreen ? 'Show Edit Area' : 'Hide Edit Area'}
            </button>
          </div>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <div className="preview-content" style={{ fontSize: `${fontSize}px` }}>
              {processedText.map((item, index) => (
                <span key={index} className="text-item">
                  {renderTextItem(item, index)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;