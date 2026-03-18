import { formatTime } from '../utils/helpers';

export default function MessageBubble({ 
  message, 
  isSent, 
  selectionMode, 
  isSelected, 
  onSelect,
  onDelete 
}) {
  const handleClick = () => {
    if (selectionMode && isSent) {
      onSelect?.(message._id);
    }
  };

  const handleLongPress = (e) => {
    if (isSent && !selectionMode) {
      e.preventDefault();
      onDelete?.(message._id);
    }
  };

  return (
    <div 
      className={`msg-row ${isSent ? 'sent' : 'received'} ${selectionMode && isSent ? 'selectable' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onContextMenu={handleLongPress}
    >
      {/* Selection checkbox for sent messages in selection mode */}
      {selectionMode && isSent && (
        <div className="msg-checkbox">
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={() => onSelect?.(message._id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      <div className={`bubble ${isSent ? 'sent' : 'received'}`}>
        <div>{message.message}</div>
        <div className="bubble-time">
          {formatTime(message.timestamp)}
          {isSent && (
            <span className="check-icon">
              {message.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
      
      {/* Quick delete button for sent messages (not in selection mode) */}
      {isSent && !selectionMode && (
        <button 
          className="msg-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(message._id);
          }}
          title="Delete message"
        >
          🗑️
        </button>
      )}
    </div>
  );
}
