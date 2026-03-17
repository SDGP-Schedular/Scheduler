import { useState } from 'react';
import Sidebar from '../common/Sidebar';
import { useLanguage } from '../../i18n/LanguageContext';
import './AIAssistant.css';

const AIAssistant = () => {
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useLanguage();

    return (
        <div className="ai-assistant-container">
            {/* Sidebar Navigation */}
            <Sidebar activeNav="ai" />

            {/* Main Content - Full Screen Iframe */}
            <main className="ai-main">
                {/* Loading Overlay */}
                {isLoading && (
                    <div className="ai-loading-overlay">
                        <div className="ai-loading-spinner"></div>
                        <p>{t('common_loading')}</p>
                    </div>
                )}

                {/* Full Screen Iframe */}
                <iframe
                    id="ai-chatbot-iframe"
                    src="https://kabileshviru-edu-b-chatbot.hf.space"
                    title="AI Assistant Chatbot"
                    className="ai-fullscreen-iframe"
                    onLoad={() => setIsLoading(false)}
                    allow="microphone"
                />
            </main>
        </div>
    );
};

export default AIAssistant;
