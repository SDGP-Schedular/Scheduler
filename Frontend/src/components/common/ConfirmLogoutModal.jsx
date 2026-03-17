import './ConfirmLogoutModal.css';

const ConfirmLogoutModal = ({ isOpen, onCancel, onConfirm, t }) => {
    if (!isOpen) return null;

    return (
        <div className="logout-confirm-overlay" onClick={onCancel}>
            <div className="logout-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="logout-confirm-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </div>
                <h3>{t('logout_confirm_title')}</h3>
                <p>{t('logout_confirm_message')}</p>

                <div className="logout-confirm-actions">
                    <button className="logout-cancel-btn" onClick={onCancel}>
                        {t('logout_confirm_cancel')}
                    </button>
                    <button className="logout-confirm-btn" onClick={onConfirm}>
                        {t('logout_confirm_confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmLogoutModal;
